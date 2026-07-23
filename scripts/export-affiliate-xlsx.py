import zipfile
import xml.etree.ElementTree as ET
import re
import json
from pathlib import Path

ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

CAT_MAP = {
    "Smart Travel": "travel",
    "Men's Fashion": "fashion",
    "Fashion": "fashion",
    "Beauty": "beauty",
    "Beauty & Care": "beauty",
    "Skincare": "skincare",
    "Home & Kitchen": "home",
    "Home & Electronics": "home",
    "Kids & Baby": "kids",
    "Bags": "fashion",
    "Gifts": "home",
    "Health": "beauty",
    "Coffee & Beverage": "home",
    "Deals": "fashion",
    "Electronics": "home",
    "Events & Tickets": "travel",
    "General": "fashion",
}


def load_shared(z: zipfile.ZipFile) -> list[str]:
    root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    strings: list[str] = []
    for si in root.findall("m:si", ns):
        texts = [t.text or "" for t in si.findall(".//m:t", ns)]
        strings.append("".join(texts))
    return strings


def get_val(c: ET.Element, shared: list[str]) -> str:
    t = c.get("t")
    v = c.find("m:v", ns)
    if v is None:
        return ""
    val = v.text or ""
    if t == "s":
        val = shared[int(val)]
    return val


def extract_url(s: str) -> str | None:
    m = re.search(r"\((https?://[^)]+)\)", s)
    if m:
        return m.group(1)
    m = re.search(r"(https?://\S+)", s)
    if m:
        return m.group(1).rstrip(")")
    return None


def main() -> None:
    path = Path(r"F:\MY PROJECT\Raghad_AI\DATA\affilateid link july 20.xlsx")
    rows = []
    with zipfile.ZipFile(path) as z:
        shared = load_shared(z)
        root = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
        for row in root.findall("m:sheetData/m:row", ns)[1:]:
            cells: dict[str, str] = {}
            for c in row.findall("m:c", ns):
                ref = c.get("r") or ""
                col_m = re.match(r"([A-Z]+)", ref)
                if not col_m:
                    continue
                cells[col_m.group(1)] = get_val(c, shared)
            if not cells.get("B"):
                continue
            cat_raw = cells.get("A", "").strip()
            brand = cells.get("B", "").strip()
            raw = cells.get("C", "").strip()
            url = extract_url(raw)
            code = None if url else (raw or None)
            category = CAT_MAP.get(cat_raw, "fashion")
            rows.append(
                {
                    "category": category,
                    "nameEn": brand,
                    "nameAr": brand,
                    "descriptionEn": f"{brand} — curated affiliate partner for {cat_raw}.",
                    "descriptionAr": f"{brand} — شريك معتمد في قسم {cat_raw}.",
                    "affiliateUrl": url,
                    "discountCode": code,
                }
            )

    out = Path(r"F:\MY PROJECT\Raghad_AI\scripts\affiliate-links-data.json")
    out.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {len(rows)} products to {out}")


if __name__ == "__main__":
    main()
