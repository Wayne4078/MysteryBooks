# 미스터리 북스

옛 RPG 게임책을 모바일로 옮긴 시리즈. 엔진 하나에 이야기 파일만 바꿔 여러 장르의 책을 낸다.

- 「표류 일기」 — 은퇴 크루즈 조난자, 여백의 섬, 6권 구성
- 「황금닭 사장님」 — 퇴직금 치킨집, 돈 이야기

## 읽기

GitHub Pages: 이 저장소의 `docs/` 가 그대로 웹에 열린다. 첫 화면은 책장, 책을 누르면 그 책.

## 찍어내기

```sh
sh tools/build.sh drift "표류 일기"        # 원본 → 점검 관문 → 엔진에 넣기 → 장마다 자동 시험 → docs/drift/
sh tools/build.sh chicken "황금닭 사장님"
node tools/shot.mjs drift                  # 폰 폭 스크린샷 → shots/drift/ (눈으로 확인)
python3 tools/art.py drift cave <주소>      # 그림 한 장 들이기 → art/drift/cave.webp
```

| 자리 | 무엇 |
| --- | --- |
| `engine/engine.html` | 공용 엔진. 모든 책이 같은 엔진을 쓴다 |
| `src/<책>_story.py`, `src/<책>2_story.py` … | 장마다 이야기 원본. 형식 설명은 `src/drift_story.py` 맨 위 |
| `art/<책>/` | 그림 (흑백 극화 펜화, 720×960 안팎 webp) |
| `tools/` | 점검 관문, 자동 시험, 그림 들이기, 화면 확인, 찍어내기 |
| `docs/` | 찍어낸 결과. Pages가 이걸 연다 |

제작 규칙은 `CLAUDE.md`.
