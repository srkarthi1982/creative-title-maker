import { defineAction, ActionError, type ActionAPIContext } from "astro:actions";
import { z } from "astro:schema";
import { TitleIdeas, TitleSessions, and, db, eq } from "astro:db";

function requireUser(context: ActionAPIContext) {
  const locals = context.locals as App.Locals | undefined;
  const user = locals?.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return user;
}

async function getOwnedSession(sessionId: string, userId: string) {
  const [session] = await db
    .select()
    .from(TitleSessions)
    .where(and(eq(TitleSessions.id, sessionId), eq(TitleSessions.userId, userId)));

  if (!session) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "Title session not found.",
    });
  }

  return session;
}

export const server = {
  createTitleSession: defineAction({
    input: z.object({
      contentType: z.string().optional(),
      workingTitle: z.string().optional(),
      topic: z.string().optional(),
      targetAudience: z.string().optional(),
      language: z.string().optional(),
      notes: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const now = new Date();

      const [session] = await db
        .insert(TitleSessions)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          contentType: input.contentType,
          workingTitle: input.workingTitle,
          topic: input.topic,
          targetAudience: input.targetAudience,
          language: input.language,
          notes: input.notes,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return { success: true, data: { session } };
    },
  }),

  updateTitleSession: defineAction({
    input: z
      .object({
        id: z.string().min(1),
        contentType: z.string().optional(),
        workingTitle: z.string().optional(),
        topic: z.string().optional(),
        targetAudience: z.string().optional(),
        language: z.string().optional(),
        notes: z.string().optional(),
      })
      .refine(
        (input) =>
          input.contentType !== undefined ||
          input.workingTitle !== undefined ||
          input.topic !== undefined ||
          input.targetAudience !== undefined ||
          input.language !== undefined ||
          input.notes !== undefined,
        { message: "At least one field must be provided to update." }
      ),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedSession(input.id, user.id);

      const [session] = await db
        .update(TitleSessions)
        .set({
          ...(input.contentType !== undefined ? { contentType: input.contentType } : {}),
          ...(input.workingTitle !== undefined ? { workingTitle: input.workingTitle } : {}),
          ...(input.topic !== undefined ? { topic: input.topic } : {}),
          ...(input.targetAudience !== undefined
            ? { targetAudience: input.targetAudience }
            : {}),
          ...(input.language !== undefined ? { language: input.language } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          updatedAt: new Date(),
        })
        .where(eq(TitleSessions.id, input.id))
        .returning();

      return { success: true, data: { session } };
    },
  }),

  listTitleSessions: defineAction({
    input: z.object({}).optional(),
    handler: async (_input, context) => {
      const user = requireUser(context);

      const sessions = await db
        .select()
        .from(TitleSessions)
        .where(eq(TitleSessions.userId, user.id));

      return { success: true, data: { items: sessions, total: sessions.length } };
    },
  }),

  createTitleIdea: defineAction({
    input: z.object({
      sessionId: z.string().min(1),
      titleText: z.string().min(1),
      tone: z.string().optional(),
      style: z.string().optional(),
      isFavorite: z.boolean().optional(),
      isSelected: z.boolean().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedSession(input.sessionId, user.id);

      const [idea] = await db
        .insert(TitleIdeas)
        .values({
          id: crypto.randomUUID(),
          sessionId: input.sessionId,
          titleText: input.titleText,
          tone: input.tone,
          style: input.style,
          isFavorite: input.isFavorite ?? false,
          isSelected: input.isSelected ?? false,
          createdAt: new Date(),
        })
        .returning();

      return { success: true, data: { idea } };
    },
  }),

  updateTitleIdea: defineAction({
    input: z
      .object({
        id: z.string().min(1),
        sessionId: z.string().min(1),
        titleText: z.string().optional(),
        tone: z.string().optional(),
        style: z.string().optional(),
        isFavorite: z.boolean().optional(),
        isSelected: z.boolean().optional(),
      })
      .refine(
        (input) =>
          input.titleText !== undefined ||
          input.tone !== undefined ||
          input.style !== undefined ||
          input.isFavorite !== undefined ||
          input.isSelected !== undefined,
        { message: "At least one field must be provided to update." }
      ),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedSession(input.sessionId, user.id);

      const [existing] = await db
        .select()
        .from(TitleIdeas)
        .where(and(eq(TitleIdeas.id, input.id), eq(TitleIdeas.sessionId, input.sessionId)));

      if (!existing) {
        throw new ActionError({ code: "NOT_FOUND", message: "Title idea not found." });
      }

      const [idea] = await db
        .update(TitleIdeas)
        .set({
          ...(input.titleText !== undefined ? { titleText: input.titleText } : {}),
          ...(input.tone !== undefined ? { tone: input.tone } : {}),
          ...(input.style !== undefined ? { style: input.style } : {}),
          ...(input.isFavorite !== undefined ? { isFavorite: input.isFavorite } : {}),
          ...(input.isSelected !== undefined ? { isSelected: input.isSelected } : {}),
        })
        .where(eq(TitleIdeas.id, input.id))
        .returning();

      return { success: true, data: { idea } };
    },
  }),

  deleteTitleIdea: defineAction({
    input: z.object({
      id: z.string().min(1),
      sessionId: z.string().min(1),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedSession(input.sessionId, user.id);

      const result = await db
        .delete(TitleIdeas)
        .where(and(eq(TitleIdeas.id, input.id), eq(TitleIdeas.sessionId, input.sessionId)));

      if (result.rowsAffected === 0) {
        throw new ActionError({ code: "NOT_FOUND", message: "Title idea not found." });
      }

      return { success: true };
    },
  }),

  listTitleIdeas: defineAction({
    input: z.object({
      sessionId: z.string().min(1),
      favoritesOnly: z.boolean().default(false),
      selectedOnly: z.boolean().default(false),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedSession(input.sessionId, user.id);

      const filters = [eq(TitleIdeas.sessionId, input.sessionId)];
      if (input.favoritesOnly) {
        filters.push(eq(TitleIdeas.isFavorite, true));
      }
      if (input.selectedOnly) {
        filters.push(eq(TitleIdeas.isSelected, true));
      }

      const ideas = await db.select().from(TitleIdeas).where(and(...filters));

      return { success: true, data: { items: ideas, total: ideas.length } };
    },
  }),
};
