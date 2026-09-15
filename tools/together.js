// Two browsers, two window shapes, one corridor.
//
// This stands in for the test that otherwise needs a second person and a
// second laptop: it loads the real page twice in isolated contexts, wires
// their co-op channels to each other and to a pretend database, and checks
// that work done in one shows up in the other — including when they are
// standing in different rooms.
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('index.html','utf8');
const blocks=src.match(/<script>([\s\S]*?)<\/script>/g).map(b=>b.slice(8,-9));
const ids=[...src.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);

// ── the pretend database: one table, keyed like the real one ──────────
const table=new Map();
let reads=0, writes=0;
function db(url, opts){
  opts=opts||{};
  const q=url.split('/rest/v1/')[1]||'';
  if((opts.method||'GET')==='GET'){
    reads++;
    const w=(q.match(/world=eq\.([^&]+)/)||[])[1], r=(q.match(/room=eq\.(\d+)/)||[])[1];
    const row=table.get(w+'/'+r);
    return Promise.resolve({ok:true, status:200, json:()=>Promise.resolve(row?[row]:[])});
  }
  writes++;
  const row=JSON.parse(opts.body);
  const key=row.world+'/'+row.room, had=table.get(key);
  // the real table refuses a write that would lose patches
  if(!had || row.patches>=had.patches) table.set(key,row);
  return Promise.resolve({ok:true, status:201, json:()=>Promise.resolve([])});
}

// ── the pretend wire: every channel is a list of listeners ────────────
const hubs={socket:new Map(), relay:new Map()};
function fakeNet(who, label, kind){
  const wires=hubs[kind==='relay'?'relay':'socket'];
  return {
    myId:who,
    async connect(code, handlers){
      const list=wires.get(code)||[]; wires.set(code,list);
      const entry={who, label, handlers, mine:{}};
      list.push(entry);
      const api={ kind:(kind||'test'), myId:who,
        send(d){ for(const o of wires.get(code)) if(o!==entry) o.handlers.event(Object.assign({id:who},d)); },
        fast(d){ api.send(Object.assign({t:'pos'},d)); },
        presence(p){
          entry.mine=p||{};
          // Presence is keyed by id at the server. Two clients claiming the
          // same id are ONE row — which is the whole point of this harness.
          for(const o of wires.get(code)){
            const byId=new Map();
            for(const x of wires.get(code))
              byId.set(x.who, Object.assign({}, x.mine, {id:x.who, me:x.who===o.who, name:x.label}));
            o.handlers.peers([...byId.values()]);
          }
        },
        leave(){ wires.set(code, wires.get(code).filter(x=>x!==entry)); } };
      entry.api=api;
      setTimeout(()=>handlers.status&&handlers.status('SUBSCRIBED'),0);
      return api;
    }
  };
}

// ── one browser ───────────────────────────────────────────────────────
function browser(name, stageW, stageH, cols, sharedStore, kind){
  const store=sharedStore||{};
  const clicks={};
  const ctx2d=new Proxy({},{get:(t,k)=>{
    if(k==='canvas') return {width:stageW,height:stageH};
    if(k==='measureText') return ()=>({width:10});
    if(k==='createLinearGradient'||k==='createRadialGradient') return ()=>({addColorStop(){}});
    if(k==='createImageData'||k==='getImageData') return (w,h)=>({data:new Uint8ClampedArray(Math.max(4,(w|0)*(h|0)*4))});
    return ()=>{};
  }});
  const el=id=>({ id,hidden:false,textContent:'',innerHTML:'',value:'',className:'',title:'',type:'',
    style:{setProperty(){}},dataset:{},classList:{add(){},remove(){},toggle(){},contains:()=>false},
    children:[],max:'100',min:'0',width:stageW,height:stageH,
    addEventListener(ev,fn){ (clicks[id]||=[]).push(fn); },
    append(){},appendChild(){},remove(){},focus(){},blur(){},
    querySelector(){return el('x');},querySelectorAll(){return [];},closest(){return null;},
    setAttribute(){},getAttribute(){return null;},
    getBoundingClientRect(){return {width:stageW,height:stageH,top:0,left:0};},
    getContext(){ return ctx2d; }, dispatchEvent(){}, toDataURL(){return '';} });
  const made={};
  const g={};
  Object.assign(g,{
    localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]},
    // per tab, never shared — that is the whole point
    sessionStorage:(()=>{ const t={}; return {getItem:k=>t[k]??null,setItem:(k,v)=>t[k]=String(v),removeItem:k=>delete t[k]}; })(),
    performance:{now:()=>Date.now()},
    navigator:{clipboard:{writeText:()=>Promise.resolve()}},
    location:{host:'x',pathname:'/',origin:'https://x',hash:''},
    document:{ getElementById:id=>(ids.includes(id)||made[id])?(made[id]||=el(id)):null,
      createElement:t=>el(t), querySelectorAll:()=>[], querySelector:()=>null, addEventListener(){},
      body:el('body'), head:el('head'), dispatchEvent(){},
      documentElement:Object.assign(el('html'),{style:{setProperty(){},removeProperty(){}},
        setAttribute(){},removeAttribute(){},getAttribute:()=>null}) },
    addEventListener(){}, removeEventListener(){},
    matchMedia:()=>({matches:false}),
    requestAnimationFrame:()=>{}, requestIdleCallback:f=>setTimeout(f,0),
    setTimeout, clearTimeout, setInterval:()=>0, clearInterval,
    atob:s=>Buffer.from(s,'base64').toString('binary'),
    btoa:s=>Buffer.from(s,'binary').toString('base64'),
    console, CustomEvent:function(t,o){ return Object.assign({type:t},o||{}); },
    SLOWBROOM_CONFIG:{url:'https://x.supabase.co',anonKey:'k'},
    fetch:db,
    AudioContext:function(){ return new Proxy({},{get:()=>()=>({})}); }
  });
  g.window=g; g.globalThis=g; g.self=g;
  store['sb-dev']='1';                 // the panel is dev-gated until she flips it
  store['sb-name']=name;
  store['slow-bloom']=JSON.stringify({mode:'mop', cols, hold:true});
  vm.createContext(g);
  for(const b of blocks){ try{ vm.runInContext(b,g); }catch(e){ console.log(name+' THROW: '+e.message); } }
  // the page works out its own identity; the wire uses that, not a name the
  // test made up, so an identity clash between two tabs shows up here
  const id=g.__netIdentity ? g.__netIdentity() : name;
  g.__net=fakeNet(id, name, kind);
  // the slow road, which is what the real page opens when a room looks empty
  g.__netBridge=(code,handlers)=>fakeNet(id, name, 'relay').connect(code,handlers);
  return {name, g, store, clicks, id};
}

// ── the run ───────────────────────────────────────────────────────────
let bad=0, lastSeed='';
const ok=(label,pass,note)=>{ console.log((pass?'  ok    ':'  FAIL  ')+label+(note?'  — '+note:'')); if(!pass) bad++; };
const pct = b => { const d=b.g.__mopDiag(); return +(d.match(/you have\s+(\d+) of/)||[0,0])[1]; };
const roomOf = b => +(b.g.__mopDiag().match(/you are in\s+room (\d+)/)||[0,0])[1];
const surfOf = b => (b.g.__mopDiag().match(/you are in\s+room \d+ · surface \d+ "([^"]+)"/)||[0,''])[1];
const seedOf = b => (b.g.__mopDiag().match(/seed\s+([0-9a-f]+)/)||[0,''])[1];

(async () => {
  // two very different windows: a wide desktop and a tall laptop, and
  // different grid settings, which is what used to corrupt the map
  const A=browser('Ada', 1600, 700, 72);
  const B=browser('Bo',   900, 760, 30);
  console.log('— two browsers, one corridor —');

  A.g.__mopJoin('NPQR', true);
  B.g.__mopJoin('NPQR', false);
  await new Promise(r=>setTimeout(r,60));

  ok('both browsers deal the same world from the code', seedOf(A)===seedOf(B), seedOf(A));
  lastSeed=seedOf(A);
  ok('both start in the same room',  roomOf(A)===roomOf(B), 'room '+roomOf(A));
  ok('and on the same surface',      surfOf(A)===surfOf(B), surfOf(A));

  // Ada mops the left half of room 1; Bo is standing in it
  A.g.__mopCheat.band(50);
  await new Promise(r=>setTimeout(r,60));
  ok('Bo sees the half Ada mopped', pct(B)>2000 && pct(B)<3200, pct(B)+' patches');
  ok('and Ada has not gained anything from herself', pct(A)>2000 && pct(A)<3200, pct(A)+' patches');

  // Bo walks on to room 3 and does a strip there; Ada stays behind
  B.g.__mopCheat.room(3);
  await new Promise(r=>setTimeout(r,20));
  ok('Bo is in room 3 now', roomOf(B)===3);
  ok('Ada is still in room 1', roomOf(A)===1);
  // Ada, two rooms away, can say what Bo is standing on without being told
  const predicted=((A.g.__mopDiag().match(/ahead\s+(.*)/)||[0,''])[1]
                   .split('·').map(x=>x.trim()).find(x=>x.startsWith('room 3 '))||'').slice(7);
  ok('Ada can name the room Bo walked into without being told',
     predicted && surfOf(B).startsWith(predicted), predicted+' / '+surfOf(B));
  B.g.__mopCheat.band(40);
  await new Promise(r=>setTimeout(r,60));
  ok('room 3 did not leak into the room Ada is standing in', pct(A)<3200, pct(A)+' patches');

  // Ada walks through to room 3 and finds Bo's work waiting
  A.g.__mopCheat.room(3);
  await new Promise(r=>setTimeout(r,60));
  ok('Ada arrives in room 3 to a floor Bo already started',
     pct(A)>1500 && pct(A)<2600, pct(A)+' patches');
  ok('and it is the same surface Bo is looking at', surfOf(A)===surfOf(B), surfOf(A));

  // both leave; the database is all that is left
  A.g.__mopLeave(); B.g.__mopLeave();
  await new Promise(r=>setTimeout(r,40));
  ok('the database kept the rooms they mopped', table.size>=2, table.size+' rows, '+writes+' writes');

  // somebody new types the same code tomorrow
  const corridorSeed=seedOf(B) && lastSeed;
  const C=browser('Cass', 1200, 900, 48);
  C.g.__mopJoin('NPQR', false);
  await new Promise(r=>setTimeout(r,40));
  C.g.__mopCheat.room(3);
  await new Promise(r=>setTimeout(r,80));
  ok('Cass walks into room 3 and the floor is as they left it',
     pct(C)>1500 && pct(C)<2600, pct(C)+' patches');
  ok('Cass deals the same corridor too', seedOf(C)===lastSeed, seedOf(C)+' vs '+lastSeed);

  // ── two tabs of one browser: the way anybody tests this alone ────────
  console.log('');
  console.log('— two tabs of the same browser —');
  const shared={};
  const T1=browser('Tab one', 1400, 800, 48, shared);
  const T2=browser('Tab two', 1000, 700, 48, shared);
  ok('two tabs get different identities on the wire', T1.id!==T2.id, T1.id+' vs '+T2.id);
  T1.g.__mopJoin('NPZZ', true);
  T2.g.__mopJoin('NPZZ', false);
  await new Promise(r=>setTimeout(r,80));
  const seen = b => +(b.g.__mopDiag().match(/·\s(\d+) of 6 mopper/)||[0,0])[1] ||
                    (b.g.__mopRoom()||{peers:[]}).peers.length;
  ok('tab one can see tab two', seen(T1)>1, seen(T1)+' in the room');
  ok('tab two can see tab one', seen(T2)>1, seen(T2)+' in the room');
  T1.g.__mopCheat.band(50);
  await new Promise(r=>setTimeout(r,120));
  ok('and tab two sees what tab one mopped', pct(T2)>2000, pct(T2)+' patches');

  // ── one on the socket, one on the plain-HTTP relay ──────────────────
  // Exactly what two real browsers did: same code, same world, both correctly
  // reporting themselves connected, on two roads that never meet.
  console.log('');
  console.log('— one on the socket, one on the slow road —');
  const S1=browser('Socket', 1240, 758, 48, null, 'test');
  const R1=browser('Relay',  1114, 791, 48, null, 'relay');
  S1.g.__mopJoin('NPQQ', true);
  R1.g.__mopJoin('NPQQ', false);
  await new Promise(r=>setTimeout(r,80));
  ok('they agree on the world', seedOf(S1)===seedOf(R1), seedOf(S1));
  ok('but on different roads they cannot see each other', seen(S1)<=1 && seen(R1)<=1,
     seen(S1)+' and '+seen(R1));
  S1.g.__mopBridge();                        // what the game does after 9s alone
  await new Promise(r=>setTimeout(r,120));
  ok('the socket player listening on both now sees the relay player', seen(S1)>1,
     seen(S1)+' in the room');
  R1.g.__mopCheat.band(40);
  await new Promise(r=>setTimeout(r,140));
  ok('and picks up what they mopped', pct(S1)>1500, pct(S1)+' patches');

  console.log(bad? '\n'+bad+' failed' : '\nall good');
  process.exit(bad?1:0);
})();
