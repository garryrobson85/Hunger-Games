// Hunger Games Simulator — sound.js
let _actx=null;
function _initAudio(){ if(!_actx||_actx.state==='closed') try{_actx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){} }
document.body?.addEventListener('pointerdown',()=>{if(!_actx)_initAudio();if(_actx?.state==='suspended')_actx.resume();},{once:true,passive:true});

function playTone(f,t='sine',d=0.15,v=0.09,delay=0){
  if(!_actx){_initAudio();if(!_actx)return;}
  const doPlay=()=>{
    try{
      if(_actx.state==='closed') return;
      const o=_actx.createOscillator(),g=_actx.createGain();
      o.connect(g);g.connect(_actx.destination);
      o.type=t;o.frequency.value=f;
      const T=_actx.currentTime+Math.max(0,delay);
      g.gain.setValueAtTime(Math.max(0.001,v),T);
      g.gain.exponentialRampToValueAtTime(0.0001,T+d);
      o.start(T);o.stop(T+d+0.05);
    }catch(e){}
  };
  if(_actx.state==='running') doPlay(); else _actx.resume().then(doPlay).catch(()=>{});
}

function sfxBtn()    { if(!_actx)_initAudio(); playTone(600,'sine',0.08,0.09); }
function sfxNav()    { playTone(440,'sine',0.12,0.08); playTone(550,'sine',0.08,0.06,0.06); }
function sfxWin()    { playTone(523,'sine',0.15,0.12); playTone(659,'sine',0.15,0.12,0.1); playTone(784,'sine',0.2,0.14,0.2); }
function sfxDeath()  { playTone(220,'sawtooth',0.4,0.15); playTone(110,'sawtooth',0.3,0.1,0.15); } // cannon boom
function sfxSelect() { playTone(520,'sine',0.10,0.11); playTone(780,'sine',0.13,0.10,0.07); }
function sfxOpen()   { playTone(660,'sine',0.1,0.08); }
function sfxAdv()    { playTone(480,'sine',0.18,0.1); }
function sfxToggle() { playTone(350,'square',0.05,0.07); }
function hapticTap() { try{navigator.vibrate&&navigator.vibrate(12);}catch(e){} }
function hapticAdv() { try{navigator.vibrate&&navigator.vibrate([15,10,15]);}catch(e){} }
function hapticWin() { try{navigator.vibrate&&navigator.vibrate([30,20,30,20,60]);}catch(e){} }

// Themes
const _themes={
  default:{'--fire':'#e8450a','--fire2':'#ff7a45','--void':'#050608','--deep':'#0a0b0f','--panel':'#13151a','--panel2':'#1a1d24','--border':'rgba(255,255,255,0.08)','--border2':'rgba(255,255,255,0.15)','--text':'#f5f5f4','--text2':'#a8a29e','--text3':'#57534e','--win':'#22c55e','--elim':'#ef4444','--ice':'#00d4ff','--ice2':'#7c3aed'},
  capitol:{'--fire':'#D4AF37','--fire2':'#f5cc5c','--void':'#080608','--deep':'#100d0f','--panel':'#1a1218','--panel2':'#221720','--border':'rgba(212,175,55,0.12)','--border2':'rgba(212,175,55,0.25)','--text':'#f5f0e8','--text2':'#b5a898','--text3':'#6b5e55','--win':'#D4AF37','--elim':'#dc2626','--ice':'#D4AF37','--ice2':'#92400e'},
  arena:{'--fire':'#22c55e','--fire2':'#4ade80','--void':'#020a04','--deep':'#041208','--panel':'#0a1f0d','--panel2':'#102815','--border':'rgba(34,197,94,0.1)','--border2':'rgba(34,197,94,0.2)','--text':'#f0fdf4','--text2':'#86efac','--text3':'#4ade80','--win':'#22c55e','--elim':'#ef4444','--ice':'#22c55e','--ice2':'#166534'},
  bloodbath:{'--fire':'#ef4444','--fire2':'#f87171','--void':'#0a0404','--deep':'#130808','--panel':'#1f0d0d','--panel2':'#2a1010','--border':'rgba(239,68,68,0.1)','--border2':'rgba(239,68,68,0.2)','--text':'#fef2f2','--text2':'#fca5a5','--text3':'#ef4444','--win':'#22c55e','--elim':'#ef4444','--ice':'#ef4444','--ice2':'#7f1d1d'},
};
function setTheme(name){
  const t=_themes[name];
  if(!t) return;
  Object.entries(t).forEach(([k,v])=>document.documentElement.style.setProperty(k,v));
  try{localStorage.setItem('hgsim_theme',name);}catch(e){}
}
