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

// ===== TRIBUTE EDITOR =====
const PALETTE=['#E53935','#8E24AA','#1E88E5','#00ACC1','#43A047',
  '#FB8C00','#6D4C41','#546E7A','#F06292','#26A69A',
  '#EF5350','#AB47BC','#42A5F5','#26C6DA','#66BB6A',
  '#FFA726','#8D6E63','#78909C','#EC407A','#29B6F6'];

function renderTributeEditor(){
  const container=document.getElementById('cast-list-container');
  if(!container) return;
  container.innerHTML='';

  DISTRICTS.forEach((d,di)=>{
    const tributes=G.cast.filter(t=>t.district===di);
    if(!tributes.length) return;

    const section=document.createElement('div');
    section.style.cssText='margin-bottom:20px';
    section.innerHTML=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--border)">
      <div style="width:12px;height:12px;border-radius:50%;background:${esc(d.color)}"></div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em">${esc(d.name)}</div>
      <div style="font-size:10px;color:var(--text3)">${esc(d.industry)}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
    ${tributes.map(t=>buildTributeEditorCard(t)).join('')}
    </div>`;
    container.appendChild(section);
  });
}

function buildTributeEditorCard(t){
  const portrait=typeof getPortrait==='function'?getPortrait(t):`<div style="width:76px;height:92px;background:${esc(t.color)};border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff">${esc(t.name.slice(0,2).toUpperCase())}</div>`;
  const portraitSmall=portrait.replace('width="120" height="145"','width="76" height="92"').replace('width:120px','width:76px').replace('height:145px','height:92px');
  return `<div class="tribute-editor-card" id="tec-${esc(t.id)}">
    <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:10px">
      <div style="position:relative;flex-shrink:0">
        <div class="cpu-img-wrap" onclick="triggerImageUpload('${esc(t.id)}')" title="Upload photo" style="width:76px;height:92px;border-radius:8px;overflow:hidden;cursor:pointer;position:relative">
          ${portraitSmall}
          <div class="cpu-overlay">📷</div>
        </div>
        <input type="file" id="img-input-${esc(t.id)}" accept="image/*" style="display:none" onchange="handleImageUpload('${esc(t.id)}',this)">
        ${t.customImage?`<button onclick="clearTributeImage('${esc(t.id)}')" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:var(--elim);color:#fff;border:none;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1">✕</button>`:''}
      </div>
      <div style="flex:1;min-width:0">
        <input class="cast-name-edit" value="${esc(t.name)}" oninput="updateTribute('${esc(t.id)}','name',this.value)" placeholder="Tribute name" style="width:100%;margin-bottom:6px">
        <select class="form-select" style="font-size:11px;padding:5px 8px;margin-bottom:4px;width:100%" onchange="updateTribute('${esc(t.id)}','archetype',this.value)">
          ${ARCHETYPES.map(a=>`<option${t.archetype===a?' selected':''}>${esc(a)}</option>`).join('')}
        </select>
        <select class="form-select" style="font-size:11px;padding:5px 8px;width:100%" onchange="updateTribute('${esc(t.id)}','personality',this.value)">
          ${PERSONALITIES.map(p=>`<option${t.personality===p?' selected':''}>${esc(p)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:5px">
      ${['physical','mental','social','endurance'].map((stat,si)=>{
        const colors=['var(--fire)','var(--ice)','#a855f7','var(--win)'];
        return `<div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:9px;color:var(--text3);width:24px;text-transform:uppercase">${stat.slice(0,3)}</span>
          <div style="flex:1;height:4px;background:var(--border);border-radius:2px">
            <div id="sf-${esc(t.id)}-${stat}" style="height:4px;background:${colors[si]};border-radius:2px;width:${t[stat]}%"></div>
          </div>
          <input type="range" min="30" max="98" value="${t[stat]}" style="width:60px;height:3px;accent-color:${colors[si]}"
            oninput="updateTribute('${esc(t.id)}','${stat}',+this.value);document.getElementById('sf-${esc(t.id)}-${stat}').style.width=this.value+'%';document.getElementById('sn-${esc(t.id)}-${stat}').textContent=this.value">
          <span id="sn-${esc(t.id)}-${stat}" style="font-size:10px;width:22px;text-align:right;font-family:'DM Mono',monospace">${t[stat]}</span>
        </div>`;
      }).join('')}
    </div>
    <div style="margin-top:8px">
      <button onclick="pickTributeColor('${esc(t.id)}')" style="font-size:10px;background:${esc(t.color)};color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer">🎨 Colour</button>
      <button onclick="rerollTribute('${esc(t.id)}')" style="font-size:10px;background:var(--panel2);color:var(--text2);border:1px solid var(--border);border-radius:6px;padding:4px 10px;cursor:pointer;margin-left:4px">⚡ Reroll</button>
    </div>
  </div>`;
}

function updateTribute(id,field,val){
  const t=G.cast.find(x=>x.id===id); if(!t) return;
  if(field==='name') val=String(val).replace(/[<>"'`]/g,'').slice(0,40);
  t[field]=val; t._portrait=null; t._portraitKey=null;
  if(field==='archetype'||field==='personality'){
    // Re-render just this card's portrait
    const card=document.getElementById('tec-'+id);
    if(card&&typeof getPortrait==='function'){
      const wrap=card.querySelector('.cpu-img-wrap');
      if(wrap) wrap.innerHTML=getPortrait(t).replace('width="120" height="145"','width="76" height="92"').replace('width:120px','width:76px').replace('height:145px','height:92px')+'<div class="cpu-overlay">📷</div>';
    }
  }
}

function rerollTribute(id){
  const t=G.cast.find(x=>x.id===id); if(!t) return;
  const fresh=makeContestant(t.district);
  t.name=fresh.name; t.archetype=fresh.archetype; t.personality=fresh.personality;
  t.physical=fresh.physical; t.mental=fresh.mental; t.social=fresh.social; t.endurance=fresh.endurance;
  t._portrait=null; t._portraitKey=null;
  renderTributeEditor();
  notify(`${t.name} rerolled ⚡`);
}

function clearTributeImage(id){
  const t=G.cast.find(x=>x.id===id); if(!t) return;
  t.customImage=null; t._portrait=null; t._portraitKey=null;
  renderTributeEditor();
}

// Colour picker
let _colorTarget=null;
function pickTributeColor(id){
  _colorTarget=id;
  const t=G.cast.find(x=>x.id===id);
  const grid=document.getElementById('color-grid-container');
  if(grid) grid.innerHTML=PALETTE.map(col=>`<div class="color-swatch${t&&t.color===col?' selected':''}" style="background:${col};width:28px;height:28px;border-radius:50%;cursor:pointer;border:2px solid ${t&&t.color===col?'white':'transparent'}" onclick="applyTributeColor('${col}')"></div>`).join('');
  openModal('modal-color-pick');
}
function applyTributeColor(col){
  if(!_colorTarget) return;
  const t=G.cast.find(x=>x.id===_colorTarget); if(!t) return;
  t.color=col; t._portrait=null; t._portraitKey=null;
  closeModal('modal-color-pick');
  renderTributeEditor();
}

// Override renderTributeGrid to use editor
function renderTributeGrid(){ renderTributeEditor(); }
