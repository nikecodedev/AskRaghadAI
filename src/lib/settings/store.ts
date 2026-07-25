import { prisma } from "@/lib/db/prisma";
import { DEFAULT_SUPPORT_EMAIL, SETTING_KEYS } from "@/lib/settings/constants";

export { DEFAULT_SUPPORT_EMAIL, SETTING_KEYS };
export type { SettingKey } from "@/lib/settings/constants";

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
