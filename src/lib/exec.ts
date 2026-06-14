export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function exec(
  cmd: string[],
  opts?: { cwd?: string; env?: Record<string, string> }
): Promise<ExecResult> {
  const proc = Bun.spawn(cmd, {
    cwd: opts?.cwd,
    env: { ...process.env, ...opts?.env },
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  return { exitCode, stdout: stdout.trim(), stderr: stderr.trim() };
}

export async function which(command: string): Promise<string | null> {
  const result = await exec(["which", command]);
  return result.exitCode === 0 ? result.stdout : null;
}
