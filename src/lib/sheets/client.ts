import { google } from "googleapis";

function loadCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");
  }
  // Accept either raw JSON or base64-encoded JSON (base64 avoids .env line-break issues).
  const jsonText = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(jsonText);
}

export function getSheetsClient() {
  const credentials = loadCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

export function getSheetId() {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("GOOGLE_SHEET_ID is not set");
  return id;
}

export const PRODUCT_SHEET_TAB = "Product";
// Columns A-J are the client's existing data; column K is written by our sync
// to link each sheet row back to its database record.
export const PRODUCT_SHEET_RANGE = `${PRODUCT_SHEET_TAB}!A2:K1000`;
export const PRODUCT_SHEET_HEADER_RANGE = `${PRODUCT_SHEET_TAB}!A1:K1`;
