// 여러 인생 자동 시험 — node tools/lives.mjs <책> [<인생 수=5>] [<사람 수=300>] [random|curious]
// curious: 갈림길에선 지난 인생에 덜 간 쪽, 지난 인생을 기억해서 새로 생긴 선택지가 있으면 그쪽 (보통 사람의 다시 읽기)
// 한 기기(같은 저장소)에서 한 사람이 책을 처음부터 끝까지 여러 번 산다. 매 인생은 무작위로 고른다.
// 보는 것: 막히는 곳·오류, 인생이 한 번에 하나씩만 세어지는지, 다시 살 때 빛나는 말이 몇 번 보이는지,
//          지난 인생을 기억해서 열리는 쪽(지름길)이 열리는지, 진짜 끝(true_end 깃발)에 몇 번째 인생에 닿는지.
import { readFileSync } from 'node:fs';
const book = process.argv[2] || 'drift', LIVES = +(process.argv[3] || 5), PEOPLE = +(process.argv[4] || 300), POLICY = process.argv[5] || 'random';
let taken = {};
const dir = new URL('../docs/' + book + '/', import.meta.url).pathname;
const src = readFileSync(dir + 'index.html', 'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
const el = () => ({ innerHTML: '', style: {}, className: '', textContent: '', disabled: false, setAttribute() {}, scrollIntoView() {}, classList: { add() {}, remove() {} } });
const app = el(); let clock = 0; let store = {};
const g = { document: { documentElement: { dataset: {} }, getElementById: id => id === 'app' ? app : el(), querySelectorAll: () => [] }, window: { scrollTo() {} },
  matchMedia: () => ({ matches: true }), performance: { now: () => clock += 200 }, setTimeout: f => f(), clearTimeout() {},
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v }, removeItem: k => { delete store[k] } },
  fetch: async p => ({ ok: true, json: async () => JSON.parse(readFileSync(dir + p, 'utf8')) }) };
const run = new Function(...Object.keys(g), src + ';return {get S(){return S},set S(v){S=v},get B(){return B},T:()=>T,begin,pick,roll,proceed,choicesOf,nextChapter,load,lives};');
const E = run(...Object.values(g));
const tick = () => new Promise(r => setTimeout(r, 5));
await tick();

const firstFile = E.B.meta.first_file || 'stories/' + book + '.json';
const MEMO_NODES = ['w90', 'f93', 'n290'];           // 기억으로만 닿는 쪽
const st = { pages: 0, imgs: 0, people: 0, errs: 0, trueAt: {}, never: 0, countBad: 0, glowByLife: {}, memoNodes: {}, forkSides: {} };

async function liveOnce(lifeNo) {
  await E.load(firstFile, {}); await tick();
  const B = E.B, s = E.S, T = E.T();
  s.screen = 'traits'; s.job = B.jobs[Math.floor(Math.random() * B.jobs.length)].id; s.traits = [];
  const ids = Object.keys(T).filter(() => Math.random() < .3); let gw = 0, bw = 0;
  ids.forEach(i => T[i].side === 'good' ? gw += T[i].weight : bw += T[i].weight);
  if (gw <= bw) s.traits = ids;
  E.begin();
  let glow = 0, hops = 0;
  for (;;) {
    let steps = 0;
    while (!E.B.nodes[E.S.node].end && steps++ < 80) {
      glow += (app.innerHTML.match(/class="mem(?! seen)/g) || []).length;
      const node = E.B.nodes[E.S.node], ch = E.choicesOf(node);
      if (!ch.length) throw new Error('선택지 없음 ' + E.B.meta.id + ' ' + E.S.node);
      let i = Math.floor(Math.random() * ch.length);
      if (POLICY === 'curious') {
        const fresh = ch.findIndex(c => /lived:|lives:/.test(JSON.stringify(c.if || '')));
        if (fresh >= 0) i = fresh;
        else if (node.fork) { const k = j => (taken[node.fork + j] || 0); i = ch.map((_, j) => j).sort((a, b) => k(a) - k(b) || Math.random() - .5)[0]; }
      }
      if (node.fork) taken[node.fork + i] = (taken[node.fork + i] || 0) + 1;
      if (node.fork) { const k = node.fork + ' → ' + (ch[i].life || ch[i].label); st.forkSides[k] = (st.forkSides[k] || 0) + 1; }
      E.pick(i);
      if (E.S.check) { E.roll(false, false); E.proceed(); }
      st.pages++; if (E.B.nodes[E.S.node].img) st.imgs++;
      if (MEMO_NODES.includes(E.S.node)) st.memoNodes[E.S.node] = (st.memoNodes[E.S.node] || 0) + 1;
      if (app.innerHTML.includes('undefined')) throw new Error('undefined ' + E.S.node);
    }
    if (!E.B.nodes[E.S.node].end) throw new Error('끝에 닿지 못함 ' + E.B.meta.id);
    if (!E.B.meta.next_file) break;
    E.nextChapter(); await tick(); if (++hops > 10) throw new Error('장이 너무 많음');
  }
  st.glowByLife[lifeNo] = (st.glowByLife[lifeNo] || 0) + glow;
  return !!E.S.flags.true_end;
}

for (let p = 0; p < PEOPLE; p++) {
  store = {}; taken = {}; st.people++;
  try {
    let got = 0;
    for (let L = 1; L <= LIVES; L++) {
      const t = await liveOnce(L);
      if (E.lives().length !== L) st.countBad++;               // 인생은 한 번에 하나씩만 세어져야 한다
      if (t && !got) { got = L; st.trueAt[L] = (st.trueAt[L] || 0) + 1; }
    }
    if (!got) st.never++;
  } catch (e) { st.errs++; if (st.errs < 4) console.log('ERR', e.message); }
}
const pct = (a) => Math.round(100 * a / st.people) + '%';
let cum = 0;
console.log({
  book, policy: POLICY, people: st.people, livesEach: LIVES, errs: st.errs, lifeCountWrong: st.countBad,
  trueEndBy: Object.fromEntries(Array.from({ length: LIVES }, (_, k) => k + 1).map(L => [L + '번째까지', pct(cum += (st.trueAt[L] || 0))])),
  neverTrueEnd: pct(st.never),
  pagesPerPicture: +(st.pages / Math.max(1, st.imgs)).toFixed(1),
  glowPerPerson: Object.fromEntries(Object.entries(st.glowByLife).map(([k, v]) => [k + '번째 인생', +(v / st.people).toFixed(1)])),
  memoryPagesReached: st.memoNodes, forkSides: st.forkSides
});
