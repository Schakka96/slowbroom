// Run the page's own /mopcheck self test from the command line.
// It exercises the real functions, not a copy of them: that a room code deals
// the same corridor everywhere, that a map made on one window's grid means the
// same on another's, and that merging two maps is a union.
const fs=require('fs');
eval(fs.readFileSync(__dirname+'/sweep.js','utf8').replace(/blocks\.forEach[\s\S]*$/, ''));
const page=fs.readFileSync('index.html','utf8');
page.match(/<script>([\s\S]*?)<\/script>/g).map(b=>b.slice(8,-9))
    .forEach((b,i)=>{ try{ eval(b); }catch(e){ console.log('THROW block '+i+': '+e.message); } });
if(!global.__mopSelfTest){ console.log('no self test on the page'); process.exit(1); }
const r=global.__mopSelfTest();
console.log(r.text);
setTimeout(()=>process.exit(r.failed?1:0), 300);
