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
  // Record the gradients and their stops. Without this the restored art looks
  // gradient-free AND colourless: the flat pad puts the player's broom wood
  // ONLY into a gradient's colour stops, so throwing the stops away hid it.
  ['createLinearGradient','createRadialGradient'].forEach(k=>
    c[k]=(...a)=>{ calls.push(k+'('+a.map(v=>Math.round(v*100)/100).join(',')+')');
                   return {addColorStop:(o,col)=>calls.push('stop('+o+','+col+')')}; });
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
  ok((shapes[n].fill||0)>0, n+': has a filled body');
  // The squeegee never took the player's wood — its grip is a fixed brown in
  // the original art too. Only the two mops carry it.
  if(n!=='squeegee') ok(art[n].some(c=>c.includes(WOOD.stick)||c.includes(WOOD.band)),
     n+": carries the player's own broom wood");
  // This is the ORIGINAL art, restored. The gradients are the point of it —
  // their absence is what the crayon version looked like, and she did not
  // want that. So their presence is the check.
  ok((shapes[n].createLinearGradient||0)>0,
     n+': is the original gradient art, not the flat crayon one',
     (shapes[n].createLinearGradient||0)+' gradients');
  ok(!art[n].some(c=>c.toLowerCase().includes('#2b2119')),
     n+': carries no ink outline — that stayed on the doorways only');
}
for(const n of NAMES) ok(draw(n,200,150,0).join()!==draw(n,200,150,1.4).join(),
   n+': turns with the heading');
for(const n of NAMES) ok(draw(n).join()===draw(n).join(),
   n+': is steady frame to frame');
ok(draw('classic').join()!==draw('flat').join() &&
   draw('flat').join()!==draw('squeegee').join(),
   'the three are different from each other');
// the string mop's stick starts at the head's centre, as it always did
ok(draw('classic').some(c=>c==='moveTo(0,0)'),
   'the string mop\'s stick starts at the middle of the head');

// ── the ant nest ──
// It was an ellipse with a 2px ink line round it and forty flecks inside,
// redrawn every frame. Every one of those is now wrong on purpose.
ok(/function buildNest\(\)/.test(src) && /nestKey===key/.test(src),
   'the nest is built once into a layer, not redrawn every frame');
const nestFn=(src.match(/function buildNest\(\)[\s\S]*?\n  \}/)||[''])[0];
ok(/withSeed\(/.test(nestFn), 'and seeded, so the grains do not boil');
ok(!/INK_A/.test((src.match(/function drawDoor\(c,t\)[\s\S]*?\n  \}/)||[''])[0]),
   'the ink outline is gone from it');
ok(/nestRag/.test(nestFn), 'the outline is ragged, not an ellipse');
ok(/cx=W\+w\*\.45/.test(nestFn),
   'its middle is off the screen, so the canvas does the cutting');
const grains=(nestFn.match(/i<(\d{3,4});i\+\+/g)||[]).map(m=>+m.match(/\d+/)[0]);
ok(Math.max(...grains)>=2000, 'and there are thousands of grains in it',
   grains.sort((a,b)=>b-a).slice(0,3).join(', '));
ok(/const nestCx =/.test(src) && /Math\.hypot\(x-nestCx\(\), y-nestCy\(\)\)/.test(src),
   'the hole you see is the hole the rules use');
ok(/ant\.x > nestCx\(\)/.test(src), 'and the one the ant walks into');

// ── the doors ──
console.log('');
ok(/Math\.min\(H\*\.24, cell\*6\.5\)/.test(src), 'the mopping doorway is smaller than it was');
ok(/Math\.max\(26, body\*1\.15\)/.test(src), 'and so is the ant nest');
const doorway=(src.match(/function drawDoorway[\s\S]*?\n  \}/)||[''])[0];
ok(/strokeStyle=INK/.test(doorway) && /roundRect/.test(doorway),
   'the doorway is drawn in ink, flat, like the rest of the page');
ok(/strokeStyle=INK_A/.test(src), 'the grand arch keeps the ink line');

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
