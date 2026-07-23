/**
 * Production build using SWC WASM (avoids native SWC crash on some Windows hosts).
 */
process.env.NEXT_TEST_WASM = "1";

const { spawnSync } = require("child_process");
const r = spawnSync(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "build", "--webpack"],
  { stdio: "inherit", env: process.env, shell: false }
);
process.exit(r.status ?? 1);
