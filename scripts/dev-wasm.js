/**
 * Start Next.js with SWC WASM fallback.
 * Native @next/swc-win32-x64-msvc crashes on some Windows hosts
 * (exit 0xC000001D / STATUS_ILLEGAL_INSTRUCTION).
 */
process.env.NEXT_TEST_WASM = "1";
process.env.NEXT_DISABLE_SWC_WASM = "";
process.env.WS_NO_BUFFER_UTIL = "1";
process.env.WS_NO_UTF_8_VALIDATE = "1";

const { spawn } = require("child_process");
const child = spawn(
  process.execPath,
  [
    require.resolve("next/dist/bin/next"),
    "dev",
    "--webpack",
    ...process.argv.slice(2).filter((a) => a !== "--"),
  ],
  { stdio: "inherit", env: process.env, shell: false }
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
