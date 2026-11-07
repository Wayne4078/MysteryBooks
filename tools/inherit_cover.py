# 한 권의 뒷장은 책 꼴(표지·제본·권두 삽화)을 첫 장에서 그대로 물려받는다.
# python3 tools/inherit_cover.py stories/drift2.json stories/drift.json
import json, sys
COVER = ["title", "kicker", "binding", "cloth", "cover_stamp", "cover_img", "cover_tag", "frontis", "frontis_cap"]
dst, src = sys.argv[1], sys.argv[2]
if dst == src: sys.exit(0)
b, f = json.load(open(dst, encoding="utf-8")), json.load(open(src, encoding="utf-8"))
for k in COVER:
    if k in f["meta"] and k not in b["meta"]: b["meta"][k] = f["meta"][k]
json.dump(b, open(dst, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
