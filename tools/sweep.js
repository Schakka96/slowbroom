// Load every script block against the stub DOM; report anything that throws on load.
const fs=require('fs');
const src=fs.readFileSync('index.html','utf8');
const blocks=src.match(/<script>([\s\S]*?)<\/script>/g).map(b=>b.slice(8,-9));
const ids=[...src.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
function el(id){ const e={ id,hidden:false,textContent:'',innerHTML:'',value:'',className:'',title:'',type:'',
  style:{setProperty(){}},dataset:{},classList:{add(){},remove(){},toggle(){},contains:()=>false},
  children:[],max:'100',min:'0',width:800,height:500,
  addEventListener(){},append(){},appendChild(){},remove(){},focus(){},blur(){},
  querySelector(){return el('x');},querySelectorAll(){return [];},closest(){return null;},
  setAttribute(){},getAttribute(){return null;},
  getBoundingClientRect(){return {width:800,height:500,top:0,left:0};},
  getContext(){ return ctx2d; }, dispatchEvent(){}, toDataURL(){return '';} }; return e; }
const ctx2d=new Proxy({},{get:(t,k)=>{
  if(k==='canvas') return {width:800,height:500};
  if(k==='measureText') return ()=>({width:10});
  if(k==='createLinearGradient'||k==='createRadialGradient') return ()=>({addColorStop(){}});
  if(k==='createImageData'||k==='getImageData') return (w,h)=>({data:new Uint8ClampedArray(Math.max(4,(w|0)*(h|0)*4))});
  return ()=>{};
}});
const store={};
global.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]};
global.performance={now:()=>Date.now()};
global.navigator={clipboard:{writeText:()=>Promise.resolve()}};
global.location={host:'schakka96.github.io',pathname:'/slowbroom/',origin:'https://x',hash:''};
const made={};
global.document={ getElementById:id=>(ids.includes(id)||made[id])?(made[id]||=el(id)):null,
  createElement:t=>el(t), querySelectorAll:()=>[], querySelector:()=>null, addEventListener(){},
  body:el('body'), head:el('head'), dispatchEvent(){}, documentElement:Object.assign(el('html'),{style:{setProperty(){},removeProperty(){}},setAttribute(){},removeAttribute(){},getAttribute:()=>null}) };
global.window=global; global.addEventListener=()=>{}; global.removeEventListener=()=>{};
global.matchMedia=()=>({matches:false});
global.requestAnimationFrame=()=>{}; global.requestIdleCallback=f=>setTimeout(f,0);
global.atob=s=>Buffer.from(s,'base64').toString('binary');
global.btoa=s=>Buffer.from(s,'binary').toString('base64');
global.SLOWBROOM_CONFIG={url:'https://x.supabase.co',anonKey:'k'};
global.fetch=()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve([])});
global.AudioContext=function(){ return new Proxy({},{get:(t,k)=>{
  if(k==='currentTime') return 0; if(k==='sampleRate') return 44100; if(k==='state') return 'running';
  if(k==='destination') return {}; 
  return ()=>new Proxy({},{get:(t2,k2)=>k2==='gain'||k2==='frequency'||k2==='Q'
    ? {value:0,setTargetAtTime(){},setValueAtTime(){},exponentialRampToValueAtTime(){}}
    : (k2==='getChannelData'? ()=>new Float32Array(16) : ()=>{})});
}}); };
const names=['dev console','bloom/mop','ant','tabs? chat','nest wire','sound'];
blocks.forEach((b,i)=>{
  try{ eval(b); console.log('  ok    block '+i); }
  catch(e){ console.log('  THROW block '+i+': '+e.message); }
});
setTimeout(()=>process.exit(0), 500);
