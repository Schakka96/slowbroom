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
const T=global.__mopArt;
if(!T){ console.log('  FAIL  the mop block never exposed __mopArt'); process.exit(1); }

const WOOD={stick:'#4e3320', band:'#6f4d2f'};
function draw(name,x=200,y=150,a=0){
  calls=[];
  T.draw(name,x,y,a,80,WOOD);
  return calls.slice();
}
function shape(cs){
  const n={};
  cs.forEach(c=>{ const k=c.split('(')[0]; if(!k.includes('=')) n[k]=(n[k]||0)+1; });
  return n;
}
const NAMES=['classic','flat','squeegee'];
ok(T.list().join()===NAMES.join(), 'the mop, the flat pad and the squeegee', T.list().join(', '));
ok(!/data-tool=/.test(src), 'and no picker for them — the surface and the saved style decide');

const art={}, shapes={};
for(const n of NAMES){
  art[n]=draw(n); shapes[n]=shape(art[n]);
  ok(art[n].length>10, n+': draws something', art[n].length+' calls');
  ok((shapes[n].fill||0)>0 && (shapes[n].stroke||0)>0, n+': is filled AND outlined');
  ok(art[n].some(c=>c.includes(WOOD.stick)||c.includes(WOOD.band)),
     n+": carries the player's own broom wood");
  // the crayon treatment: a heavy ink line round every part
  const inks=art[n].filter(c=>c.toLowerCase().includes('#2b2119')).length;
  ok(inks>=3, n+': every part gets the ink line', inks+' ink passes');
  ok(!art[n].some(c=>c.startsWith('createLinearGradient')||c.startsWith('createRadialGradient')),
     n+': flat fills, no gradients left over from the old art');
  ok(art[n].some(c=>/^fillStyle=rgba\(43,33,25/.test(c)), n+': sits on a hard offset shadow');
}
for(const n of NAMES) ok(draw(n,200,150,0).join()!==draw(n,200,150,1.4).join(),
   n+': turns with the heading');
for(const n of NAMES) ok(draw(n).join()===draw(n).join(),
   n+': is steady frame to frame');
ok(shape(draw('classic')).roundRect!==shape(draw('squeegee')).roundRect ||
   draw('classic').join()!==draw('squeegee').join(),
   'the three are still different shapes from each other');

// ── the handle has to come out of the MIDDLE of the head ──
// Drawn underneath, the handle vanished behind the head and read as a
// separate stick butted against its edge. Two things fix it and both have to
// hold: the handle is drawn AFTER the head, and it reaches the head's centre.
for(const n of ['classic','flat','squeegee']){
  const boxes=draw(n).map((c,i)=>({i,m:/^roundRect\((-?[\d.]+),(-?[\d.]+),([\d.]+),([\d.]+)/.exec(c)}))
                     .filter(o=>o.m)
                     .map(o=>({i:o.i, x:+o.m[1], y:+o.m[2], w:+o.m[3], h:+o.m[4]}));
  // the head is the widest thing; the handle is the longest thin one
  const head=boxes.reduce((a,b)=>b.w>a.w?b:a);
  const handle=boxes.filter(b=>b!==head && b.h>b.w*2).reduce((a,b)=>b.h>a.h?b:a);
  ok(handle.i>head.i, n+': the handle is drawn over the head, not under it');
  ok(handle.y+handle.h >= head.y+head.h/2 - 0.5,
     n+': and reaches the middle of it', 'handle ends '+(handle.y+handle.h).toFixed(1)+
     ', head centre '+(head.y+head.h/2).toFixed(1));
}

// ── the doors ──
console.log('');
ok(/Math\.min\(H\*\.24, cell\*6\.5\)/.test(src), 'the mopping doorway is smaller than it was');
ok(/Math\.max\(26, body\*1\.15\)/.test(src), 'and so is the ant nest');
const doorway=(src.match(/function drawDoorway[\s\S]*?\n  \}/)||[''])[0];
ok(/strokeStyle=INK/.test(doorway) && /roundRect/.test(doorway),
   'the doorway is drawn in ink, flat, like the rest of the page');
ok(!/createRadialGradient/.test((src.match(/function drawDoor\(c,t\)[\s\S]*?\n  \}/)||[''])[0]),
   'the nest mound lost its soft radial haze');
ok(/strokeStyle=INK_A/.test(src), 'and the ant side has its own copy of the ink colour');

// ── the masthead ──
ok(src.indexOf('class="blurb"') > src.indexOf('</header>'),
   'the blurb sits below the masthead, not beside the title');
ok(src.indexOf('class="blurb"') < src.indexOf('id="pickgame"'),
   'and shares the band with the game selector');
ok(/\.midbar\{[\s\S]*?grid-template-columns:minmax\(0,1fr\) auto minmax\(0,1fr\)/.test(
     (src.match(/<style>[\s\S]*?<\/style>/g)||[]).sort((a,b)=>b.length-a.length)[0]||''),
   'three columns, so the games stay centred with text beside them');

console.log(bad? '\n'+bad+' failed' : '\nall good');
process.exit(bad?1:0);
