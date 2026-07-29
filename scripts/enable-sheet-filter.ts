import "dotenv/config";
import { getSheetsClient, getSheetId, PRODUCT_SHEET_TAB } from "../src/lib/sheets/client";

/**
 * Turns on a standard filter across the Product sheet's header row, so the
 * client can sort and filter rows by hand in Google Sheets.
 *
 * Requested by the client; the sheet is theirs and this only adds the filter
 * UI, it does not reorder, hide or edit any data. setBasicFilter replaces any
 * filter already present rather than stacking a second one, so re-running is
 * harmless.
 */

async function main() {
  const apply = process.argv.includes("--apply");
  const sheets = getSheetsClient();
  const spreadsheetId = getSheetId();

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const tabs = meta.data.sheets ?? [];
  const target = tabs.find((s) => s.properties?.title === PRODUCT_SHEET_TAB);

  console.log(`Spreadsheet: ${meta.data.properties?.title}`);
  console.log(`Tabs: ${tabs.map((s) => s.properties?.title).join(", ")}`);

  if (!target?.properties) {
    console.error(`Could not find a tab named "${PRODUCT_SHEET_TAB}".`);
    process.exit(1);
  }

  const sheetId = target.properties.sheetId!;
  const rowCount = target.properties.gridProperties?.rowCount ?? 2000;
  const columnCount = target.properties.gridProperties?.columnCount ?? 26;
  const existing = target.data?.[0] ? undefined : undefined;
  void existing;

  console.log(`\nTarget tab "${PRODUCT_SHEET_TAB}" (id ${sheetId}): ${rowCount} rows x ${columnCount} cols`);
  console.log(`Existing basic filter: ${target.basicFilter ? "yes" : "no"}`);

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to enable the filter.");
    return;
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          setBasicFilter: {
            filter: {
              // Anchored at row 0 so the header row becomes the filter row.
              range: { sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: columnCount },
            },
          },
        },
      ],
    },
  });

  const after = await sheets.spreadsheets.get({ spreadsheetId });
  const confirmed = (after.data.sheets ?? []).find((s) => s.properties?.sheetId === sheetId);
  console.log(`\nFilter enabled. Confirmed present: ${confirmed?.basicFilter ? "yes" : "no"}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
