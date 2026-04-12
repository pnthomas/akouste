#!/usr/bin/env python3
"""
Fetch the published Google Sheet CSV and write Tier-A wordlist JSON for the web app.

Usage:
  python scripts/import_sheet_wordlist.py
  WORDLIST_CSV_URL=https://... python scripts/import_sheet_wordlist.py
  python scripts/import_sheet_wordlist.py --output public/data/wordlist.json
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import URLError, HTTPError
from urllib.request import Request, urlopen

DEFAULT_CSV_URL = (
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSp4GDYcJO0yfzZWtxQSfEMjE6n6-KIvbPbc91_COg5D59EubY7mpJwoVEAKdggc1x8l0s9c9k2CEDj/pub?output=csv"
)

# Expected header row (case-sensitive match after strip)
EXPECTED_FIELDS = ("Greek", "English", "Subcategory", "Main Category")


def repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def fetch_csv(url: str, timeout: int = 60) -> str:
    req = Request(url, headers={"User-Agent": "akouste-wordlist-import/1.0"})
    with urlopen(req, timeout=timeout) as resp:
        charset = resp.headers.get_content_charset() or "utf-8"
        raw = resp.read()
    return raw.decode(charset)


def parse_entries(text: str) -> list[dict[str, str]]:
    # utf-8-sig strips BOM if present
    f = io.StringIO(text.lstrip("\ufeff"))
    reader = csv.DictReader(f)
    if reader.fieldnames is None:
        raise ValueError("CSV has no header row")
    fields = tuple(h.strip() if h else "" for h in reader.fieldnames)
    if fields != EXPECTED_FIELDS:
        raise ValueError(
            f"Unexpected CSV columns {fields!r}; expected {EXPECTED_FIELDS!r}"
        )

    entries: list[dict[str, str]] = []
    for row in reader:
        greek = (row.get("Greek") or "").strip()
        if not greek:
            continue
        entries.append(
            {
                "greek": greek,
                "english": (row.get("English") or "").strip(),
                "topic": (row.get("Subcategory") or "").strip(),
                "category": (row.get("Main Category") or "").strip(),
            }
        )
    return entries


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--url",
        default=os.environ.get("WORDLIST_CSV_URL", DEFAULT_CSV_URL),
        help="Published CSV URL (default: env WORDLIST_CSV_URL or built-in default)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=repo_root() / "public" / "data" / "wordlist.json",
        help="Output JSON path",
    )
    args = parser.parse_args()

    try:
        text = fetch_csv(args.url)
    except HTTPError as e:
        raise SystemExit(f"HTTP error fetching word list: {e.code} {e.reason}") from e
    except URLError as e:
        raise SystemExit(f"Network error fetching word list: {e.reason}") from e

    entries = parse_entries(text)
    out = {
        "meta": {
            "source": "google-sheet-published-csv",
            "csvUrl": args.url,
            "fetchedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "entryCount": len(entries),
        },
        "entries": entries,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(out, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(entries)} entries to {args.output}")


if __name__ == "__main__":
    main()
