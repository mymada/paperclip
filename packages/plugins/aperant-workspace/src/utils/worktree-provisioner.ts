import { spawnPromise } from './spawn-promise.js';
import { getTaskWorktreeDir, getTaskWorktreePath } from './worktree-paths.js';
import { getIsolatedGitSpawnOptions } from './git-isolation.js';
import fs from 'fs';

export async function provisionWorktree(projectPath: string, issueId: string): Promise<string> {
  const worktreeDir = getTaskWorktreeDir(projectPath);
  const worktreePath = getTaskWorktreePath(projectPath, issueId);
  const branchName = `paperclip/${issueId}`;

  // Ensure base dir exists
  if (!fs.existsSync(worktreeDir)) {
    fs.mkdirSync(worktreeDir, { recursive: true });
  }

  // Create git worktree
  try {
    await spawnPromise('git', ['worktree', 'add', '-b', branchName, worktreePath], getIsolatedGitSpawnOptions(projectPath));
  } catch (e) {
    console.error(`Failed to provision worktree for issue ${issueId}`, e);
    // Try to just add without -b in case branch already exists
    try {
        await spawnPromise('git', ['worktree', 'add', worktreePath, branchName], getIsolatedGitSpawnOptions(projectPath));
    } catch (e2) {
       console.error(`Failed fallback provisioning for issue ${issueId}`, e2);
       throw e;
    }
  }

  return worktreePath;
}

export async function cleanupWorktree(projectPath: string, issueId: string): Promise<void> {
  const worktreePath = getTaskWorktreePath(projectPath, issueId);
  const branchName = `paperclip/${issueId}`;

  if (!fs.existsSync(worktreePath)) {
    return;
  }

  try {
    // Remove worktree
    await spawnPromise('git', ['worktree', 'remove', '-f', worktreePath], getIsolatedGitSpawnOptions(projectPath));
    // Prune worktrees
    await spawnPromise('git', ['worktree', 'prune'], getIsolatedGitSpawnOptions(projectPath));
    // Delete branch
    await spawnPromise('git', ['branch', '-D', branchName], getIsolatedGitSpawnOptions(projectPath));
  } catch (e) {
    console.error(`Failed to cleanup worktree for issue ${issueId}`, e);
  }
}
