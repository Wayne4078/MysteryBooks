#!/bin/sh
# 책 한 권을 찍어낸다: sh tools/build.sh drift "표류 일기"
# 이야기 원본(장마다 하나: src/<책>_story.py, src/<책>2_story.py …) → JSON → 점검 관문 → 엔진에 책 이름을 넣어 docs/<책>/ 에 만든다 → 장마다 자동 시험
set -e
cd "$(dirname "$0")/.."
BOOK=$1; TITLE=$2
mkdir -p stories docs/${BOOK}/stories
CHAPTERS=""
for src in src/${BOOK}_story.py src/${BOOK}[0-9]*_story.py; do
  [ -f "$src" ] || continue
  name=$(basename "$src" _story.py)
  python3 "$src" >/dev/null
  node tools/lint.mjs stories/${name}.json
  cp stories/${name}.json docs/${BOOK}/stories/
  CHAPTERS="$CHAPTERS $name"
done
sed -e "s/__BOOK__/${BOOK}/" -e "s/__TITLE__/${TITLE}/" engine/engine.html > docs/${BOOK}/index.html
# 그림: art/<책>/ 이 있으면 docs/<책>/art/ 로 같이 간다
if [ -d "art/${BOOK}" ]; then mkdir -p docs/${BOOK}/art; cp art/${BOOK}/* docs/${BOOK}/art/; fi
for name in $CHAPTERS; do node tools/sim.mjs ${BOOK} ${name} | tee /tmp/mb-sim.$$.out; grep -q "errs: 0," /tmp/mb-sim.$$.out || { echo "자동 시험 실패: ${name}"; exit 1; }; done
# 여러 인생 시험: 한 사람이 네 번 연달아 산다 — 막힘 없음, 인생은 한 번에 하나씩 세어짐
node tools/lives.mjs ${BOOK} 4 150 curious | tee /tmp/mb-lives.$$.out
grep -q "errs: 0," /tmp/mb-lives.$$.out && grep -q "lifeCountWrong: 0," /tmp/mb-lives.$$.out || { echo "여러 인생 시험 실패"; exit 1; }
