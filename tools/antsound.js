// Every sound the ant makes, played into a recording AudioContext instead of
// a speaker: does it fire at all, is it quiet, and does it actually vary?
// A plop that is always the same plop is the bug this catches — the shuffle
// bag is the only thing standing between eight sounds and one.
const fs=require('fs');
const src=fs.readFileSync('index.html','utf8');
const blocks=src.match(/<script>([\s\S]*?)<\/script>/g).map(b=>b.slice(8,-9));
const sound=blocks.find(b=>b.includes('window.__sfx='));
if(!sound){ console.log('  THROW  no sound block in index.html'); process.exit(1); }

// ── a context that writes down what was asked of it ──
let now=0;
// Every node built since the last play(), in order. It has to be every node:
// the first version of this probe only kept things that were start()ed, which
// means it never saw a filter — and a rustle IS its filter. It reported grass
// as a 100 Hz knock and could only tell four of the six apart.
let built=[];
function node(kind){
  const rec={kind, f:[], g:[], type:null, Q:null, started:null, dur:null};
  const param=(bucket)=>({
    set value(v){ bucket.push(v); }, get value(){ return bucket[bucket.length-1]||0; },
    setValueAtTime:(v)=>bucket.push(v),
    exponentialRampToValueAtTime:(v)=>bucket.push(v),
    linearRampToValueAtTime:(v)=>bucket.push(v),
    setTargetAtTime:(v)=>bucket.push(v)
  });
  return new Proxy(rec,{get(t,k){
    if(k==='frequency') return param(t.f);
    if(k==='gain') return param(t.g);
    if(k==='Q') return {set value(v){t.Q=v;}, get value(){return t.Q;},
                        setValueAtTime(v){t.Q=v;}, setTargetAtTime(v){t.Q=v;}};
    if(k==='connect'||k==='disconnect') return ()=>{};
    if(k==='start') return (at)=>{ t.started=at; };
    if(k==='stop')  return (at)=>{ t.dur=(at||0)-(t.started||0); };
    if(k==='buffer') return t.buffer;
    return t[k];
  }, set(t,k,v){ t[k]=v; return true; }});
}
const keep=n=>{ built.push(n); return n; };
global.AudioContext=function(){
  return {
    get currentTime(){ return now; }, sampleRate:44100, state:'running',
    destination:{}, resume(){},
    createGain:()=>keep(node('gain')),
    createOscillator:()=>keep(node('osc')),
    createBufferSource:()=>keep(node('noise')),
    createBiquadFilter:()=>keep(node('filter')),
    createBuffer:(ch,n)=>({getChannelData:()=>new Float32Array(n)})
  };
};
const store={};
global.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v)};
global.window=global; global.addEventListener=()=>{};
global.setInterval=()=>0;                     // no weather modulator in a test
eval(sound);

const sfx=global.__sfx;
let bad=0;
const ok=(pass,label,note)=>{ console.log((pass?'  ok    ':'  FAIL  ')+label+(note?'  — '+note:'')); if(!pass) bad++; };
ok(typeof sfx.plop==='function' && typeof sfx.place==='function' && typeof sfx.whoosh==='function',
   'the ant has plop, place and whoosh');
sfx.toggle(true);

// Play one sound in isolation and hand back the voices it made.
function play(fn){
  built=[];
  now+=1;                                     // past every queued lane slot
  fn();
  return built.map(v=>({kind:v.kind, f:v.f.slice(), Q:v.Q,
                        peak:v.g.length?Math.max(...v.g):0, dur:v.dur, started:v.started}));
}
// The signature of a sound: what it did to pitch, rounded so jitter does not
// count as a different sound.
const sig=vs=>vs.map(v=>v.kind+':'+v.f.map(x=>Math.round(x/25)).join('/')+
                       (v.dur?'@'+Math.round(v.dur*200):'')).join(' | ');

// ── picking up ───────────────────────────────────────────────────
const plops=[]; for(let i=0;i<40;i++) plops.push(play(sfx.plop));
ok(plops.every(v=>v.length>0), 'every plop makes a sound');
const plopSigs=new Set(plops.map(sig));
ok(plopSigs.size>=8, 'there are eight different plops', plopSigs.size+' distinct');
let repeat=0;
for(let i=1;i<plops.length;i++) if(sig(plops[i])===sig(plops[i-1])) repeat++;
ok(repeat===0, 'and the same one never lands twice in a row', repeat+' repeats');
const loudestPlop=Math.max(...plops.flat().map(v=>v.peak));
ok(loudestPlop<.06, 'a plop stays tiny', 'loudest '+loudestPlop.toFixed(3));

// ── setting down, floor by floor ─────────────────────────────────
const WANT={wood:3, stone:3, water:3, nature:6};
const shapes={};
for(const [surface,n] of Object.entries(WANT)){
  const got=[]; for(let i=0;i<n*6;i++) got.push(play(()=>sfx.place(surface)));
  ok(got.every(v=>v.length>0), surface+': every placing makes a sound');
  const s=new Set(got.map(sig));
  ok(s.size>=n, surface+': '+n+' different landings', s.size+' distinct');
  const loud=Math.max(...got.flat().map(v=>v.peak));
  ok(loud<.09, surface+': quiet enough to sit under the weather', 'loudest '+loud.toFixed(3));
  shapes[surface]=got;
}
// a floor you cannot hear the difference of is four floors with one sound
const mid=o=>{ const f=o.flat().flatMap(v=>v.f).filter(x=>x>0);
               return f.reduce((a,b)=>a+b,0)/Math.max(1,f.length); };
// where the audible energy sits: the rustle, not the thump under it
const bright=o=>{ const f=o.flat().filter(v=>v.kind==='filter').flatMap(v=>v.f).filter(x=>x>0);
                  return f.reduce((a,b)=>a+b,0)/Math.max(1,f.length); };
const tones=Object.fromEntries(Object.entries(shapes).map(([k,v])=>[k,mid(v)]));
const airs=Object.fromEntries(Object.entries(shapes).map(([k,v])=>[k,bright(v)]));
ok(airs.stone>airs.wood*1.5, 'stone is brighter than wood',
   Math.round(airs.wood)+' Hz vs '+Math.round(airs.stone)+' Hz');
const body=o=>{ const f=o.flat().filter(v=>v.kind==='osc').flatMap(v=>v.f).filter(x=>x>0);
                return f.reduce((a,b)=>a+b,0)/Math.max(1,f.length); };
ok(body(shapes.nature) < body(shapes.wood) && bright(shapes.nature) > 900,
   'grass is a rustle, not a knock',
   Math.round(body(shapes.nature))+' Hz of body under '+Math.round(bright(shapes.nature))+' Hz of air');
const rises=shapes.water.filter(vs=>vs.some(v=>v.kind==='osc' && v.f[v.f.length-1]>v.f[0])).length;
void tones;
ok(rises===shapes.water.length, 'water rises in pitch as it closes over',
   rises+'/'+shapes.water.length);
const unknown=play(()=>sfx.place('linoleum'));
ok(unknown.length>0, 'an unmapped floor still makes a sound rather than nothing');

// ── blowing ──────────────────────────────────────────────────────
const blows=[]; for(let i=0;i<6;i++) blows.push(play(sfx.whoosh));
ok(blows.every(v=>v.length>0), 'blowing makes a sound');
const wd=blows.flat().map(v=>v.dur).filter(Boolean);
ok(Math.min(...wd)>.3 && Math.max(...wd)<.6, 'and it is a whoosh, not a click',
   Math.min(...wd).toFixed(2)+'–'+Math.max(...wd).toFixed(2)+' s');
ok(Math.max(...blows.flat().map(v=>v.peak))<.1, 'a soft one', 
   Math.max(...blows.flat().map(v=>v.peak)).toFixed(3));

// ── a handful at once must not become one loud click ─────────────
built=[]; now+=1;
for(let i=0;i<60;i++) sfx.plop();
const at=built.map(v=>v.started).filter(t=>t!=null).sort((a,b)=>a-b);
const gaps=at.slice(1).map((t,i)=>t-at[i]).filter(g=>g>0);
ok(at.length>0 && at[at.length-1]-at[0] > .05,
   'sixty things picked up in one frame are spread out, not stacked',
   (at[at.length-1]-at[0]).toFixed(2)+' s of plops from 60 calls');
ok(at[at.length-1]-at[0] < .45, 'but never trail so far behind that they stop matching',
   'queue capped at '+(at[at.length-1]-at[0]).toFixed(2)+' s');

// ── the mute switch has to reach these too ───────────────────────
sfx.toggle(false);
ok(play(sfx.plop).length===0 && play(()=>sfx.place('wood')).length===0 && play(sfx.whoosh).length===0,
   'sound off means silence, not a muted node still being built');
sfx.toggle(true);

console.log(bad? '\n'+bad+' failed' : '\nall good');
process.exit(bad?1:0);
