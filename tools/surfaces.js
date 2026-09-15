// Build every surface, and run the ones with something living behind the glass.
// A surface that throws only when you walk into it is invisible until a player
// finds it, and a `swim` hook runs sixty times a second, so it is worth
// driving them all here rather than on someone's screen.
const fs=require('fs');
eval(fs.readFileSync(__dirname+'/sweep.js','utf8').replace(/blocks\.forEach[\s\S]*$/, ''));
const store={'slow-bloom':JSON.stringify({mode:'mop',cols:48,mopw:14,speed:1,hold:true})};
global.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]};
fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/g)
  .map(b=>b.slice(8,-9)).forEach((b,i)=>{ try{ eval(b); }catch(e){ console.log('THROW block '+i+': '+e.message); } });

const names=global.__mopCheat.names();
let bad=0, live=0;
console.log('— '+names.length+' surfaces —');
for(let i=0;i<names.length;i++){
  try{
    global.__mopCheat.surface(i+1);
    const d=global.__mopDiag();
    const got=(d.match(/you are in\s+room \d+ · surface (\d+) "([^"]+)"/)||[]);
    if(+got[1]!==i+1) throw new Error('landed on surface '+got[1]+' asking for '+(i+1));
    // run the live layer, if this one has one, for a few hundred frames
    const n=global.__mopLiveFrames? global.__mopLiveFrames(400) : 0;
    if(n) live++;
    console.log('  ok    '+String(i+1).padStart(2)+'  '+names[i]+(n?'   ('+n+' live frames)':''));
  }catch(e){
    bad++; console.log('  FAIL  '+String(i+1).padStart(2)+'  '+names[i]+' — '+e.message);
  }
}
console.log('\n'+(bad? bad+' failed' : 'all '+names.length+' build')+' · '+live+' have something swimming behind them');
process.exit(bad?1:0);
