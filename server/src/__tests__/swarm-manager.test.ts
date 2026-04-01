/**
 * [DATA_BUS] : Source: SwarmManager, Vitest.
 * [LOGIC_REPORT] : Tests the SwarmManager lifecycle: spawning a worker in a git worktree 
 * and cleaning it up.
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it, afterAll, beforeAll } from "vitest";
import { swarmManager } from "../services/swarm-manager.js";

const execFile = promisify(execFileCallback);

describe("SwarmManager", () => {
  let repoRoot: string;

  beforeAll(async () => {
    // Create a temp git repo for testing
    repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-swarm-test-"));
    await execFile("git", ["init"], { cwd: repoRoot });
    await execFile("git", ["config", "user.email", "test@example.com"], { cwd: repoRoot });
    await execFile("git", ["config", "user.name", "Test User"], { cwd: repoRoot });
    await fs.writeFile(path.join(repoRoot, "README.md"), "# Test Repo");
    await execFile("git", ["add", "README.md"], { cwd: repoRoot });
    await execFile("git", ["commit", "-m", "initial commit"], { cwd: repoRoot });
  });

  afterAll(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true }).catch(() => {});
  });

  it("should spawn a worker in a git worktree", async () => {
    const result = await swarmManager.spawnWorker({
      parentId: "parent-1",
      role: "worker",
      objective: "test objective",
      baseCwd: repoRoot,
    });

    expect(result.workerId).toBeDefined();
    expect(result.branchName).toContain("pcp-swarm-");
    expect(result.worktreePath).toContain(path.join(".paperclip", "swarm"));

    // Verify worktree exists
    const stats = await fs.stat(result.worktreePath);
    expect(stats.isDirectory()).toBe(true);

    // Verify it's a git repo/worktree
    const gitDir = await fs.stat(path.join(result.worktreePath, ".git"));
    expect(gitDir).toBeDefined();

    // Cleanup
    await swarmManager.cleanupWorker(result.worktreePath, result.branchName, repoRoot);

    // Verify cleanup
    await expect(fs.stat(result.worktreePath)).rejects.toThrow();
  });
});
