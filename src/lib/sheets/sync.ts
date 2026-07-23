import { prisma } from "@/lib/db/prisma";
import { getSheetsClient, getSheetId, PRODUCT_SHEET_RANGE, PRODUCT_SHEET_TAB } from "./client";
import { sheetCategoryToId, idToSheetCategory } from "./category-map";

type SheetRow = {
  rowNumber: number; // 1-indexed sheet row, for writing back
  category: string;
  subcategory: string;
  itemName: string;
  description: string;
  priceRange: string;
  imageUrl: string;
  affiliateLink: string;
  affiliateActive: string;
  targetCountry: string;
  keywords: string;
  dbId: string;
};

function cell(row: string[], i: number): string {
  return (row[i] ?? "").trim();
}

function parseRows(values: string[][]): SheetRow[] {
  const rows: SheetRow[] = [];
  values.forEach((row, idx) => {
    const itemName = cell(row, 2);
    if (!itemName) return; // skip blank rows
    rows.push({
      rowNumber: idx + 2, // range starts at row 2 (row 1 is header)
      category: cell(row, 0),
      subcategory: cell(row, 1),
      itemName,
      description: cell(row, 3),
      priceRange: cell(row, 4),
      imageUrl: cell(row, 5),
      affiliateLink: cell(row, 6),
      affiliateActive: cell(row, 7),
      targetCountry: cell(row, 8),
      keywords: cell(row, 9),
      dbId: cell(row, 10),
    });
  });
  return rows;
}

function parsePrice(priceRange: string): number | null {
  const match = priceRange.match(/[\d.]+/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

function parseImageUrl(raw: string): string | null {
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) return null; // placeholder text like "Image URL"
  return raw;
}

function parseActive(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  if (v === "false" || v === "no" || v === "inactive") return false;
  return true; // default active — sheet doesn't reliably signal inactive yet
}

/**
 * Pulls all rows from the Google Sheet into the database. Rows with a DB_ID
 * already filled in are updated in place; new rows are created, and their
 * generated id is written back into the sheet's DB_ID column so future syncs
 * stay linked even if the client reorders rows.
 */
export async function pullProductsFromSheet() {
  const sheets = getSheetsClient();
  const spreadsheetId = getSheetId();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: PRODUCT_SHEET_RANGE,
  });
  const rows = parseRows(res.data.values ?? []);

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
    price: parsePrice(row.priceRange),
    affiliateUrl: row.affiliateLink || null,
    targetCountries: row.targetCountry || null,
    tags: row.keywords || null,
    active: parseActive(row.affiliateActive),
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

  if (idWrites.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: idWrites.map((w) => ({
          range: `${PRODUCT_SHEET_TAB}!K${w.row}`,
          values: [[w.id]],
        })),
      },
    });
  }

  return { created, updated, total: rows.length };
}

/**
 * Pushes database products back to the sheet: products already linked to a
 * sheet row (by DB_ID) get that row's cells refreshed; products with no
 * linked row (e.g. created directly in the admin panel) are appended as new
 * rows.
 */
export async function pushProductsToSheet() {
  const sheets = getSheetsClient();
  const spreadsheetId = getSheetId();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: PRODUCT_SHEET_RANGE,
  });
  const rows = parseRows(res.data.values ?? []);
  const rowByDbId = new Map(rows.filter((r) => r.dbId).map((r) => [r.dbId, r]));

  const products = await prisma.product.findMany({ orderBy: { createdAt: "asc" } });

  const updates: { range: string; values: string[][] }[] = [];
  const appends: string[][] = [];

  for (const p of products) {
    const values = [
      idToSheetCategory(p.category),
      p.subcategory ?? "",
      p.nameEn,
      p.descriptionEn ?? "",
      p.price != null ? String(p.price) : "",
      p.imageUrl ?? "",
      p.affiliateUrl ?? "",
      p.active ? "TRUE" : "FALSE",
      p.targetCountries ?? "",
      p.tags ?? "",
      p.id,
    ];

    const existingRow = rowByDbId.get(p.id);
    if (existingRow) {
      updates.push({ range: `${PRODUCT_SHEET_TAB}!A${existingRow.rowNumber}:K${existingRow.rowNumber}`, values: [values] });
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
