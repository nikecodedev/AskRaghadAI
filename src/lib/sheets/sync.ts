import { prisma } from "@/lib/db/prisma";
import {
  getSheetsClient,
  getSheetId,
  PRODUCT_SHEET_RANGE,
  PRODUCT_SHEET_HEADER_RANGE,
  PRODUCT_SHEET_TAB,
} from "./client";
import { sheetCategoryToId, idToSheetCategory } from "./category-map";

/**
 * The client owns and edits the product sheet, so its exact column layout is
 * not something this code can assume. Columns are matched by header NAME
 * instead of position — see buildColumnMap below for why that matters.
 */
type FieldKey =
  | "category"
  | "subcategory"
  | "itemName"
  | "description"
  | "price"
  | "currency"
  | "imageUrl"
  | "affiliateLink"
  | "discountCode"
  | "active"
  | "targetCountry"
  | "keywords"
  | "bundleId"
  | "itemRole"
  | "dbId";

/**
 * Accepted header spellings per field, most specific first. Matching is done
 * on a normalized form (lowercased, non-alphanumerics stripped), so
 * "Item_Name", "Item Name" and "itemname" are all equivalent.
 */
const FIELD_ALIASES: Record<FieldKey, string[]> = {
  category: ["category"],
  subcategory: ["subcategory"],
  itemName: ["itemname", "productname", "storename", "name", "item", "product", "store"],
  description: ["description", "desc", "details", "highlights"],
  price: ["pricerange", "price"],
  currency: ["currency"],
  imageUrl: ["imageurl", "image", "photo", "picture"],
  affiliateLink: ["affiliatelink", "affiliateurl", "affiliate", "offerlink", "buylink", "booklink", "link", "url"],
  discountCode: ["discountcode", "discount", "coupon", "promocode", "promo"],
  active: ["active", "isactive", "enabled", "status"],
  targetCountry: ["targetcountry", "targetcountries", "countries", "country", "region"],
  keywords: ["keywordstags", "keywords", "tags", "keyword", "tag"],
  bundleId: ["bundleid", "bundle"],
  itemRole: ["itemrole", "role"],
  dbId: ["dbid", "databaseid", "recordid"],
};

/** Fields the sync cannot meaningfully run without. */
const REQUIRED_FIELDS: FieldKey[] = ["category", "itemName"];

type ColumnMap = Partial<Record<FieldKey, number>>;

function normalizeHeader(text: string): string {
  return String(text ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function columnLetter(index: number): string {
  let n = index;
  let letters = "";
  while (n >= 0) {
    letters = String.fromCharCode((n % 26) + 65) + letters;
    n = Math.floor(n / 26) - 1;
  }
  return letters;
}

/**
 * Resolves each logical field to a column index using the sheet's own header
 * row.
 *
 * Two passes, so a precise header always wins over a loose one: an exact
 * alias match claims its column first, and only then do the remaining fields
 * fall back to substring matching over the columns nobody claimed. That
 * ordering is what lets a sheet whose headers read "Affiliate_Link" and
 * "Affiliate_Link active" (as the live one does) resolve affiliateLink to the
 * former and active to the latter, rather than both grabbing the same column.
 */
export function buildColumnMap(header: string[]): ColumnMap {
  const normalized = header.map(normalizeHeader);
  const claimed = new Set<number>();
  const map: ColumnMap = {};

  const claim = (field: FieldKey, index: number) => {
    map[field] = index;
    claimed.add(index);
  };

  const fields = Object.keys(FIELD_ALIASES) as FieldKey[];

  for (const field of fields) {
    for (const alias of FIELD_ALIASES[field]) {
      const index = normalized.findIndex((h, i) => h === alias && !claimed.has(i));
      if (index !== -1) {
        claim(field, index);
        break;
      }
    }
  }

  for (const field of fields) {
    if (map[field] !== undefined) continue;
    for (const alias of FIELD_ALIASES[field]) {
      const index = normalized.findIndex((h, i) => h.length > 0 && h.includes(alias) && !claimed.has(i));
      if (index !== -1) {
        claim(field, index);
        break;
      }
    }
  }

  const missing = REQUIRED_FIELDS.filter((f) => map[f] === undefined);
  if (missing.length > 0) {
    throw new Error(
      `Google Sheet is missing required column(s): ${missing.join(", ")}. Found headers: ${header.filter(Boolean).join(" | ")}`,
    );
  }

  return map;
}

type SheetRow = {
  rowNumber: number; // 1-indexed sheet row, for writing back
  raw: string[];
  category: string;
  subcategory: string;
  itemName: string;
  description: string;
  price: string;
  currency: string;
  imageUrl: string;
  affiliateLink: string;
  discountCode: string;
  active: string;
  targetCountry: string;
  keywords: string;
  bundleId: string;
  itemRole: string;
  dbId: string;
};

function cell(row: string[], index: number | undefined): string {
  if (index === undefined) return "";
  return String(row[index] ?? "").trim();
}

function parseRows(values: string[][], map: ColumnMap): SheetRow[] {
  const rows: SheetRow[] = [];
  values.forEach((row, idx) => {
    const itemName = cell(row, map.itemName);
    if (!itemName) return; // skip blank rows
    rows.push({
      rowNumber: idx + 2, // range starts at row 2 (row 1 is header)
      raw: row,
      itemName,
      category: cell(row, map.category),
      subcategory: cell(row, map.subcategory),
      description: cell(row, map.description),
      price: cell(row, map.price),
      currency: cell(row, map.currency),
      imageUrl: cell(row, map.imageUrl),
      affiliateLink: cell(row, map.affiliateLink),
      discountCode: cell(row, map.discountCode),
      active: cell(row, map.active),
      targetCountry: cell(row, map.targetCountry),
      keywords: cell(row, map.keywords),
      bundleId: cell(row, map.bundleId),
      itemRole: cell(row, map.itemRole),
      dbId: cell(row, map.dbId),
    });
  });
  return rows;
}

function parsePrice(raw: string): number | null {
  // The live sheet's column is "Price_Range", which can hold things like
  // "100-200". Storing the lower bound as an exact price would render a
  // confidently wrong figure on the product card, so ranges are left unset.
  if (/\d\s*[-–—]\s*\d/.test(raw)) return null;
  const match = raw.match(/[\d.]+/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

function parseImageUrl(raw: string): string | null {
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) return null; // placeholder text like "Image URL"
  return raw;
}

/**
 * Only a real http(s) address becomes a buy link. Anything else in the
 * Affiliate_Link cell is rejected, because whatever it is, it cannot work as
 * a destination — the card would render a Buy Now button that goes nowhere.
 * This has caught a boolean from a column-mapping slip ("TRUE") and discount
 * codes typed into the wrong column ("Discount Code: NM408").
 */
function parseAffiliateUrl(raw: string): string | null {
  if (!raw) return null;
  return /^https?:\/\//i.test(raw.trim()) ? raw.trim() : null;
}

/**
 * Recovers a discount code that was typed into the Affiliate_Link column
 * instead of Discount_Code, so rejecting the bad link doesn't also throw away
 * a code the client negotiated. Only used when Discount_Code itself is empty.
 */
function extractDiscountCode(raw: string): string | null {
  if (!raw || /^https?:\/\//i.test(raw.trim())) return null;
  const labelled = raw.match(/(?:discount|promo|coupon)\s*code\s*[:\-]?\s*([A-Za-z0-9_-]{3,})/i);
  if (labelled) return labelled[1];
  // A bare token that looks like a code (no spaces, mixed alphanumerics).
  const bare = raw.trim();
  if (/^[A-Za-z0-9_-]{3,20}$/.test(bare) && /\d/.test(bare) && !/^(true|false|yes|no)$/i.test(bare)) {
    return bare;
  }
  return null;
}

function parseActive(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  if (v === "false" || v === "no" || v === "inactive") return false;
  return true; // blank/unset defaults to active
}

function parseItemRole(raw: string): string {
  const v = raw.trim().toLowerCase();
  return v === "complementary" ? "complementary" : "main";
}

async function loadSheet() {
  const sheets = getSheetsClient();
  const spreadsheetId = getSheetId();

  const [headerRes, bodyRes] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId, range: PRODUCT_SHEET_HEADER_RANGE }),
    sheets.spreadsheets.values.get({ spreadsheetId, range: PRODUCT_SHEET_RANGE }),
  ]);

  const header = (headerRes.data.values?.[0] ?? []) as string[];
  const map = buildColumnMap(header);
  const rows = parseRows((bodyRes.data.values ?? []) as string[][], map);

  return { sheets, spreadsheetId, header, map, rows };
}

/**
 * Pulls all rows from the Google Sheet into the database. Rows with a DB_ID
 * already filled in are updated in place; new rows are created, and their
 * generated id is written back into the sheet's DB_ID column so future syncs
 * stay linked even if the client reorders rows.
 */
export async function pullProductsFromSheet() {
  const { sheets, spreadsheetId, map, rows } = await loadSheet();

  // Batch-fetch which of the sheet's DB_IDs actually still exist, instead of
  // one findUnique per row — this was the main cost of a ~90s sync for 90 rows.
  const candidateIds = rows.map((r) => r.dbId).filter(Boolean);
  const existingIds = new Set(
    candidateIds.length > 0
      ? (
          await prisma.product.findMany({
            where: { id: { in: candidateIds } },
            select: { id: true },
          })
        ).map((p) => p.id)
      : [],
  );

  let created = 0;
  let updated = 0;
  const idWrites: { row: number; id: string }[] = [];

  const toData = (row: SheetRow) => ({
    category: sheetCategoryToId(row.category),
    subcategory: row.subcategory || null,
    nameEn: row.itemName,
    nameAr: row.itemName, // sheet has no Arabic name column yet — brand names shown as-is
    descriptionEn: row.description || null,
    imageUrl: parseImageUrl(row.imageUrl),
    price: parsePrice(row.price),
    currency: row.currency || "SAR",
    affiliateUrl: parseAffiliateUrl(row.affiliateLink),
    discountCode: row.discountCode || extractDiscountCode(row.affiliateLink),
    targetCountries: row.targetCountry || null,
    tags: row.keywords || null,
    bundleId: row.bundleId || null,
    itemRole: parseItemRole(row.itemRole),
    active: parseActive(row.active),
  });

  // Chunked so only CHUNK_SIZE queries are ever in flight at once (each chunk's
  // Prisma calls are only created — and so only dispatched — inside the loop
  // iteration that awaits them), rather than firing all ~90 writes at once.
  const CHUNK_SIZE = 10;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(async (row) => {
        const data = toData(row);
        if (row.dbId && existingIds.has(row.dbId)) {
          updated++;
          await prisma.product.update({ where: { id: row.dbId }, data });
          return;
        }
        created++;
        const product = await prisma.product.create({ data });
        idWrites.push({ row: row.rowNumber, id: product.id });
      }),
    );
  }

  // Without a DB_ID column there is nowhere to record the link back to each
  // database row, which would make every future sync re-create everything.
  // Surface that instead of silently duplicating the catalog on each run.
  if (idWrites.length > 0 && map.dbId === undefined) {
    console.warn(
      "[sheets] No DB_ID column found in the product sheet — newly created products cannot be linked back, and the next sync will create duplicates. Add a 'DB_ID' column to the sheet.",
    );
  }

  if (idWrites.length > 0 && map.dbId !== undefined) {
    const letter = columnLetter(map.dbId);
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: idWrites.map((w) => ({
          range: `${PRODUCT_SHEET_TAB}!${letter}${w.row}`,
          values: [[w.id]],
        })),
      },
    });
  }

  return { created, updated, total: rows.length, linkedBack: map.dbId !== undefined };
}

/**
 * Pushes database products back to the sheet: products already linked to a
 * sheet row (by DB_ID) get that row's cells refreshed; products with no
 * linked row (e.g. created directly in the admin panel) are appended as new
 * rows.
 */
export async function pushProductsToSheet() {
  const { sheets, spreadsheetId, header, map, rows } = await loadSheet();
  const rowByDbId = new Map(rows.filter((r) => r.dbId).map((r) => [r.dbId, r]));

  const products = await prisma.product.findMany({ orderBy: { createdAt: "asc" } });

  const width = Math.max(header.length, ...Object.values(map).map((i) => (i ?? -1) + 1));
  const lastLetter = columnLetter(width - 1);

  const updates: { range: string; values: string[][] }[] = [];
  const appends: string[][] = [];

  for (const p of products) {
    const existingRow = rowByDbId.get(p.id);

    // Start from whatever is already in the row so any column this sync
    // doesn't manage (client-added notes, formulas, etc.) survives the write
    // instead of being blanked out.
    const values: string[] = Array.from({ length: width }, (_, i) => String(existingRow?.raw?.[i] ?? ""));

    const set = (field: FieldKey, value: string) => {
      const index = map[field];
      if (index !== undefined) values[index] = value;
    };

    set("category", idToSheetCategory(p.category));
    set("subcategory", p.subcategory ?? "");
    set("itemName", p.nameEn);
    set("description", p.descriptionEn ?? "");
    set("price", p.price != null ? String(p.price) : "");
    set("currency", p.currency ?? "");
    set("imageUrl", p.imageUrl ?? "");
    set("affiliateLink", p.affiliateUrl ?? "");
    set("discountCode", p.discountCode ?? "");
    set("active", p.active ? "TRUE" : "FALSE");
    set("targetCountry", p.targetCountries ?? "");
    set("keywords", p.tags ?? "");
    set("bundleId", p.bundleId ?? "");
    set("itemRole", p.itemRole === "complementary" ? "Complementary" : "Main");
    set("dbId", p.id);

    if (existingRow) {
      updates.push({
        range: `${PRODUCT_SHEET_TAB}!A${existingRow.rowNumber}:${lastLetter}${existingRow.rowNumber}`,
        values: [values],
      });
    } else {
      appends.push(values);
    }
  }

  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: "RAW", data: updates },
    });
  }

  if (appends.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: PRODUCT_SHEET_RANGE,
      valueInputOption: "RAW",
      requestBody: { values: appends },
    });
  }

  return { updated: updates.length, appended: appends.length, total: products.length };
}
