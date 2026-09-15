// The three tools, drawn into a recording 2D context instead of onto a screen.
//
// A drawing bug is not a crash: a tool that draws nothing, or draws the same
// silhouette as its neighbour, loads perfectly and just looks wrong. So this
// records every canvas call each tool makes and asks the questions a glance
// would: is there anything there, is it a different SHAPE from the other two,
// does it carry the player's own colour, and do the two that are supposed to
// move actually move — the roller with distance, the tuft with time.
const fs=require('fs');
const src=fs.readFileSync('index.html','utf8');
const blocks=src.match(/<script>([\s\S]*?)<\/script>/g).map(b=>b.slice(8,-9));

let calls=[];
const rec=(name)=>(...a)=>{ calls.push(name+'('+a.map(v=>
  typeof v==='number'? Math.round(v*100)/100 : v).join(',')+')'); };
function makeCtx(){
  const c={_fill:'',_stroke:'',_lw:0};
  ['save','restore','translate','rotate','beginPath','moveTo','lineTo','arc',
   'arcTo','quadraticCurveTo','bezierCurveTo','closePath','roundRect','rect',
   'fill','stroke','clip','fillRect','strokeRect','ellipse','setTransform',
   'drawImage','clearRect','fillText','strokeText','scale'].forEach(k=>c[k]=rec(k));
  ['createLinearGradient','createRadialGradient'].forEach(k=>
    c[k]=()=>({addColorStop(){}}));
  c.measureText=()=>({width:10});
  c.getImageData=(x,y,w,h)=>({data:new Uint8ClampedArray(Math.max(4,(w|0)*(h|0)*4))});
  c.createImageData=c.getImageData;
  return new Proxy(c,{
    get:(t,k)=>t[k],
    set:(t,k,v)=>{ t[k]=v; calls.push(String(k)+'='+v); return true; }
  });
}

// ── a DOM stub just rich enough to load the page's scripts ──
const ids=[...src.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const seg=[...src.matchAll(/data-tool="(\w+)"/g)].map(m=>m[1]);
const ctx2d=makeCtx();
function el(id){ return { id,hidden:false,textContent:'',innerHTML:'',value:'50',className:'',
  style:{setProperty(){}},dataset:{},classList:{add(){},remove(){},toggle(){},contains:()=>false},
  children:[],max:'100',min:'0',width:800,height:500,
  addEventListener(){},append(){},appendChild(){},remove(){},focus(){},blur(){},
  querySelector:()=>el('x'),querySelectorAll:()=>[],closest:()=>null,
  setAttribute(){},getAttribute:()=>null,
  getBoundingClientRect:()=>({width:800,height:500,top:0,left:0}),
  getContext:()=>ctx2d,dispatchEvent(){},toDataURL:()=>'' }; }
const store={};
global.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]};
global.sessionStorage=global.localStorage;
global.performance={now:()=>Date.now()};
global.navigator={clipboard:{writeText:()=>Promise.resolve()}};
global.location={host:'x',pathname:'/',origin:'https://x',hash:''};
const made={};
global.document={ getElementById:id=>(ids.includes(id)||made[id])?(made[id]||=el(id)):null,
  createElement:()=>el('t'), addEventListener(){}, dispatchEvent(){},
  querySelector:()=>null,
  querySelectorAll:sel=>{
    const m=/data-tool/.test(sel) ? seg.map(t=>Object.assign(el('b'),{dataset:{tool:t}})) : [];
    return m;
  },
  body:el('body'), head:el('head'),
  documentElement:Object.assign(el('html'),{style:{setProperty(){},removeProperty(){}},
    setAttribute(){},removeAttribute(){},getAttribute:()=>null}) };
global.window=global; global.addEventListener=()=>{}; global.removeEventListener=()=>{};
global.matchMedia=()=>({matches:false,addEventListener(){}});
global.requestAnimationFrame=()=>{}; global.requestIdleCallback=f=>setTimeout(f,0);
global.setInterval=()=>0;
global.atob=s=>Buffer.from(s,'base64').toString('binary');
global.btoa=s=>Buffer.from(s,'binary').toString('base64');
global.fetch=()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve([])});
global.AudioContext=function(){ return new Proxy({},{get:()=>()=>({})}); };
blocks.forEach(b=>{ try{ eval(b); }catch(e){} });

let bad=0;
const ok=(pass,label,note)=>{ console.log((pass?'  ok    ':'  FAIL  ')+label+(note?'  — '+note:'')); if(!pass) bad++; };
const T=global.__mopTool;
if(!T){ console.log('  FAIL  the mop block never exposed __mopTool'); process.exit(1); }

const WOOD={stick:'#4e3320', band:'#6f4d2f'};
function draw(name,x=200,y=150,a=0){
  calls=[];
  T.draw(name,ctx2d,x,y,a,80,WOOD);
  return calls.slice();
}
// what SHAPE a tool is: which primitives it uses and how many of each
function shape(cs){
  const n={};
  cs.forEach(c=>{ const k=c.split('(')[0]; if(!k.includes('=')) n[k]=(n[k]||0)+1; });
  return n;
}
const NAMES=T.list();
ok(NAMES.length===3 && NAMES.join()==='chalk,clay,moss', 'three tools', NAMES.join(', '));
ok(seg.length===3 && seg.join()===NAMES.join(), 'and three buttons that match them', seg.join(', '));

const art={}, shapes={};
for(const n of NAMES){
  art[n]=draw(n); shapes[n]=shape(art[n]);
  ok(art[n].length>10, n+': actually draws something', art[n].length+' calls');
  ok((shapes[n].fill||0)>0, n+': has a filled body');
  ok(art[n].some(c=>c.includes(WOOD.stick)||c.includes(WOOD.band)),
     n+': carries the player\'s own broom colour');
  ok(art[n].some(c=>c.toLowerCase().includes('#2b2119')), n+': is drawn in ink');
}
// ── the point of the exercise: three different shape languages ──
const prim=n=>Object.keys(shapes[n]).filter(k=>
  ['roundRect','arc','lineTo','quadraticCurveTo','rect','ellipse'].includes(k)).sort().join('+');
ok(prim('chalk')!==prim('clay') && prim('clay')!==prim('moss') && prim('chalk')!==prim('moss'),
   'no two are built from the same primitives');
console.log('        chalk: '+prim('chalk')+'\n        clay:  '+prim('clay')+'\n        moss:  '+prim('moss'));
ok(!shapes.moss.roundRect && !shapes.moss.lineTo,
   'moss has no straight line and no box in it');
ok(!shapes.chalk.arc && !shapes.chalk.roundRect && (shapes.chalk.lineTo||0)>=12,
   'chalk is a polygon — no curve anywhere in it', 'lineTo×'+shapes.chalk.lineTo);
ok((shapes.clay.arc||0)>=2 && (shapes.clay.lineTo||0)>=8,
   'clay has end caps and a fork', 'arc×'+shapes.clay.arc+' lineTo×'+shapes.clay.lineTo);

// ── the two that move ──
const a1=draw('clay',200,150), a2=draw('clay',237,150);      // same heading, moved along
ok(a1.join()!==a2.join(), 'the roller rolls when the tool travels');
const still1=draw('clay',200,150), still2=draw('clay',200,150);
ok(still1.join()===still2.join(), 'and never rolls on the spot');
const m1=draw('moss'); const m2=(()=>{ const real=Date.now; Date.now=()=>real()+700;
  const r=draw('moss'); Date.now=real; return r; })();
ok(m1.join()!==m2.join(), 'the tuft sways over time');
const c1=draw('chalk'), c2=draw('chalk');
ok(c1.join()===c2.join(), 'chalk is steady — nothing about it boils frame to frame');

// ── turning ──
for(const n of NAMES) ok(draw(n,200,150,0).join()!==draw(n,200,150,1.4).join(),
   n+': turns with the heading');

// ── the switch ──
ok(T.set('moss')==='moss' && T.get()==='moss', 'the buttons can change the tool');
ok(T.set('nonsense')==='moss', 'and nonsense leaves it alone');
T.set('chalk');
ok(/tool:'chalk'/.test(src), 'chalk is the one a new player gets');
ok(/if\(TOOLS\[o\.tool\]\) S\.tool=o\.tool/.test(src), 'and the choice is remembered');

console.log(bad? '\n'+bad+' failed' : '\nall good');
process.exit(bad?1:0);
