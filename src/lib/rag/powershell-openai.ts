import { execFile } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function chatViaPowerShell(payload: object): Promise<string> {
  const tmpFile = path.join(tmpdir(), `raghad-chat-${Date.now()}.json`);
  writeFileSync(tmpFile, JSON.stringify(payload), "utf8");

  try {
    const scriptPath = path.join(process.cwd(), "scripts", "chat-openai.ps1");
    const { stdout } = await execFileAsync(
      "powershell",
      ["-ExecutionPolicy", "Bypass", "-File", scriptPath, "-PayloadPath", tmpFile],
      { timeout: 95_000, maxBuffer: 2 * 1024 * 1024, encoding: "utf8" }
    );
    return stdout.trim();
  } finally {
    try {
      unlinkSync(tmpFile);
    } catch {
      /* ignore */
    }
  }
}

export function shouldUsePowerShellOpenAI(): boolean {
  return process.platform === "win32" || process.env.RAG_USE_POWERSHELL === "1";
}
