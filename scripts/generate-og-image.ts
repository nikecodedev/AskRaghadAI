import sharp from "sharp";
import path from "path";
import { readFileSync } from "fs";

/**
 * Builds the 1200x630 social preview image used when the site is shared on
 * WhatsApp, X, LinkedIn etc.
 *
 * Generated as a static file rather than at request time: runtime generation
 * (next/og) needs to run on every crawl, and social crawlers are impatient
 * and often unauthenticated, so a plain PNG in /public is the dependable
 * option on this host. Re-run with `npm run og:generate` if the branding
 * changes.
 */

const WIDTH = 1200;
const HEIGHT = 630;

// Brand palette, matching globals.css
const CREAM = "#f3ece0";
const GREEN_DARK = "#1f5240";
const GOLD = "#c9a962";
const MUTED = "#5f6d63";

async function main() {
  const publicDir = path.join(process.cwd(), "public");
  const logoPath = path.join(publicDir, "brand", "logo-full.png");

  // Scale the logo to sit comfortably in the upper half.
  const logo = await sharp(readFileSync(logoPath))
    .resize({ height: 240, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  const logoMeta = await sharp(logo).metadata();
  const logoWidth = logoMeta.width ?? 240;

  const textSvg = `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .name { font-family: Georgia, 'Times New Roman', serif; font-size: 62px; font-weight: 700; fill: ${GREEN_DARK}; }
        .tag  { font-family: Georgia, 'Times New Roman', serif; font-size: 30px; fill: ${MUTED}; }
        .dom  { font-family: Georgia, 'Times New Roman', serif; font-size: 26px; fill: ${GOLD}; letter-spacing: 2px; }
      </style>
      <text x="50%" y="430" text-anchor="middle" class="name">Raghad AI</text>
      <text x="50%" y="486" text-anchor="middle" class="tag">Your intelligent luxury lifestyle assistant</text>
      <text x="50%" y="556" text-anchor="middle" class="dom">ASKRAGHADAI.COM</text>
    </svg>`;

  await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: CREAM,
    },
  })
    .composite([
      // Soft gold rule under the logo area for a bit of structure.
      {
        input: Buffer.from(
          `<svg width="${WIDTH}" height="${HEIGHT}"><rect x="450" y="360" width="300" height="3" rx="1.5" fill="${GOLD}" opacity="0.55"/></svg>`,
        ),
        top: 0,
        left: 0,
      },
      { input: logo, top: 90, left: Math.round((WIDTH - logoWidth) / 2) },
      { input: Buffer.from(textSvg), top: 0, left: 0 },
    ])
    .png()
    .toFile(path.join(publicDir, "og-image.png"));

  const out = await sharp(path.join(publicDir, "og-image.png")).metadata();
  console.log(`Wrote public/og-image.png — ${out.width}x${out.height}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
