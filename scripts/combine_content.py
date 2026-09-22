#!/usr/bin/env python3
"""Slår ihop content-fragment (redigeras via Decap) till data/*.yml (läses av sidan).

Sanningen: content/. Output: data/. Körs lokalt eller via .github/workflows/content.yml.

Regler:
- Varje fragment i content/<grupp>/*.yml är ett objekt. Fältet "ordning"
  styr sortering (lägst först, default sist). "ordning" skalas bort i output.
- Output-språket är avsiktligt plain YAML (inga kommentarer utom headern).
"""

import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content"
DATA = ROOT / "data"
HEADER = (
    "# GENERERAD FIL – redigera inte manuellt.\n"
    "# Källa: content/ (redigeras via /admin). Byggs av scripts/combine_content.py\n"
)

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class IndentDumper(yaml.SafeDumper):
    """YAML-dump med indenterade listor (som dagens datafiler)."""

    def increase_indent(self, flow=False, indentless=False):
        return super().increase_indent(flow, False)


def _quoted_str(dumper, data):
    # Datumliknande strängar måste citeras, annars parsas de som datumobjekt.
    if DATE_RE.match(data):
        return dumper.represent_scalar("tag:yaml.org,2002:str", data, style='"')
    return dumper.represent_scalar("tag:yaml.org,2002:str", data)


IndentDumper.add_representer(str, _quoted_str)


def load_fragments(subdir):
    items = []
    folder = CONTENT / subdir
    if not folder.is_dir():
        return items
    for path in sorted(folder.glob("*.yml")):
        with open(path, encoding="utf-8") as fh:
            obj = yaml.safe_load(fh) or {}
        items.append((path.name, obj))
    return items


def ordered(items):
    def sort_key(pair):
        name, obj = pair
        try:
            order = float(obj.get("ordning", 9999))
        except (TypeError, ValueError):
            order = 9999
        return (order, name)

    return [obj for _, obj in sorted(items, key=sort_key)]


def strip_order(item):
    return {k: v for k, v in item.items() if k != "ordning"}


def build(wrapper_key, subdir, filename):
    items = ordered(load_fragments(subdir))
    text = HEADER + yaml.dump(
        {wrapper_key: [strip_order(i) for i in items]},
        Dumper=IndentDumper,
        allow_unicode=True,
        width=1000,
        sort_keys=False,
    )
    out = DATA / filename
    with open(out, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)
    print(f"{filename}: {len(items)} poster från content/{subdir}/")


def main():
    build("turer", "turer", "tours.yml")
    build("tjanster", "tjanster", "services.yml")
    build("kategorier", "priser", "price-list.yml")
    build("poster", "aktuellt", "aktuellt.yml")


if __name__ == "__main__":
    main()
