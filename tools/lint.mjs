// 게임책 이야기 점검 관문 — node tools/lint.mjs stories/drift.json
// 오류가 하나라도 있으면 내보내지 않는다. 주의는 사람이 보고 판단한다.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const file = process.argv[2] || 'stories/drift.json';
const B = JSON.parse(readFileSync(file, 'utf8'));
const here = dirname(file);
const SERIES = B.meta.series || B.meta.id.replace(/-\d+$/, '');
const errors = [], warns = [];
const E = (id, m) => errors.push(`[${id}] ${m}`);
const W = (id, m) => warns.push(`[${id}] ${m}`);

// 화면에 쓰지 않는 말 (바이블 「공통 장치와 화면에 쓰는 말」)
const BANNED = ['회귀', '루프', '로그라이크', '스탯', '판정', '보너스', '크리티컬', '버프', '디버프', '퀘스트', '레벨업', '세이브', '튜토리얼', '엔딩', '분기', 'HP', 'DC'];
const LIMIT = { paras: 4, choices: 3, chars: 120 };

const N = B.nodes, ids = Object.keys(N);
const resIds = new Set([...B.resources.map(r => r.id), 'insp']);
const jobs = new Set(B.jobs.map(j => j.id));
const traits = new Set([...B.traits.good, ...B.traits.bad].map(t => t.id));
const skills = new Set(Object.keys(B.skills));
const given = { has: new Set(), flag: new Set(), comp: new Set() };
const used = { has: [], flag: [], comp: [] };

// 장 잇기: 앞 장이 있으면 거기서 얻은 물건·깃발·동료는 이 장에서 써도 된다 (meta.prev_file = 앞 장 JSON 경로)

if (B.meta.prev_file) {
  const p = join(here, '..', B.meta.prev_file);
  if (!existsSync(p)) E('meta', `앞 장 파일 없음 ${B.meta.prev_file}`);
  else {
    const prev = JSON.parse(readFileSync(p, 'utf8'));
    if (B.meta.prev_id !== prev.meta.id) E('meta', `prev_id(${B.meta.prev_id})가 앞 장 id(${prev.meta.id})와 다름`);
    const grab = d => { if (!d) return; (d.give || []).forEach(x => given.has.add(x)); (d.flag || []).forEach(x => given.flag.add(x)); (d.comp || []).forEach(x => given.comp.add(x)); (Array.isArray(d.if) ? d.if : []).forEach(({ if: _, ...rest }) => grab(rest)); if (d.consume) grab(d.consume[2]); };
    Object.values(prev.nodes).forEach(n => { grab(n.do); (n.choices || []).forEach(c => grab(c.do)); });
    if (prev.meta.next_file !== file.replace(/^.*?(stories\/)/, '$1')) W('meta', `앞 장의 next_file(${prev.meta.next_file})이 이 파일을 가리키지 않음`);
  }
}
if (B.meta.next_file && !/^stories\/[\w-]+\.json$/.test(B.meta.next_file)) E('meta', `next_file 경로 꼴 이상함 ${B.meta.next_file}`);
if (B.meta.next_file && !B.meta.first_file && !B.meta.prev_file) W('meta', '다음 장이 있는 첫 장에는 first_file(자기 경로)을 적어 두면 「처음부터」가 안전함');

const surface = [];
let luckGives = 0, bigs = [];
const say = (id, s) => typeof s === 'string' && surface.push([id, s]);
const atoms = c => !c ? [] : (Array.isArray(c) ? c : [c]).flatMap(x => x.split('|')).map(a => a.replace(/^!/, ''));
const checkCond = (id, c) => atoms(c).forEach(a => {
  const [k, v] = a.split(':');
  if (k === 'job') { if (!jobs.has(v)) E(id, `없는 직업 조건 ${a}`); }
  else if (k === 'trait') { if (!traits.has(v)) E(id, `없는 특징 조건 ${a}`); }
  else if (k === 'res') { const m = v.match(/^(\w+)(>=|<=|>|<|=)(-?\d+)$/); if (!m || !resIds.has(m[1])) E(id, `잘못된 자원 조건 ${a}`); }
  else if (k in used) used[k].push([id, v]);
  else E(id, `알 수 없는 조건 ${a}`);
});
const checkDo = (id, d) => {
  if (!d) return;
  for (const k of Object.keys(d)) if (!['add', 'give', 'flag', 'comp', 'crit', 'consume', 'if', 'luck'].includes(k)) E(id, `알 수 없는 효과 ${k}`);
  Object.keys(d.add || {}).forEach(r => resIds.has(r) || E(id, `없는 자원 ${r}`));
  if (d.luck != null && !(Number.isInteger(d.luck) && d.luck >= -2 && d.luck <= 2)) E(id, 'luck 은 -2~2 정수');
  if (d.luck > 0) luckGives++;
  (d.give || []).forEach(x => given.has.add(x));
  (d.flag || []).forEach(x => given.flag.add(x));
  (d.comp || []).forEach(x => given.comp.add(x));
  if (d.crit && !['legend', 'disaster'].includes(d.crit[0])) E(id, `crit 종류는 legend/disaster`);
  (d.if || []).forEach(x => { checkCond(id, x.if); const { if: _, ...rest } = x; checkDo(id, rest); });
  if (d.consume) { resIds.has(d.consume[0]) || E(id, `없는 자원 ${d.consume[0]}`); checkDo(id, d.consume[2]); }
};

// 메타와 특징의 화면 글
B.resources.forEach(r => ['name', 'low', 'unit'].forEach(k => say('res:' + r.id, r[k])));
['title', 'kicker', 'sub', 'next', 'jobQ', 'chapter'].forEach(k => say('meta', B.meta[k]));
(B.meta.how || []).flat().forEach(s => say('meta', s));
B.jobs.forEach(j => ['name', 'desc', 'edge', 'win'].forEach(k => say('job:' + j.id, j[k])));
[...B.traits.good, ...B.traits.bad].forEach(t => {
  if (t.mod && Object.values(t.mod).some(v => v < 0) && !t.lose) W('trait:' + t.id, '불리한 특징에 lose 문구가 없음');
  ['name', 'desc', 'edge', 'win', 'lose'].forEach(k => say('trait:' + t.id, t[k]));
  Object.keys(t.mod || {}).forEach(s => skills.has(s) || E('trait:' + t.id, `없는 솜씨 ${s}`));
  if (!(t.weight >= 1)) E('trait:' + t.id, '무게(weight)는 1 이상');
});
if (!N[B.meta.start]) E('meta', `시작 페이지 ${B.meta.start} 없음`);

// 페이지마다
const nums = new Map();
for (const id of ids) {
  const n = N[id];
  if (nums.has(n.n)) E(id, `페이지 번호 ${n.n} 이 ${nums.get(n.n)} 와 겹침`); else nums.set(n.n, id);
  if (n.when) say(id, n.when);
  if (n.img) {
    if (!/^art\/[\w-]+\.(webp|png|jpg)$/.test(n.img)) E(id, `그림 경로는 art/<이름>.webp 꼴이어야 함: ${n.img}`);
    else if (!existsSync(join(here, '..', 'art', SERIES, n.img.slice(4)))) E(id, `그림이 아직 없음: art/${SERIES}/${n.img.slice(4)} — python3 tools/art.py ${SERIES} ${n.img.slice(4, -5)} <Recraft 주소>`);
    if (!n.alt) W(id, '그림에 alt(한 줄 설명)가 없음'); say(id, n.alt);
    if (n.art) say(id, ''); // art: 그림 주문서(장면 설명). 화면에는 안 나온다
  }
  const text = n.text || [];
  text.forEach(p => {
    if (typeof p === 'string') { say(id, p); if (p.length > LIMIT.chars) W(id, `문단이 김 (${p.length}자)`); }
    else { checkCond(id, p.if); say(id, p.text); say(id, p.else); }
  });
  const visible = text.filter(p => typeof p === 'string' || !p.group).length + new Set(text.filter(p => p.group).map(p => p.group)).size;
  if (visible > LIMIT.paras) W(id, `문단이 최대 ${visible}개까지 보일 수 있음 (기준 ${LIMIT.paras})`);
  checkDo(id, n.do);
  if (n.box) { say(id, n.box.title); say(id, n.box.text); }
  if (n.end) continue;
  const ch = n.choices || [];
  if (!ch.length) E(id, '선택지가 없는 막다른 페이지');
  const always = ch.filter(c => !c.if).length;
  // cover: "이 중 하나는 반드시 참" 이라고 작가가 보증하는 조건들. 각 조건마다 그 조건의 선택지가 있어야 한다
  if (!always && n.cover) n.cover.forEach(cv => { checkCond(id, cv); ch.some(c => c.if === cv || (Array.isArray(c.if) && c.if.includes(cv))) || E(id, `cover 조건 ${cv} 에 해당하는 선택지가 없음`); });
  else if (!always) E(id, '조건 없이 고를 수 있는 선택지가 하나도 없음 (하나는 반드시 참인 조건들이면 cover 에 적는다)');
  if (always + Math.min(1, ch.length - always) > LIMIT.choices) W(id, `한 번에 보이는 선택지가 ${LIMIT.choices}개를 넘을 수 있음`);
  ch.forEach((c, i) => {
    const cid = `${id}#${i + 1}`;
    say(cid, c.label); say(cid, c.tag?.replace('★', ''));
    checkCond(cid, c.if); checkDo(cid, c.do);
    if (c.check) {
      const k = c.check;
      if (!skills.has(k.skill)) E(cid, `없는 솜씨 ${k.skill}`);
      if (k.big) bigs.push(cid);
      if (!(k.dc >= 2 && k.dc <= 20)) E(cid, `어려움 숫자 ${k.dc} 이상함`);
      ['crit', 'ok', 'fail', 'fumble'].forEach(r => k.to?.[r] ? (N[k.to[r]] || E(cid, `${r} → 없는 페이지 ${k.to[r]}`)) : E(cid, `${r} 결과 페이지 없음`));
    } else if (!N[c.to]) E(cid, `없는 페이지 ${c.to} 로 감`);
  });
}

// 닿지 않는 페이지
const seen = new Set(), stack = [B.meta.start];
while (stack.length) {
  const id = stack.pop(); if (seen.has(id) || !N[id]) continue; seen.add(id);
  (N[id].choices || []).forEach(c => c.check ? stack.push(...Object.values(c.check.to)) : stack.push(c.to));
}
ids.filter(id => !seen.has(id)).forEach(id => W(id, '시작에서 닿을 수 없는 페이지'));
if (!ids.some(id => N[id].end && seen.has(id))) E('meta', '끝 페이지에 닿을 수 없음');

// 얻지 않은 것을 쓰는지
for (const k of ['has', 'flag', 'comp']) used[k].forEach(([id, v]) => given[k].has(v) || E(id, `${k}:${v} 를 확인하지만 어디서도 얻지 않음`));
(B.meta.clues || []).forEach(([f]) => given.flag.has(f) || E('meta', `단서 ${f} 를 주는 페이지 없음`));
Object.keys(B.companions || {}).forEach(c => given.comp.has(c) || W('meta', `동료 ${c} 가 합류하는 페이지 없음`));

// 금지어
surface.forEach(([id, s]) => BANNED.forEach(w => s.includes(w) && E(id, `화면 금지어 「${w}」: ${s.slice(0, 40)}…`)));

// 복: 결정적 순간은 장마다 하나(서로 갈리는 길이면 둘까지), 복이 쌓이는 자리는 넉넉히
if (!bigs.length) W('meta', '결정적 순간(check.big)이 없음 — 장마다 하나 표시');
if (bigs.length > 2) W('meta', `결정적 순간이 ${bigs.length}개 (${bigs.join(', ')}) — 장마다 하나`);
const safeSpots = ids.filter(id => { const ch = N[id].choices || []; return ch.some(c => c.check) && ch.some(c => !c.check); }).length;
if (safeSpots + luckGives < 3) W('meta', `복이 쌓일 자리가 ${safeSpots + luckGives}곳뿐 — 셋 이상 권장`);
console.log(`${B.meta.title} · ${ids.length}쪽 · 닿는 쪽 ${seen.size} · 결정적 순간 ${bigs.length} · 복 자리 ${safeSpots + luckGives}`);
errors.forEach(e => console.log('오류 ' + e));
warns.forEach(w => console.log('주의 ' + w));
console.log(errors.length ? `통과 못 함: 오류 ${errors.length}개` : `통과 (주의 ${warns.length}개)`);
process.exit(errors.length ? 1 : 0);
