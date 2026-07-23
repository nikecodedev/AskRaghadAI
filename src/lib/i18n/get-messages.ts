import type { Locale, Messages } from "./types";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";

// Statically bundled so messages are always available on the client.
// (A previous dynamic import() could fail to load its chunk in production,
//  leaving the whole app stuck on the loading spinner.)
const MESSAGES: Record<Locale, Messages> = {
  en: en as Messages,
  ar: ar as Messages,
};

export function getMessagesSync(locale: Locale): Messages {
  return MESSAGES[locale] ?? MESSAGES.en;
}

export async function getMessages(locale: Locale): Promise<Messages> {
  return getMessagesSync(locale);
}
