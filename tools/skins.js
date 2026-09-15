// The look and the rail, checked without a browser.
//
// Crayon won and was folded into :root, so there is one palette again — but
// it still has to define every token and still has to work both ways into
// dark. The rest of this file is about what was deliberately taken OUT of the
// two rails: a control removed from the markup while its JS still reaches for
// it throws on load and takes the whole game with it, which is exactly what
// happened twice while this batch was being written (holdBtn, then tintEl).
const fs=require('fs');
const src=fs.readFileSync('index.html','utf8');
// build.py stamps its own little reset <style> into the head, and that one
// opens ":root{" too — the page's real stylesheet is the big one.
const css=(src.match(/<style>[\s\S]*?<\/style>/g)||[])
  .map(b=>b.slice(7,-8)).sort((a,b)=>b.length-a.length)[0]||'';
let bad=0;
const ok=(pass,label,note)=>{ console.log((pass?'  ok    ':'  FAIL  ')+label+(note?'  — '+note:'')); if(!pass) bad++; };
const has=re=>new RegExp(re).test(src);
function block(sel){
  const i=css.indexOf(sel+'{');
  return i<0 ? null : css.slice(i+sel.length+1, css.indexOf('}', i));
}

console.log('— the look —');
ok(css.length>1000, 'the stylesheet is there', css.length+' chars');
const o=(css.match(/{/g)||[]).length, c=(css.match(/}/g)||[]).length;
ok(o===c, 'every brace is closed', o+' open, '+c+' close');
const PALETTE=['--ground','--panel','--edge','--ink','--ink-soft','--ink-faint','--accent','--accent-ink','--shadow'];
const SHAPE=['--font-body','--font-display','--radius','--radius-lg','--border-w'];
const root=block(':root');
PALETTE.concat(SHAPE).forEach(t=>ok(root.includes(t+':'), 'the palette defines '+t));
ok(/--accent:#e2563d/.test(root), 'crayon is the palette now, not an option',
   (root.match(/--accent:(#\w+)/)||[])[1]);
ok(/--shadow:3px 3px 0/.test(root), 'and it kept the hard offset shadow, not a blur');
ok(/Baloo/.test(root) && /Nunito/.test(root), 'and the rounded type');
const forced=block(':root[data-theme="dark"]'), auto=block(':root:not([data-theme="light"])');
ok(!!forced && !!auto, 'both routes into dark are covered');
ok(PALETTE.filter(t=>forced.includes(t+':')).join()===PALETTE.filter(t=>auto.includes(t+':')).join(),
   'and they say the same thing');
ok(!/data-skin/.test(src), 'the House/Linen picker is gone, not just hidden');
ok(!/background:var\(--accent\);\s*color:#[0-9a-f]/i.test(css),
   'nothing paints fixed white on the accent');

console.log('\n— the three games —');
ok(has('id="pickgame"'), 'the selector is there');
ok(src.indexOf('id="pickgame"') > src.indexOf('</header>'),
   'and it stands below the masthead, over the field');
ok(src.indexOf('id="pickgame"') < src.indexOf('id="tab-bloom"'), 'above the field, not inside it');
ok(/\.pickgame\{[^}]*align-items:center/.test(css), 'centred');
ok((src.match(/class="tico"/g)||[]).length===3, 'three icons');
ok(/@keyframes pickme/.test(css) && /sb-picked/.test(src), 'first visit still gets the highlight');

console.log('\n— what was taken out —');
// Every id/selector the JS still looks up must still exist in the markup.
const GONE={
  'the mop arrow pad':'data-dir=',
  'the ant arrow pad':'data-adir=',
  'the ant ● button':'id="ant-drop"',
  'the Blow button':'id="ant-blow"',
  'the ant Holding button':'id="ant-hold-btn"',
  'the Shade slider':'id="ant-tint"',
  'the Mop toggle':'data-mopstyle=',
  'the Grain toggle':'data-cols=',
  'the practice-nest footnote':'offline practice nest'
};
for(const [what,mark] of Object.entries(GONE)) ok(!src.includes(mark), what+' is gone');
// …and nothing left behind may still reach for them at load time
const LIVE=['ant-tint','ant-hold-btn','ant-blow','ant-drop'];
LIVE.forEach(id=>ok(!new RegExp("getElementById\\('"+id+"'\\)").test(src),
  'nothing still looks up #'+id));
ok(/A\.tint/.test(src) && /tint:20/.test(src),
   'but A.tint survives the slider — every background reads it');
ok(/S\.mopStyle/.test(src) && /S\.cols/.test(src),
   'and S.mopStyle / S.cols survive their toggles');

console.log('\n— where things moved —');
ok(src.indexOf('id="mnest-sec"') > src.indexOf('id="drag-btn"'),
   'multiplayer sits below Drag broom mode');
const mopwNote=src.indexOf('change the mop width');
ok(mopwNote > src.indexOf('id="mopw"') && mopwNote < src.indexOf('id="drag-btn"'),
   'the mop keys sit under the width slider');
ok(src.indexOf("change the ant's size") < src.indexOf('id="carry-list"'),
   'the ant keys sit at the very top, above the inventory');
ok(src.indexOf('id="ant-restart"') > src.indexOf('id="ant-piles"'),
   'both restarts sit in The round, under the round info');
ok(has('<h2>Inventory') && !has('<h2>Carrying'), 'Carrying is called Inventory');
ok(/\.carry\{[^}]*max-height/.test(css) && /\.carry\{[^}]*overflow-y:auto/.test(css),
   'the inventory is capped and scrolls');
ok(/carry-more/.test(css) && /carry-more/.test(src), 'and says how many it is hiding');

console.log('\n— the tool and the doors —');
ok(!has('data-tool="'), 'the tool picker is gone');
ok(/function drawSqueegee|function drawMopClassic|function drawMopFlat/.test(src),
   'the mop, the flat pad and the squeegee are back');
ok(!/drawChalk|drawClay|drawMoss/.test(src), 'and the three that replaced them are not');
ok(!/tl:S\.tool/.test(src), 'and the tool has stopped travelling, having nothing to say');

console.log('\n— the blurbs —');
ok(!/developed with AI/.test(src), 'no AI disclaimer');
ok((src.match(/\(Community Chat below\)/g)||[]).length===2,
   'both games point at the chat below');
ok(has('app/3326230') && has('app/4120790'), 'Hozy and the Sorting Bureau still credited');

console.log(bad? '\n'+bad+' failed' : '\nall good');
process.exit(bad?1:0);
