// Hunger Games Simulator — main.js
// Event delegation, keyboard shortcuts, init

document.body.addEventListener('input',e=>{
  const fn=e.target.dataset.oninput;
  if(fn==='saveGeminiKey'&&typeof saveGeminiKey==='function') saveGeminiKey(e.target.value);
});

document.body.addEventListener('click',e=>{
  const el=e.target.closest('[data-action]');
  if(!el) return;
  const action=el.dataset.action;
  if(!action) return;

  // Sound
  if(typeof playTone==='function'&&action!=='nsToggle'){
    const bigActions=new Set(['startGames','loadGame']);
    const navActions=new Set(['goHome','goSetup','closeModal','showTributeStatus','showAllianceStatus','openDrawer','closeDrawer','showHowToPlay']);
    const selectActions=new Set(['setTheme']);
    if(bigActions.has(action))       {sfxWin&&sfxWin();hapticWin&&hapticWin();}
    else if(navActions.has(action))  {sfxNav&&sfxNav();hapticAdv&&hapticAdv();}
    else if(selectActions.has(action)){sfxSelect&&sfxSelect();}
    else                             {sfxBtn&&sfxBtn();hapticTap&&hapticTap();}
  }

  switch(action){
    case 'goHome':          goHome(); break;
    case 'goSetup':         goSetup(); break;
    case 'startGames':      startGames(); break;
    case 'loadGame':        loadGame(); break;
    case 'generateTributes':generateTributes(); break;
    case 'testGeminiKey':   testGeminiKey(); break;
    case 'showGeminiHelp':  showGeminiHelp(); break;
    case 'closeModal':      closeModal(el.dataset.modal); break;
    case 'openDrawer':      openDrawer(); break;
    case 'closeDrawer':     closeDrawer(); break;
    case 'setTheme':        setTheme(el.dataset.theme); break;
    case 'nsToggle':        handleToggle(el); break;
    case 'showHowToPlay':   openModal('modal-how-to-play'); sfxOpen&&sfxOpen(); break;
    case 'showTributeStatus': showTributeStatus(); break;
    case 'showAllianceStatus':showAllianceStatus(); break;
  }
});

function handleToggle(el){
  el.classList.toggle('on');
  if(typeof sfxToggle==='function') sfxToggle();
  if(typeof hapticTap==='function') hapticTap();
}

// ── DRAWER ──
function openDrawer(){
  document.getElementById('settings-drawer')?.classList.add('open');
  document.getElementById('drawer-backdrop')?.classList.add('open');
  if(typeof sfxOpen==='function') sfxOpen();
}
function closeDrawer(){
  document.getElementById('settings-drawer')?.classList.remove('open');
  document.getElementById('drawer-backdrop')?.classList.remove('open');
}

// ── SINGLE DOMContentLoaded ──
document.addEventListener('DOMContentLoaded',()=>{
  document.documentElement.classList.add('dark');
  try{ const t=localStorage.getItem('hgsim_theme'); if(t&&typeof _themes!=='undefined'&&_themes[t]) setTheme(t); }catch(e){}

  const vl=document.getElementById('app-version-label');
  if(vl&&typeof APP_VERSION!=='undefined') vl.textContent=APP_VERSION;

  if(typeof initGeminiKeyField==='function') initGeminiKeyField();
  if(typeof updateContinueButton==='function') updateContinueButton();
  if(typeof _showOnlyScreen==='function') _showOnlyScreen('screen-home');
});

// ── MOBILE SIDEBAR ──
function toggleMobileSidebar(){
  const sidebar=document.getElementById('gs-tribute-list')?.closest('.game-sidebar');
  if(!sidebar) return;
  const open=sidebar.style.display==='block';
  sidebar.style.cssText=open?'display:none':'display:block;position:fixed;top:var(--header-h);right:0;bottom:60px;width:240px;z-index:90;overflow-y:auto;padding:12px;background:var(--deep);border-left:1px solid var(--border);box-shadow:-4px 0 20px rgba(0,0,0,0.5)';
}

// Show/hide mobile FAB based on screen
function updateMobileFAB(){
  const btn=document.getElementById('mobile-sidebar-btn');
  if(!btn) return;
  btn.style.display=window.innerWidth<=640&&document.getElementById('screen-game')?.classList.contains('active')?'flex':'none';
}
window.addEventListener('resize',updateMobileFAB);
