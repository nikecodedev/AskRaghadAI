import { neon, neonConfig } from "@neondatabase/serverless";
import { getDatabaseUrl } from "@/lib/db/connection-string";

neonConfig.poolQueryViaFetch = true;

let sql: ReturnType<typeof neon> | null = null;
let cachedUrl = "";

export function getNeonSql() {
  const url = getDatabaseUrl();
  if (!sql || cachedUrl !== url) {
    sql = neon(url);
    cachedUrl = url;
  }
  return sql;
}

/** Lightweight connectivity probe used by /api/health. */
export async function pingDatabase(): Promise<{
  ok: boolean;
  latencyMs: number;
  error?: string;
}> {
  const started = Date.now();
  try {
    await getNeonSql()`SELECT 1 AS ok`;
    return { ok: true, latencyMs: Date.now() - started };
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      latencyMs: Date.now() - started,
      error: raw.replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[redacted]").slice(0, 300),
    };
  }
}
