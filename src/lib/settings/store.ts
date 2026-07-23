import { prisma } from "@/lib/db/prisma";

export const DEFAULT_SUPPORT_EMAIL = "info@askraghadai.com";

// The fixed set of admin-editable content keys. Locale-specific values use
// ".en"/".ar" suffixes; support.email has no locale.
export const SETTING_KEYS = [
  "hero.title.en",
  "hero.title.ar",
  "hero.subtitle.en",
  "hero.subtitle.ar",
  "about.subtitle.en",
  "about.subtitle.ar",
  "about.introBody.en",
  "about.introBody.ar",
  "about.missionBody.en",
  "about.missionBody.ar",
  "vision.subtitle.en",
  "vision.subtitle.ar",
  "vision.leadBody.en",
  "vision.leadBody.ar",
  "contact.subtitle.en",
  "contact.subtitle.ar",
  "support.email",
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await prisma.siteSetting.findMany();
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;
  return map;
}

export async function getSupportEmail(): Promise<string> {
  const row = await prisma.siteSetting.findUnique({ where: { key: "support.email" } });
  return row?.value?.trim() || DEFAULT_SUPPORT_EMAIL;
}

export async function setSettings(values: Record<string, string>): Promise<void> {
  const entries = Object.entries(values).filter(([key]) =>
    (SETTING_KEYS as readonly string[]).includes(key),
  );
  await Promise.all(
    entries.map(([key, value]) =>
      prisma.siteSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      }),
    ),
  );
}
