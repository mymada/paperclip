import { spawn, type SpawnOptions, type ChildProcess } from 'child_process';

export interface SpawnResult {
  stdout: string;
  stderr: string;
  code: number | null;
  signal: NodeJS.Signals | null;
}

/**
 * Robust async wrapper for Node's spawn.
 */
export function spawnPromise(
  command: string,
  args: string[],
  options?: SpawnOptions
): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    // Cast to ChildProcess to avoid overload resolution issues in some environments
    const child = spawn(command, args, options ?? {}) as ChildProcess;
    let stdoutStr = '';
    let stderrStr = '';

    child.stdout?.on('data', (data: Buffer | string) => {
      stdoutStr += data.toString();
    });

    child.stderr?.on('data', (data: Buffer | string) => {
      stderrStr += data.toString();
    });

    child.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
      resolve({ stdout: stdoutStr, stderr: stderrStr, code, signal });
    });

    child.on('error', (err: Error) => {
      reject(err);
    });
  });
}
