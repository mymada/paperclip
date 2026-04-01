import { and, desc, eq, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { companyLessons, heartbeatRuns, issues } from "@paperclipai/db";
import type { CompanyLesson } from "@paperclipai/shared";

export function companyLessonService(db: Db) {
  return {
    list: async (companyId: string, status?: string) => {
      const query = db
        .select()
        .from(companyLessons)
        .where(
          and(
            eq(companyLessons.companyId, companyId),
            status ? eq(companyLessons.status, status) : undefined
          )
        )
        .orderBy(desc(companyLessons.createdAt));
      return query;
    },

    create: async (input: {
      companyId: string;
      issueId?: string | null;
      rule: string;
      status?: "draft" | "active" | "archived";
    }) => {
      const [lesson] = await db
        .insert(companyLessons)
        .values({
          companyId: input.companyId,
          issueId: input.issueId ?? null,
          rule: input.rule,
          status: input.status ?? "draft",
        })
        .returning();
      return lesson;
    },

    update: async (id: string, patch: { rule?: string; status?: "draft" | "active" | "archived" }) => {
      const [updated] = await db
        .update(companyLessons)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(eq(companyLessons.id, id))
        .returning();
      return updated;
    },

    delete: async (id: string) => {
      await db.delete(companyLessons).where(eq(companyLessons.id, id));
    },

    findRelevant: async (companyId: string, text: string, limit = 3) => {
      // Simple text match for now as fallback if pgvector is not fully setup or for simplicity
      // In production with pgvector, we would use semantic search
      return db
        .select()
        .from(companyLessons)
        .where(
          and(
            eq(companyLessons.companyId, companyId),
            eq(companyLessons.status, "active"),
            sql`${companyLessons.rule} ILIKE ${'%' + text + '%'}`
          )
        )
        .limit(limit)
        .orderBy(desc(companyLessons.createdAt));
    }
  };
}
