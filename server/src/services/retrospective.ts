import { and, desc, eq, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { heartbeatRuns, issues, companyLessons } from "@paperclipai/db";
import { getRunLogStore } from "./run-log-store.js";
import { callLlm } from "./llm-client.js";
import { companyLessonService } from "./company-lessons.js";
import { logger } from "../middleware/logger.js";

export function retrospectiveService(db: Db) {
  const lessonSvc = companyLessonService(db);
  const logStore = getRunLogStore();

  return {
    analyzeIssueFailures: async (issueId: string) => {
      const issue = await db
        .select()
        .from(issues)
        .where(eq(issues.id, issueId))
        .then((rows) => rows[0] ?? null);
      if (!issue) return;

      const failedRuns = await db
        .select()
        .from(heartbeatRuns)
        .where(
          and(
            eq(heartbeatRuns.companyId, issue.companyId),
            sql`${heartbeatRuns.contextSnapshot} ->> 'issueId' = ${issueId}`,
            eq(heartbeatRuns.status, "failed")
          )
        )
        .orderBy(desc(heartbeatRuns.createdAt))
        .limit(3);

      if (failedRuns.length < 2) return;

      logger.info({ issueId, failedRunCount: failedRuns.length }, "Retrospective agent: analyzing repeated failures");

      // Fetch logs for the failed runs
      let logsContext = "";
      for (const run of failedRuns) {
        try {
          const logHandle = { store: "local_file" as const, logRef: `${run.companyId}/${run.agentId}/${run.id}.ndjson` };
          const logData = await logStore.read(logHandle, { limitBytes: 50000 });
          logsContext += `\n--- RUN ${run.id} ---\n${logData.content}\n`;
        } catch (err) {
          logger.warn({ runId: run.id, err }, "Retrospective agent: failed to read log");
        }
      }

      if (!logsContext) return;

      const prompt = `You are an AI Retrospective Agent. You analyze logs of failed task executions to generate a concise "Antibody" rule to prevent future failures.
Task Title: ${issue.title}
Task Description: ${issue.description}

Logs of failed attempts:
${logsContext}

Generate a concise, actionable rule (one sentence) that would have prevented these failures. 
The rule should be specific to the technical or procedural mistake found in the logs.
Example: "Always check if the directory exists before writing a file." or "Don't use unauthenticated JWT tokens."

Rule:`;

      try {
        const rule = await callLlm([
          { role: "system", content: "You are an expert software engineer and company auditor." },
          { role: "user", content: prompt }
        ]);

        if (rule) {
          await lessonSvc.create({
            companyId: issue.companyId,
            issueId: issue.id,
            rule: rule.trim(),
            status: "draft"
          });
          logger.info({ issueId, rule }, "Retrospective agent: generated new rule draft");
        }
      } catch (err) {
        logger.error({ issueId, err }, "Retrospective agent: failed to generate rule");
      }
    }
  };
}
