/**
 * Creative Title Maker - generate title ideas for content (blogs, videos, etc.).
 *
 * Design goals:
 * - Organize title ideas by "title sessions" (one piece of content).
 * - Support multiple content types (blog, video, course, etc.).
 * - Keep multiple variants with tone + style metadata.
 */

import { defineTable, column, NOW } from "astro:db";

export const TitleSessions = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),
    contentType: column.text({ optional: true }),  // "blog", "video", "course", etc.
    workingTitle: column.text({ optional: true }), // initial user idea
    topic: column.text({ optional: true }),
    targetAudience: column.text({ optional: true }),
    language: column.text({ optional: true }),
    notes: column.text({ optional: true }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const TitleIdeas = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    sessionId: column.text({
      references: () => TitleSessions.columns.id,
    }),
    titleText: column.text(),
    tone: column.text({ optional: true }),         // "catchy", "serious", "educational", etc.
    style: column.text({ optional: true }),        // "listicle", "how-to", "question", etc.
    isFavorite: column.boolean({ default: false }),
    isSelected: column.boolean({ default: false }),// final chosen title (only one expected)
    createdAt: column.date({ default: NOW }),
  },
});

export const tables = {
  TitleSessions,
  TitleIdeas,
} as const;
