// Hunger Games Simulator — state.js
// Game state, RNG, utilities, screen management

const SAVE_SCHEMA_VERSION = 1;
const SAVE_KEY = 'hgsim_save_v1';

function updateStatusTicker(msg){
  const el=document.getElementById('status-ticker');
  if(el) el.textContent=msg||`LIVE — DAY ${G.day||1} — ${G.cast.filter(c=>!c.eliminated).length} TRIBUTES REMAIN`;
}

let G = {
  cast:[],          // 24 tributes
  settings:{},      // season config
  day:1,            // current day in the arena
  episodeLog:[],    // log of each day's events
  currentDayData:null,
  stageIndex:0,
  alliances:[],
  allianceLog:[],
  relationships:{}, // tribute relationship scores
  memories:[],
  sponsorHolders:[], // tribute IDs holding a sponsor gift
  arenaIntensity:0,  // 0-5, rises as days pass / deaths occur
  rngState:null,
  victor:null,       // set when one tribute remains
};

// ===== RNG =====
function hashSeed(str){
  let h=2166136261>>>0;
  str=String(str||'');
  for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}
  return h>>>0;
}
function seededRandom(){
  if(!G.settings||!G.settings.seed) return Math.random();
  if(G.rngState==null) G.rngState=hashSeed(G.settings.seed+'|'+(G.day||1)+'|v'+RNG_VERSION);
  G.rngState=(Math.imul(1664525,G.rngState)+1013904223)>>>0;
  return G.rngState/4294967296;
}
const rng=(min,max)=>Math.floor(seededRandom()*(max-min+1))+min;
const pick=arr=>arr[rng(0,arr.length-1)];
const shuffle=arr=>{let a=[...arr];for(let i=a.length-1;i>0;i--){let j=rng(0,i);[a[i],a[j]]=[a[j],a[i]];}return a;};
const uid=()=>Math.random().toString(36).slice(2,8);

function escapeHtml(s){
  if(s==null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
const esc=escapeHtml;

// ===== SCREEN MANAGEMENT =====
const SCREENS=['screen-home','screen-setup','screen-game'];
function _showOnlyScreen(id){
  SCREENS.forEach(sid=>{
    const s=document.getElementById(sid);
    if(!s) return;
    const show=sid===id;
    s.style.display=show?'flex':'none';
    s.classList.toggle('active',show);
  });
  window.scrollTo(0,0);
  document.querySelector('.ep-view')?.scrollTo&&document.querySelector('.ep-view').scrollTo(0,0);
}
function goHome(){ _showOnlyScreen('screen-home'); updateContinueButton(); }
function goSetup(){ _showOnlyScreen('screen-setup'); if(!G.cast.length) generateTributes(); }

// ===== SETUP =====
function readSettings(){
  G.settings={
    name:  document.getElementById('s-name')?.value||'The Hunger Games',
    theme: document.getElementById('s-theme')?.value||'Arena',
    seed:  document.getElementById('s-seed')?.value||(Date.now()+''),
    geminiKey: getGeminiKey(),
    bloodbathDeaths: parseInt(document.getElementById('s-bloodbath')?.value||'6'),
    deathsPerDay:    parseFloat(document.getElementById('s-daily-deaths')?.value||'1.5'),
    maxDeaths:       parseInt(document.getElementById('s-max-deaths')?.value||'3'),
    arenaIntensity:  document.getElementById('s-intensity')?.value||'medium',
    alliances:       document.getElementById('t-alliances')?.classList.contains('on')!==false,
    confessionals:   document.getElementById('t-confessionals')?.classList.contains('on')!==false,
    sponsorGifts:    document.getElementById('t-sponsors')?.classList.contains('on')!==false,
  };
}

function startGames(){
  if(!G.cast.length||G.cast.length<4){ notify('⚠️ Need at least 4 tributes'); return; }
  readSettings();
  if(!G.settings.seed) G.settings.seed=Date.now()+'';
  G.day=1; G.episodeLog=[]; G.alliances=[]; G.relationships={};
  G.arenaIntensity=0; G.memories=[]; G.sponsorHolders=[]; G.victor=null;
  G.stageIndex=0; G.currentDayData=null;

  // Seed relationships
  G.cast.forEach(a=>{ G.relationships[a.id]={};
    G.cast.forEach(b=>{ if(a.id!==b.id) G.relationships[a.id][b.id]=
      a.district===b.district?rng(55,80):rng(25,55); });
  });

  _showOnlyScreen('screen-game');
  computeAndStartDay();
}

// ===== ALLIANCE SYSTEM =====
function getActive(){ return G.cast.filter(c=>!c.eliminated); }
function getAllianceMembers(t){
  return t.allianceIds.flatMap(aid=>{
    const al=G.alliances.find(a=>a.id===aid);
    return al?al.members.filter(m=>m!==t.id):[];
  });
}
function getTributeAllies(t){ return getAllianceMembers(t); }

function maybeFormAlliances(){
  if(!G.settings.alliances) return;
  const active=getActive();
  if(active.length<3) return;

  // Each tribute has a chance to propose or join an alliance
  active.forEach(t=>{
    if(t.allianceIds.length>0||seededRandom()>0.3) return;
    const candidates=active.filter(o=>
      o.id!==t.id&&o.allianceIds.length===0&&
      (G.relationships[t.id]?.[o.id]||40)>=50
    );
    if(!candidates.length) return;
    const partner=pick(candidates);
    const al={
      id:uid(),
      members:[t.id,partner.id],
      strength:rng(50,80),
      day:G.day,
    };
    G.alliances.push(al);
    t.allianceIds.push(al.id);
    partner.allianceIds.push(al.id);
    // Districts 1/2/4 Careers: try to expand
    if(['The Career','The Brute'].includes(t.archetype)){
      const extra=active.filter(o=>!o.eliminated&&o.allianceIds.length===0&&
        o.id!==t.id&&o.id!==partner.id&&['The Career','The Brute'].includes(o.archetype)).slice(0,2);
      extra.forEach(e=>{al.members.push(e.id);e.allianceIds.push(al.id);});
    }
  });
}

function updateAlliancesForDeaths(deaths){
  deaths.forEach(d=>{
    G.alliances.forEach(al=>{
      al.members=al.members.filter(m=>m!==d.id);
    });
    G.alliances=G.alliances.filter(al=>al.members.length>=2);
    const t=G.cast.find(c=>c.id===d.id);
    if(t) t.allianceIds=[];
  });
}

// ===== SAVE / CONTINUE BUTTON =====
function updateContinueButton(){
  const wrap=document.getElementById('continue-btn-wrap');
  if(!wrap) return;
  try{
    const s=localStorage.getItem(SAVE_KEY);
    wrap.style.display=s?'flex':'none';
  }catch(e){ wrap.style.display='none'; }
}
function saveGame(){
  try{
    const data={version:SAVE_SCHEMA_VERSION,G:JSON.parse(JSON.stringify(G,(_,v)=>v instanceof Set?[...v]:v))};
    localStorage.setItem(SAVE_KEY,JSON.stringify(data));
  }catch(e){ notify('⚠️ Save failed'); }
}
function loadGame(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);
    if(!raw){notify('No saved game found.');return;}
    const data=JSON.parse(raw);
    Object.assign(G,data.G);
    if(G.settings?.twists&&Array.isArray(G.settings.twists)) G.settings.twists=new Set(G.settings.twists);
    _showOnlyScreen('screen-game');
    updateGameSidebar();
    renderStage(G.stageIndex||0);
    notify('Game loaded ✓','win');
  }catch(e){ notify('⚠️ Load failed: '+e.message); }
}

// ===== NOTIFICATIONS =====
function notify(msg,type=''){
  const el=document.getElementById('notification');
  if(!el) return;
  el.textContent=msg;
  el.className='notification'+(type?' '+type:'');
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),3200);
}
