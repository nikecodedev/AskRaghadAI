// Pure constants only — no server-only imports (Prisma etc.) here.
// Client components need these without pulling in database code into
// their browser bundle. See lib/settings/store.ts for the server-side
// functions that actually query the database.

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
  "vision.leadTitle.en",
  "vision.leadTitle.ar",
  "vision.leadBody.en",
  "vision.leadBody.ar",
  "vision.futureTitle.en",
  "vision.futureTitle.ar",
  "vision.futureBody.en",
  "vision.futureBody.ar",
  "vision.promiseTitle.en",
  "vision.promiseTitle.ar",
  "vision.promiseBody.en",
  "vision.promiseBody.ar",
  "contact.subtitle.en",
  "contact.subtitle.ar",
  "support.email",
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];
