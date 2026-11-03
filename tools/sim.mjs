// 자동 시험 — node tools/sim.mjs <책> [<장 파일 이름>]
// 예: node tools/sim.mjs chicken chicken2  → 1장을 무작위로 끝까지 간 뒤 기록을 이어받아 2장을 시험한다.
import {readFileSync} from 'node:fs';
const book=process.argv[2]||'drift', target=process.argv[3]||book;
// 플레이 성향: random(기본) · reckless(운에 맡길 수 있으면 늘 맡김) · careful(다른 길이 있으면 늘 그쪽)
const policy=process.argv[4]||'random';
const dir=new URL('../docs/'+book+'/',import.meta.url).pathname;
const src=readFileSync(dir+'index.html','utf8').match(/<script>([\s\S]*)<\/script>/)[1];
const el=()=>({innerHTML:'',style:{},className:'',textContent:'',disabled:false,setAttribute(){},scrollIntoView(){},classList:{add(){},remove(){}}});
const app=el(); let clock=0; let store={};
const g={document:{documentElement:{dataset:{}},getElementById:id=>id==='app'?app:el(),querySelectorAll:()=>[]},window:{scrollTo(){}},
 matchMedia:()=>({matches:true}),performance:{now:()=>clock+=200},setTimeout:f=>f(),
 localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v},removeItem:k=>{delete store[k]}},
 fetch:async p=>({ok:true,json:async()=>JSON.parse(readFileSync(dir+p,'utf8'))})};
const run=new Function(...Object.keys(g),src+';return {get S(){return S},set S(v){S=v},get B(){return B},T:()=>T,begin,pick,roll,proceed,choicesOf,render,putMark,backToMark,paras,mods,helper,level,nextChapter,load,fresh};');
const E=run(...Object.values(g));
const tick=()=>new Promise(r=>setTimeout(r,20));
await tick();
const first=E.B; // 첫 장
const stats={games:0,ends:0,maxSteps:0,levels:{},lens:[],errs:0,hpEnd:[],noChoice:0,big:{n:0,bad:0,fumble:0},fortuneEnd:[]};

// 한 장을 무작위로 끝까지. stats에 기록할지 여부는 record.
function playChapter(record){
 const B=E.B; let steps=0;
 while(!B.nodes[E.S.node].end && steps<60){
  steps++; const ch=E.choicesOf(B.nodes[E.S.node]);
  if(!ch.length){stats.noChoice++; throw new Error('고를 수 있는 선택지가 없음: '+B.meta.id+' '+E.S.node+' flags='+Object.keys(E.S.flags))}
  let pool=ch.map((c,i)=>i);
  if(policy==='reckless'&&ch.some(c=>c.check))pool=pool.filter(i=>ch[i].check);
  if(policy==='careful'&&ch.some(c=>!c.check)&&ch.some(c=>c.check))pool=pool.filter(i=>!ch[i].check);
  // 결정적 순간에는 두 성향 모두 굴린다 (그 순간을 비교하려고)
  const bigI=ch.findIndex(c=>c.check&&c.check.big); if(bigI>=0)pool=[bigI];
  const i=pool[Math.floor(Math.random()*pool.length)], c=ch[i];
  if(record&&c.check){const {total}=E.mods(c.check.skill,c.check.dc); const lv=E.level(c.check.dc,total,E.helper(c.check.skill)); stats.levels[lv]=(stats.levels[lv]||0)+1;}
  E.pick(i);
  if(E.S.check){ if(Math.random()<.1&&E.S.luck>0)E.roll(true,false); else E.roll(false,false);
    if((E.S.check.roll.out==='fail')&&E.S.insp>0&&Math.random()<.5)E.roll(false,true);
    if(record&&c.check.big){stats.big.n++;const o=E.S.check.roll.out;if(o==='fail'||o==='fumble')stats.big.bad++;if(o==='fumble')stats.big.fumble++;}
    E.proceed(); }
  if(record)stats.lens.push(E.paras(B.nodes[E.S.node]).length);
  if(app.innerHTML.includes('undefined')) throw new Error('undefined in page '+E.S.node);
 }
 if(record){stats.fortuneEnd.push(E.S.fortune||0);stats.maxSteps=Math.max(stats.maxSteps,steps); if(B.nodes[E.S.node].end){stats.ends++;stats.hpEnd.push({...E.S.res,_flags:Object.keys(E.S.flags)})}}
}

for(let n=0;n<400;n++){
 try{
  store={};
  // 첫 장을 새로 편다
  await E.load('stories/'+book+'.json',{}); await tick();
  let B=E.B; const s=E.S;
  Object.assign(s,{screen:'traits',job:B.jobs[n%B.jobs.length].id,traits:[]});
  const T=E.T(); const ids=Object.keys(T).filter(()=>Math.random()<.35);
  let gw=0,bw=0; ids.forEach(i=>T[i].side==='good'?gw+=T[i].weight:bw+=T[i].weight);
  if(gw>bw) continue; s.traits=ids; E.begin();
  // 목표 장까지 앞 장들을 지나간다
  let hops=0;
  while(E.B.meta.id!==JSON.parse(readFileSync(dir+'stories/'+target+'.json','utf8')).meta.id){
   playChapter(false);
   if(!E.B.meta.next_file) throw new Error('다음 장이 없음: '+E.B.meta.id);
   E.nextChapter(); await tick(); if(++hops>10) throw new Error('장이 너무 많음');
  }
  stats.games++;
  playChapter(true);
 }catch(e){stats.errs++; if(stats.errs<4)console.log('ERR',e.message)}
}
const R=E.B.resources;
const pct=(a,b)=>b?Math.round(100*a/b)+'%':'-';
console.log({book:target,policy,bigMoment:{tries:stats.big.n,notOk:pct(stats.big.bad,stats.big.n),disaster:pct(stats.big.fumble,stats.big.n)},fortuneEndMedian:stats.fortuneEnd.sort((a,b)=>a-b)[stats.fortuneEnd.length>>1],games:stats.games,ends:stats.ends,errs:stats.errs,maxSteps:stats.maxSteps,levels:stats.levels,maxParas:Math.max(...stats.lens),
 endRes:Object.fromEntries(R.map(r=>{const v=stats.hpEnd.map(x=>x[r.id]).sort((a,b)=>a-b);return [r.id,{min:v[0],median:v[v.length>>1],max:v.at(-1)}]})),
 flagRate:Object.fromEntries([...new Set(stats.hpEnd.flatMap(x=>x._flags))].sort().map(f=>[f,Math.round(100*stats.hpEnd.filter(x=>x._flags.includes(f)).length/stats.hpEnd.length)+'%']))});
