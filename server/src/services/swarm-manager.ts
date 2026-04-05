/**
 * [DATA_BUS] : Source: Claude Code Swarm/Coordinator patterns, Paperclip Workspace Runtime.
 * [LOGIC_REPORT] : SwarmManager handles the creation of transient worker agents 
 * isolated in Git worktrees for safe, parallel execution.
 */

import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { logger } from "../middleware/logger.js";

const execFile = promisify(execFileCallback);

export interface SwarmWorkerConfig {
  parentId: string;
  role: string;
  objective: string;
  baseCwd: string;
  model?: string;
}

export interface SwarmWorkerResult {
  workerId: string;
  worktreePath: string;
  branchName: string;
}

class SwarmManagerImpl {
  /**
   * Spawns a new worker in a dedicated Git worktree.
   * [SOURCE: KERNEL Couche H - HIGH_VELOCITY]
   */
  async spawnWorker(config: SwarmWorkerConfig): Promise<SwarmWorkerResult> {
    // ⚡ Auto-healing: Clean up any orphaned worktrees in this repo before spawning
    await this.reapOrphanedWorktrees(config.baseCwd);

    const workerId = `worker-${randomBytes(4).toString("hex")}`;
    const branchName = `pcp-swarm-${workerId}`;
    const worktreePath = path.join(config.baseCwd, ".paperclip", "swarm", workerId);

    logger.info(`[swarm-manager] Spawning worker ${workerId} in worktree ${worktreePath}`);

    try {
      // Ensure the swarm directory exists
      await fs.mkdir(path.dirname(worktreePath), { recursive: true });

      // Create git worktree: git worktree add -b <branch> <path> <base-ref>
      // We assume the baseCwd is a git repository.
      await execFile("git", ["worktree", "add", "-b", branchName, worktreePath, "HEAD"], {
        cwd: config.baseCwd,
      });

      logger.debug(`[swarm-manager] Git worktree created for ${workerId}`);

      return {
        workerId,
        worktreePath,
        branchName,
      };
    } catch (error) {
      logger.error({ err: error }, `[swarm-manager] Failed to spawn worker ${workerId}`);
      throw new Error(`Failed to create isolated worker environment: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Cleans up a worker's worktree and branch.
   */
  async cleanupWorker(worktreePath: string, branchName: string, baseCwd: string): Promise<void> {
    logger.info(`[swarm-manager] Cleaning up worktree at ${worktreePath}`);

    try {
      // 1. Remove worktree
      await execFile("git", ["worktree", "remove", "--force", worktreePath], {
        cwd: baseCwd,
      });

      // 2. Delete branch
      await execFile("git", ["branch", "-D", branchName], {
        cwd: baseCwd,
      });

      // 3. Remove directory if empty
      await fs.rm(worktreePath, { recursive: true, force: true }).catch(() => {});
      
      logger.debug(`[swarm-manager] Cleanup complete for ${branchName}`);
    } catch (error) {
      logger.warn({ err: error }, `[swarm-manager] Cleanup failed for ${worktreePath}`);
    }
  }

  /**
   * Cleans up all orphaned worktrees in a given base directory.
   * [SOURCE: KERNEL Couche S - SHADOW_FIXES]
   */
  async reapOrphanedWorktrees(baseCwd: string): Promise<void> {
    const swarmDir = path.join(baseCwd, ".paperclip", "swarm");
    try {
      const entries = await fs.readdir(swarmDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith("worker-")) {
          const worktreePath = path.join(swarmDir, entry.name);
          const branchName = `pcp-swarm-${entry.name}`;
          logger.info(`[swarm-manager] Reaping orphaned worktree: ${entry.name}`);
          await this.cleanupWorker(worktreePath, branchName, baseCwd);
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        logger.warn({ err: error }, `[swarm-manager] Failed to read swarm directory at ${swarmDir}`);
      }
    }
  }
}

export const swarmManager = new SwarmManagerImpl();
