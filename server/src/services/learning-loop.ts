import { eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { heartbeatRuns, issues } from "@paperclipai/db";
import { callLlm } from "./llm-client.js";
import { companyLessonService } from "./company-lessons.js";
import { logger } from "../middleware/logger.js";

export function learningLoopService(db: Db) {
  return {
    extractLessonsFromRun: async (runId: string, companyId: string): Promise<void> => {
      try {
        // Fetch the heartbeat run details
        const [run] = await db
          .select()
          .from(heartbeatRuns)
          .where(eq(heartbeatRuns.id, runId));

        if (!run || run.status !== "succeeded") {
          return; // Only extract lessons from successful runs
        }

        // Get issue details if available
        let issueTitle = "General Task";
        let resolvedIssueId: string | null = null;
        if (run.contextSnapshot && typeof run.contextSnapshot === "object") {
          const ctx = run.contextSnapshot as Record<string, unknown>;
          resolvedIssueId = typeof ctx.issueId === "string" ? ctx.issueId : null;
          if (typeof ctx.issue === "object" && ctx.issue !== null) {
            issueTitle = (ctx.issue as any).title ?? issueTitle;
          }
        }
        // If we have issueId but no title from context, try DB
        if (resolvedIssueId && issueTitle === "General Task") {
          const [issueRow] = await db.select({ title: issues.title }).from(issues).where(eq(issues.id, resolvedIssueId));
          if (issueRow) issueTitle = issueRow.title;
        }

        // Build the summary from the run data
        const summary = run.resultJson
          ? JSON.stringify(run.resultJson, null, 2)
          : "No detailed summary available";

        // Prepare the LLM prompt
        const prompt = `You are a Learning Loop agent reviewing a completed AI agent task for Paperclip.

Company ID: ${companyId}
Heartbeat Run ID: ${runId}
Issue Title: ${issueTitle}
Status: ${run.status}
Summary: ${summary}

Your task: Extract up to 2 concise, actionable lessons from this successful task completion.
Focus on:
1. A reusable procedure or approach that worked well (if non-obvious)
2. A key environmental fact, constraint, or preference discovered (if durable)
3. A risk or pitfall that was navigated (if worth remembering)

Output as JSON array: [{"type":"procedure"|"fact"|"antibody","rule":"one sentence, specific and actionable"}]
Output [] if nothing worth preserving was learned.
Only output the JSON array, nothing else.`;

        // Call LLM to extract lessons
        const llmResponse = await callLlm(
          [
            { role: "system", content: "You are an expert AI agent auditor specializing in extracting reusable lessons." },
            { role: "user", content: prompt },
          ],
          { maxTokens: 512 },
        );

        if (!llmResponse || !llmResponse.trim()) {
          logger.debug({ runId }, "No LLM response for learning loop");
          return;
        }

        const content = llmResponse.trim();
        let lessons: Array<{ type: string; rule: string }>;

        try {
          lessons = JSON.parse(content);
        } catch (parseErr) {
          logger.warn({ runId, content }, "Failed to parse LLM response as JSON");
          return;
        }

        if (!Array.isArray(lessons)) {
          logger.warn({ runId, lessons }, "LLM response is not an array");
          return;
        }

        // Filter and save valid lessons
        const validTypes = ["procedure", "fact", "antibody"];
        const lessonService = companyLessonService(db);

        for (const lesson of lessons) {
          if (
            lesson &&
            typeof lesson === "object" &&
            typeof lesson.type === "string" &&
            typeof lesson.rule === "string" &&
            validTypes.includes(lesson.type) &&
            lesson.rule.trim().length > 10 // Only non-trivial content
          ) {
            await lessonService.create({
              companyId,
              issueId: resolvedIssueId,
              type: lesson.type as "procedure" | "fact" | "antibody",
              rule: lesson.rule.trim(),
              status: "draft",
            });

            logger.info({ runId, companyId, lessonType: lesson.type, rule: lesson.rule }, "Learning loop extracted lesson");
          }
        }

      } catch (err) {
        logger.warn({ runId, companyId, err }, "Learning loop failed non-critically");
        // Fire-and-forget: don't throw errors
      }
    },
  };
}