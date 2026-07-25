import { google } from "googleapis";

function loadCredentials() {
  // Preferred: two short env vars (more reliable to paste into hosting panels
  // than one ~2800-char blob, which silently failed to save on Hostinger).
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (clientEmail && privateKey) {
    return { client_email: clientEmail, private_key: privateKey.replace(/\\n/g, "\n") };
  }

  // Fallback: single JSON blob (raw or base64-encoded), kept for local dev / .env use.
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      "Google Sheets credentials are not set (need GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY, or GOOGLE_SERVICE_ACCOUNT_JSON)",
    );
  }
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
// M2 layout — A-N are the client's data, O is written by our sync to link
// each sheet row back to its database record:
// A Category | B Subcategory | C Item_Name | D Description | E Price |
// F Currency | G Image_URL | H Affiliate_Link | I Discount_Code | J Active |
// K Target_Country | L Keywords_Tags | M Bundle_ID | N Item_Role | O DB_ID
export const PRODUCT_SHEET_RANGE = `${PRODUCT_SHEET_TAB}!A2:O1000`;
export const PRODUCT_SHEET_HEADER_RANGE = `${PRODUCT_SHEET_TAB}!A1:O1`;
