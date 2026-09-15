// Draw a tool for a HUMAN to look at, not for an assertion.
//
// mopart.js can prove a handle is drawn after a head and reaches its centre,
// and still not notice that the thing looks like a hammer. This replays the
// recorded canvas calls into an SVG so the art can actually be seen — it
// exists because the handle was reviewed by reading the code, shipped, and
// turned out to read as a separate stick lying against the pad.
//
//   node tools/mopshot.js [classic|flat|squeegee] [out.svg]
const fs=require('fs');
const src=fs.readFileSync('index.html','utf8');
const blocks=src.match(/<script>([\s\S]*?)<\/script>/g).map(b=>b.slice(8,-9));

const W=420, H=260;
let out=[], st={fill:'#000', stroke:'#000', lw:1, alpha:1}, stack=[], tf=[1,0,0,1,0,0];
let path=[], clip=null, clipId=0;
const mul=(a,b)=>[a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1],
                  a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3],
                  a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]];
const M = () => `matrix(${tf.map(n=>+n.toFixed(4)).join(' ')})`;
// Gradients are back in the art, so the replay has to carry them or the mop
// comes out as flat black. Same rule as the clip: the stop coordinates are in
// the element's own space, so no transform on the gradient.
let gradId=0;
const col = c => {
  if(typeof c==='string') return c;
  if(c && c.__stops){
    const id='g'+(++gradId);
    out.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" `+
      `x1="${c.x1}" y1="${c.y1}" x2="${c.x2}" y2="${c.y2}">`+
      c.__stops.map(([o,k])=>`<stop offset="${o}" stop-color="${k}"/>`).join('')+
      `</linearGradient>`);
    return `url(#${id})`;
  }
  return '#000';
};
function emit(mode){
  if(!path.length) return;
  const d=path.join(' ');
  const a = mode==='fill'
    ? `fill="${col(st.fill)}" stroke="none"`
    : `fill="none" stroke="${col(st.stroke)}" stroke-width="${st.lw}" stroke-linejoin="round" stroke-linecap="round"`;
  out.push(`<path transform="${M()}" ${a} opacity="${st.alpha}"${clip?` clip-path="url(#${clip})"`:''} d="${d}"/>`);
}
function rr(x,y,w,h,r){
  r=Math.min(r===undefined?0:(typeof r==='number'?r:0), Math.abs(w)/2, Math.abs(h)/2);
  path.push(`M${x+r} ${y}`,`H${x+w-r}`,`A${r} ${r} 0 0 1 ${x+w} ${y+r}`,
            `V${y+h-r}`,`A${r} ${r} 0 0 1 ${x+w-r} ${y+h}`,
            `H${x+r}`,`A${r} ${r} 0 0 1 ${x} ${y+h-r}`,
            `V${y+r}`,`A${r} ${r} 0 0 1 ${x+r} ${y}`,'Z');
}
const ctx=new Proxy({},{
  get:(t,k)=>{
    if(k==='save')      return ()=>{ stack.push([{...st}, tf.slice(), clip]); };
    if(k==='restore')   return ()=>{ const s=stack.pop(); if(s){ st=s[0]; tf=s[1]; clip=s[2]; } };
    if(k==='translate') return (x,y)=>{ tf=mul(tf,[1,0,0,1,x,y]); };
    if(k==='rotate')    return a=>{ tf=mul(tf,[Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0]); };
    if(k==='scale')     return (x,y)=>{ tf=mul(tf,[x,0,0,y,0,0]); };
    if(k==='beginPath') return ()=>{ path=[]; };
    if(k==='closePath') return ()=>path.push('Z');
    if(k==='moveTo')    return (x,y)=>path.push(`M${x} ${y}`);
    if(k==='lineTo')    return (x,y)=>path.push(`L${x} ${y}`);
    if(k==='quadraticCurveTo') return (a,b,c,d)=>path.push(`Q${a} ${b} ${c} ${d}`);
    if(k==='roundRect') return rr;
    if(k==='rect')      return (x,y,w,h)=>rr(x,y,w,h,0);
    if(k==='arc')       return (x,y,r)=>path.push(`M${x-r} ${y}`,`a${r} ${r} 0 1 0 ${r*2} 0`,`a${r} ${r} 0 1 0 ${-r*2} 0`);
    if(k==='fill')      return ()=>emit('fill');
    if(k==='stroke')    return ()=>emit('stroke');
    if(k==='fillRect')  return (x,y,w,h)=>{ path=[]; rr(x,y,w,h,0); emit('fill'); };
    // No transform on the clip geometry. With userSpaceOnUse, SVG resolves a
    // clip in the user space of the element that references it — which
    // already includes that element's own transform. Repeating it here
    // transforms the region twice, it lands somewhere else entirely, and
    // every clipped thing silently disappears. That is what ate the strands.
    if(k==='clip')      return ()=>{ clip='c'+(++clipId);
      out.push(`<clipPath id="${clip}" clipPathUnits="userSpaceOnUse"><path d="${path.join(' ')}"/></clipPath>`); };
    if(k==='createLinearGradient') return (x1,y1,x2,y2)=>{
      const g={__stops:[],x1,y1,x2,y2,addColorStop(o,c){ g.__stops.push([o,c]); }};
      return g;
    };
    if(k==='createRadialGradient') return (x1,y1,r1,x2,y2,r2)=>{
      const g={__stops:[],x1:x2-r2,y1:y2,x2:x2+r2,y2:y2,addColorStop(o,c){ g.__stops.push([o,c]); }};
      return g;
    };
    if(k==='fillStyle')   return st.fill;
    if(k==='strokeStyle') return st.stroke;
    if(k==='lineWidth')   return st.lw;
    return ()=>{};
  },
  set:(t,k,v)=>{
    if(k==='fillStyle') st.fill=v;
    else if(k==='strokeStyle') st.stroke=v;
    else if(k==='lineWidth') st.lw=v;
    else if(k==='globalAlpha') st.alpha=v;
    return true;
  }
});

// ── the same DOM stub the other harnesses use ──
const ids=[...src.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
function el(id){ return { id,hidden:false,textContent:'',innerHTML:'',value:'50',className:'',
  style:{setProperty(){}},dataset:{},classList:{add(){},remove(){},toggle(){},contains:()=>false},
  children:[],max:'100',min:'0',width:800,height:500,
  addEventListener(){},append(){},appendChild(){},remove(){},focus(){},blur(){},
  querySelector:()=>el('x'),querySelectorAll:()=>[],closest:()=>null,setAttribute(){},getAttribute:()=>null,
  getBoundingClientRect:()=>({width:800,height:500,top:0,left:0}),
  getContext:()=>ctx,dispatchEvent(){},toDataURL:()=>'' }; }
const store={};
global.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]};
global.sessionStorage=global.localStorage;
global.performance={now:()=>Date.now()};
global.navigator={clipboard:{writeText:()=>Promise.resolve()}};
global.location={host:'x',pathname:'/',origin:'https://x',hash:''};
const made={};
global.document={ getElementById:id=>(ids.includes(id)||made[id])?(made[id]||=el(id)):null,
  createElement:()=>el('t'), addEventListener(){}, dispatchEvent(){},
  querySelector:()=>null, querySelectorAll:()=>[], body:el('body'), head:el('head'),
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

const which=(process.argv[2]||'all');
const file=process.argv[3]||'/private/tmp/mopshot.svg';
const WOOD={stick:'#7a5533', band:'#b08a55'};
const names = which==='all' ? global.__mopArt.list() : [which];
const panels=[];
names.forEach((n,i)=>{
  out=[]; stack=[]; tf=[1,0,0,1,0,0]; path=[]; clip=null;
  st={fill:'#000',stroke:'#000',lw:1,alpha:1};
  // heading 0 = pointing right, so the head stands upright and the handle
  // runs off to the right, which is how the screenshot was taken
  global.__mopArt.draw(n, W/2-40, H/2, 0, 110, WOOD);
  panels.push(`<g transform="translate(${i*W} 0)">`+
    `<rect width="${W}" height="${H}" fill="#cfa9b4"/>`+out.join('')+
    `<text x="12" y="24" font-family="sans-serif" font-size="15" fill="#2b2119">${n}</text></g>`);
});
fs.writeFileSync(file,
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W*names.length}" height="${H}" `+
  `viewBox="0 0 ${W*names.length} ${H}">${panels.join('')}</svg>`);
console.log('wrote '+file+'  ('+names.join(', ')+')');
