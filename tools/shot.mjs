// 화면 확인 — node tools/shot.mjs <책>
// 폰 폭(400px)으로 표지와 장마다 첫 쪽, 첫 주사위 쪽을 찍어 shots/<책>/ 에 둔다. 찍은 뒤 눈으로 본다.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // 이 작업 공간에는 전역으로 깔려 있다
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
const book = process.argv[2] || 'drift';
const root = new URL('../docs/', import.meta.url).pathname;
const out = new URL('../shots/' + book + '/', import.meta.url).pathname; mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp' };
const srv = createServer((q, r) => { const p = join(root, decodeURIComponent(q.url.split('?')[0])); if (!existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' }); r.end(readFileSync(p)); }).listen(0);
const port = srv.address().port, url = `http://localhost:${port}/${book}/index.html`;
const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 400, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const shoot = async (name) => { await page.waitForTimeout(700); await page.screenshot({ path: out + name + '.png', fullPage: true }); console.log('찍음', name); };
await page.goto(url); await page.waitForSelector('.book'); await shoot('00-book'); // 덮인 책
await page.evaluate(() => { opened = true; render(); }); await shoot('00-cover');
const chapters = readdirSync(join(root, book, 'stories')).filter(f => f.endsWith('.json')).sort();
for (const f of chapters) {
  const B = JSON.parse(readFileSync(join(root, book, 'stories', f), 'utf8'));
  const firstRoll = Object.entries(B.nodes).find(([, n]) => (n.choices || []).some(c => c.check));
  for (const [tag, node] of [['first', B.meta.start], ['roll', firstRoll && firstRoll[0]]]) {
    if (!node) continue;
    const res = {}, max = {}; B.resources.forEach(r => { res[r.id] = r.start; if (r.max != null) max[r.id] = r.max; });
    const S = { screen: 'play', job: B.jobs[0].id, traits: [], res, max, insp: 0, luck: 1, marks: 2, items: [], comp: [], flags: {}, crits: [], node, check: null, rolls: [], delta: [], when: null, fortune: 1, streak: 0 };
    await page.evaluate(([f, S, meta]) => {
      localStorage.setItem('gamebook-tip-mark', '1');
      localStorage.setItem('gamebook-current:' + (meta.series || meta.id.replace(/-\d+$/, '')), 'stories/' + f);
      localStorage.setItem('gamebook:' + meta.id, JSON.stringify({ S, markSnap: null }));
    }, [f, S, B.meta]);
    await page.goto(url); await page.waitForFunction(() => typeof B !== 'undefined' && B && B.meta);
    await page.evaluate(() => { opened = true; resume(); render(); });
    await shoot(`${f.replace('.json', '')}-${tag}`);
  }
}
await browser.close(); srv.close();
