from __future__ import annotations

import argparse
import json
import re
import shutil
from datetime import datetime
from pathlib import Path

try:
    from pypdf import PdfReader
except Exception:  # pragma: no cover
    PdfReader = None


DEFAULT_SOURCE = Path(r"D:\美股基本面分析")
ROOT = Path(__file__).resolve().parent
DOCS = ROOT / "docs"
PDF_OUT = DOCS / "pdfs"
DATA_OUT = DOCS / "data" / "presentations.json"


def safe_slug(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"[^a-z0-9\-\u4e00-\u9fff]+", "", text)
    text = text.strip("-")
    return text or "presentation"


def unique_name(base: str, used: set[str]) -> str:
    name = base
    index = 2
    while name in used:
        stem = Path(base).stem
        name = f"{stem}-{index}.pdf"
        index += 1
    used.add(name)
    return name


def pdf_page_count(path: Path) -> int | None:
    if PdfReader is None:
        return None
    try:
        return len(PdfReader(str(path)).pages)
    except Exception:
        return None


def display_title(path: Path) -> str:
    title = path.stem.replace("_", " ").replace("-", " ")
    title = re.sub(r"\s+", " ", title).strip()
    return title


def build_manifest(source: Path) -> list[dict]:
    if not source.exists():
        raise FileNotFoundError(f"Source folder does not exist: {source}")

    PDF_OUT.mkdir(parents=True, exist_ok=True)
    DATA_OUT.parent.mkdir(parents=True, exist_ok=True)

    for old_pdf in PDF_OUT.glob("*.pdf"):
        old_pdf.unlink()

    presentations: list[dict] = []
    used_names: set[str] = set()
    pdfs = sorted(source.rglob("*.pdf"), key=lambda p: str(p).lower())
    for index, pdf in enumerate(pdfs, start=1):
        rel = pdf.relative_to(source)
        parts = rel.parts
        category = parts[0] if len(parts) > 1 else "未分类"
        company = parts[-2] if len(parts) > 1 else ""
        slug_parts = [safe_slug(part) for part in parts[:-1]]
        slug_parts.append(safe_slug(pdf.stem))
        filename = unique_name("__".join(slug_parts) + ".pdf", used_names)
        target = PDF_OUT / filename
        shutil.copy2(pdf, target)

        stat = pdf.stat()
        presentations.append(
            {
                "id": safe_slug("__".join(slug_parts)),
                "index": index,
                "title": display_title(pdf),
                "category": category,
                "company": company,
                "sourcePath": str(pdf),
                "pdf": f"pdfs/{filename}",
                "sizeMB": round(stat.st_size / 1024 / 1024, 2),
                "modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d"),
                "pages": pdf_page_count(pdf),
            }
        )

    DATA_OUT.write_text(
        json.dumps(
            {
                "generatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "source": str(source),
                "count": len(presentations),
                "presentations": presentations,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    return presentations


def main() -> None:
    parser = argparse.ArgumentParser(description="Build static PDF presentation library.")
    parser.add_argument("--source", default=str(DEFAULT_SOURCE), help="Folder containing PDF files.")
    args = parser.parse_args()
    presentations = build_manifest(Path(args.source))
    print(f"Built {len(presentations)} presentations into {DOCS}")


if __name__ == "__main__":
    main()
