import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import { provisionWorktree, cleanupWorktree } from "./utils/worktree-provisioner.js";
import { MergeOrchestrator } from "./merge/orchestrator.js";

const plugin = definePlugin({
  async setup(ctx) {
    ctx.events.on("issue.updated", async (event) => {
      const issueId = event.entityId;
      if (!issueId) return;

      const companyId = event.companyId;
      const payload = event.payload as any;

      // When an agent takes an issue, provision a worktree
      if (payload?.changes?.status?.to === "in_progress") {
          ctx.logger.info("Task started - provisioning worktree", { issueId });
          // In a real implementation we would determine the exact path of the
          // project repository that this issue belongs to.
          // For now, we stub this out assuming a single repo context
          const projectPath = process.env.PAPERCLIP_PROJECT_ROOT || process.cwd();

          try {
             provisionWorktree(projectPath, issueId);
             ctx.logger.info("Successfully provisioned isolated worktree", { issueId });
          } catch (e) {
             ctx.logger.error("Failed to provision worktree", { issueId, error: String(e) });
          }
      }

      // When an agent finishes an issue, run semantic merge and cleanup
      if (payload?.changes?.status?.to === "done") {
          ctx.logger.info("Task completed - running semantic merge", { issueId });
          const projectPath = process.env.PAPERCLIP_PROJECT_ROOT || process.cwd();

          try {
             // 1. Run the merge orchestrator
             const orchestrator = new MergeOrchestrator({ projectDir: projectPath });
             const report = await orchestrator.mergeTask(issueId);

             ctx.logger.info("Merge complete", { stats: report.stats });

             // 2. If review is needed, create a governance ticket
             if (report.stats.filesNeedReview > 0 || report.stats.filesFailed > 0) {
                 ctx.logger.warn("Conflicts detected requiring review", { issueId });
                 await ctx.issues.create({
                     companyId,
                     title: `Review Merge Conflicts for Issue ${issueId}`,
                     description: `The Aperant Workspace plugin detected conflicts during automatic semantic merge for issue ${issueId}.\nPlease review the changes in the target branch manually.`,
                 });
             }

             // 3. Cleanup worktree
             cleanupWorktree(projectPath, issueId);
             ctx.logger.info("Successfully cleaned up isolated worktree", { issueId });

          } catch (e) {
             ctx.logger.error("Failed to merge or cleanup worktree", { issueId, error: String(e) });
          }
      }
    });

    ctx.data.register("health", async () => {
      return { status: "ok", checkedAt: new Date().toISOString() };
    });

    ctx.actions.register("ping", async () => {
      ctx.logger.info("Ping action invoked");
      return { pong: true, at: new Date().toISOString() };
    });
  },

  async onHealth() {
    return { status: "ok", message: "Plugin worker is running" };
  }
});

export default plugin;
runWorker(plugin, import.meta.url);
