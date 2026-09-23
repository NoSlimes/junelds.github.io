#!/usr/bin/env python3
"""Combine content/ fragments into data/*.yml.

Source of truth: content/. Run locally or via .github/workflows/content.yml.
"ordning" sets sort order (lowest first) and is stripped from output.
"""

import json
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content"
DATA = ROOT / "data"
HEADER = (
    "# GENERATED FILE – do not edit.\n"
    "# Source: content/. Built by scripts/combine_content.py\n"
)

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class IndentDumper(yaml.SafeDumper):
    """YAML dumper with indented lists."""

    def increase_indent(self, flow=False, indentless=False):
        return super().increase_indent(flow, False)


def _quoted_str(dumper, data):
    # Quote date-like strings so they don't parse as date objects.
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


def finalize(item):
    """Strip editor-only keys; translate fokus {x, y} to imageObjectPosition."""
    item = strip_order(item)
    fokus = item.pop("fokus", None)
    if isinstance(fokus, dict):
        try:
            x = int(fokus.get("x", 50))
            y = int(fokus.get("y", 50))
        except (TypeError, ValueError):
            x, y = 50, 50
        x = max(0, min(100, x))
        y = max(0, min(100, y))
        item["imageObjectPosition"] = f"{x}% {y}%"
    return item


def build(wrapper_key, subdir, filename):
    items = ordered(load_fragments(subdir))
    text = HEADER + yaml.dump(
        {wrapper_key: [finalize(i) for i in items]},
        Dumper=IndentDumper,
        allow_unicode=True,
        width=1000,
        sort_keys=False,
    )
    out = DATA / filename
    with open(out, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)
    print(f"{filename}: {len(items)} poster från content/{subdir}/")


def pretty_name(filename):
    stem = Path(filename).stem
    return re.sub(r"\s{2,}", " ", re.sub(r"[-_]", " ", stem)).strip()


def build_gallery():
    src = CONTENT / "galleri.yml"
    items = []
    if src.is_file():
        with open(src, encoding="utf-8") as fh:
            data = yaml.safe_load(fh) or {}
        for row in data.get("bilder", []) or []:
            if not isinstance(row, dict) or not row.get("bild"):
                continue
            filename = Path(row["bild"]).name
            items.append({
                "file": filename,
                "alt": row.get("alt") or pretty_name(filename),
                "caption": row.get("caption") or "",
            })
    out = ROOT / "media" / "gallery" / "index.json"
    with open(out, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(items, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    print(f"index.json: {len(items)} bilder från content/galleri.yml")


def main():
    build("turer", "turer", "tours.yml")
    build("tjanster", "tjanster", "services.yml")
    build("kategorier", "priser", "price-list.yml")
    build("poster", "aktuellt", "aktuellt.yml")
    build_gallery()


if __name__ == "__main__":
    main()
