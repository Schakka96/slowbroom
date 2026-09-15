// The three looks, checked without a browser. A skin that forgets one token
// silently inherits the house one — a violet accent stranded on cream paper,
// or white text on sage green that nobody can read. Both of those are
// invisible until somebody switches skin in the dark and squints.
const fs=require('fs');
const src=fs.readFileSync('index.html','utf8');
// build.py stamps its own little reset <style> into the head, and that one
// opens ":root{" too — so neither "the first style block" nor all of them
// joined will do. The page's real stylesheet is the big one.
const css=(src.match(/<style>[\s\S]*?<\/style>/g)||[])
  .map(b=>b.slice(7,-8)).sort((a,b)=>b.length-a.length)[0]||'';
let bad=0;
const ok=(pass,label,note)=>{ console.log((pass?'  ok    ':'  FAIL  ')+label+(note?'  — '+note:'')); if(!pass) bad++; };

ok(css.length>1000, 'the stylesheet is there', css.length+' chars');
const opens=(css.match(/{/g)||[]).length, closes=(css.match(/}/g)||[]).length;
ok(opens===closes, 'every brace is closed', opens+' open, '+closes+' close');

// ── the palette every skin owes ──
const PALETTE=['--ground','--panel','--edge','--ink','--ink-soft','--ink-faint','--accent','--accent-ink','--shadow'];
const SHAPE=['--font-body','--font-display','--radius','--radius-lg','--border-w'];
function block(sel){
  const i=css.indexOf(sel+'{');
  if(i<0) return null;
  return css.slice(i+sel.length+1, css.indexOf('}', i));
}
const house=block(':root');
ok(!!house, 'the house look is the bare :root');
PALETTE.concat(SHAPE).forEach(t=>ok(house.includes(t+':'), 'house defines '+t));

for(const skin of ['crayon','linen']){
  const light=block(':root[data-skin="'+skin+'"]');
  ok(!!light, skin+': has a light palette');
  PALETTE.forEach(t=>ok(light.includes(t+':'), skin+' light defines '+t));
  ok(SHAPE.some(t=>light.includes(t+':')), skin+' moves shape or type, not only colour');
  // both ways of arriving at dark: the system's preference, and the toggle
  const forced=block(':root[data-skin="'+skin+'"][data-theme="dark"]');
  const auto=block(':root[data-skin="'+skin+'"]:not([data-theme="light"])');
  ok(!!forced, skin+': Dark on the toggle is covered');
  ok(!!auto,   skin+': a dark system with Auto is covered');
  if(forced&&auto){
    const f=PALETTE.filter(t=>forced.includes(t+':')).join(),
          a=PALETTE.filter(t=>auto.includes(t+':')).join();
    ok(f===a, skin+": the two dark routes say the same thing");
  }
  // the toggle has to beat the media query, which sits above it in the file
  ok(css.indexOf(':root[data-skin="'+skin+'"][data-theme="dark"]') >
     css.indexOf(':root[data-skin="'+skin+'"]:not([data-theme="light"])'),
     skin+': forcing Light in a dark room actually works');
  // a skin block after the house dark block, or the house dark wins on ties
  ok(css.indexOf(':root[data-skin="'+skin+'"]') > css.indexOf(':root[data-theme="dark"]'),
     skin+': ordered after the house palette it overrides');
}

// ── nothing should still be hard-coded onto the accent ──
const onAccent=[...css.matchAll(/background:var\(--accent\);\s*color:(#[0-9a-f]{3,6})/gi)];
ok(onAccent.length===0, 'nothing paints fixed white on a moving accent',
   onAccent.length? onAccent.map(m=>m[1]).join(', ') : 'all use --accent-ink');

// ── the picker and the three games ──
ok(/<div class="seg skin"/.test(src), 'the style picker is in the masthead');
['','crayon','linen'].forEach(k=>
  ok(src.includes('data-skin="'+k+'"'), 'picker offers '+(k||'house')));
ok(src.indexOf('class="seg skin"') > src.indexOf('class="seg theme"'),
   'and it sits below light/dark, where she asked for it');
ok(/id="pickgame"/.test(src) && (src.match(/class="tico"/g)||[]).length===3,
   'the three games have icons, not just words');
ok(/\.pickgame\.fresh \.tabs\{/.test(css) && /@keyframes pickme/.test(css),
   'a first-time visitor gets the games highlighted');
ok(/sb-picked/.test(src), 'and the highlight remembers it has been seen');
ok(/prefers-reduced-motion: reduce\)\{\s*\.pickgame\.fresh \.tabs\{animation:none\}/.test(css),
   'the pulse holds still for anyone who asked it to');

// ── the text she asked to be gone ──
ok(!/developed with AI/.test(src), 'the AI disclaimer is gone from both games');
ok(!/offline practice rooms/.test(src), 'the TEST/THIS footnote is gone');
ok(/store\.steampowered\.com\/app\/3326230/.test(src) &&
   /store\.steampowered\.com\/app\/4120790/.test(src),
   'but Hozy and the Sorting Bureau are still credited and linked');

console.log(bad? '\n'+bad+' failed' : '\nall good');
process.exit(bad?1:0);
