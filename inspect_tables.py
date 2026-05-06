import sys
sys.stdout.reconfigure(encoding="utf-8")
from docx import Document
from docx.oxml.ns import qn

doc = Document(r"c:\Users\USER\AppData\Local\Packages\5319275A.WhatsAppDesktop_cv1g1gvanyjgm\LocalState\sessions\1C931A0273499377EDFAD25A7D2C550B74CA029C\transfers\2026-18\Project_Report.docx")

# Tables 2, 3, 4 are the TOC, LoF, LoT tables (0-indexed: 1, 2, 3)
for tbl_idx, label in [(1, "TOC"), (2, "LIST OF FIGURES"), (3, "LIST OF TABLES")]:
    tbl = doc.tables[tbl_idx]
    print(f"\n=== Table {tbl_idx+1}: {label} ===")
    print(f"  Rows: {len(tbl.rows)}, Cols: {len(tbl.columns)}")
    for i, row in enumerate(tbl.rows):
        cells = [c.text.strip() for c in row.cells]
        print(f"  Row {i}: {cells}")
        if i > 30:
            print(f"  ... ({len(tbl.rows) - i - 1} more rows)")
            break

# Also inspect body element order in TOC area
print("\n=== Body element sequence (TOC area) ===")
body = doc.element.body
children = list(body)
in_range = False
para_count = 0
for j, child in enumerate(children):
    tag = child.tag.split('}')[1] if '}' in child.tag else child.tag
    text = ""
    if tag == 'p':
        text = ''.join(r.text or '' for r in child.iter(qn('w:t'))).strip()
        para_count += 1
    
    if text == "Table of Contents":
        in_range = True
    if in_range:
        print(f"  [{j:3d}] <{tag}>: {text[:60] if text else '(empty)'}")
    if text == "Chapter 1: Introduction":
        break
