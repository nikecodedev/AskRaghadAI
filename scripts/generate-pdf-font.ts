import { readFileSync, writeFileSync } from "fs";
import path from "path";

const src = path.join(process.cwd(), "public/fonts/NotoSansArabic-Regular.ttf");
const out = path.join(process.cwd(), "src/lib/pdf/noto-sans-arabic-base64.ts");
const b64 = readFileSync(src).toString("base64");
const content =
  "/** Auto-generated from public/fonts/NotoSansArabic-Regular.ttf. Do not edit. */\n" +
  "export const NOTO_SANS_ARABIC_REGULAR_BASE64 =\n" +
  "  \"" +
  b64 +
  "\";\n";
writeFileSync(out, content);
console.log("wrote", out, "bytes", content.length);
