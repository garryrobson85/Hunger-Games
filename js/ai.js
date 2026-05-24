// Hunger Games Simulator — ai.js
// Gemini API with dramatic encounter narration

const GEMINI_KEY_STORE='hgsim_gemini_key';
function showGeminiHelp(){ openModal('modal-gemini-help'); }

async function testGeminiKey(){
  let key=getGeminiKey();
  if(!key){ const el=document.getElementById('s-gemini-key'); if(el) key=el.value.trim(); }
  if(!key){ notify('Paste your API key first'); return; }
  saveGeminiKey(key);
  notify('Testing key…');
  const models=['gemini-2.5-flash-lite','gemini-2.5-flash'];
  for(const model of models){
    try{
      const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({contents:[{parts:[{text:'Say OK'}]}],generationConfig:{maxOutputTokens:5,thinkingConfig:{thinkingBudget:0}}})
      });
      if(res.ok){notify(`✅ Key works with ${model}`,'win');return;}
      const err=await res.json().catch(()=>({}));
      if(res.status===401||res.status===403){notify(`❌ Key invalid: ${(err?.error?.message||'').slice(0,60)}`);return;}
    }catch(e){}
  }
  notify('❌ Key test failed');
}
function saveGeminiKey(val){ try{val=String(val||'').trim();if(val)localStorage.setItem(GEMINI_KEY_STORE,val);else localStorage.removeItem(GEMINI_KEY_STORE);}catch(e){} }
function getGeminiKey(){
  try{ const s=localStorage.getItem(GEMINI_KEY_STORE); if(s) return s; }catch(e){}
  try{ const el=document.getElementById('s-gemini-key'); if(el&&el.value.trim()) return el.value.trim(); }catch(e){}
  return '';
}
function initGeminiKeyField(){ const el=document.getElementById('s-gemini-key'); if(el){const k=getGeminiKey();if(k)el.value=k;} }

// ===== GEMINI CALL =====
const GEMINI_MODEL_CACHE='hgsim_gemini_model';
async function callGemini(prompt){
  const key=getGeminiKey();
  if(!key) return null;
  const allModels=['gemini-2.5-flash-lite','gemini-2.5-flash','gemini-2.5-flash-preview-04-17'];
  let models=allModels;
  try{ const c=localStorage.getItem(GEMINI_MODEL_CACHE); if(c&&allModels.includes(c)) models=[c,...allModels.filter(m=>m!==c)]; }catch(e){}
  for(const model of models){
    try{
      const ctrl=new AbortController();
      const timer=setTimeout(()=>ctrl.abort(),25000);
      const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.9,maxOutputTokens:1800,thinkingConfig:{thinkingBudget:0}}}),
        signal:ctrl.signal,
      });
      clearTimeout(timer);
      if(res.ok){
        const data=await res.json();
        const text=data.candidates?.[0]?.content?.parts?.[0]?.text||'';
        if(text){ try{localStorage.setItem(GEMINI_MODEL_CACHE,model);}catch(e){} return text; }
      }
    }catch(e){}
  }
  return null;
}

// ===== BUILD PROMPT =====
function buildArenaDayPrompt(day){
  const alive=getActive();
  const deaths=day.deaths||[];
  const events=day.events||[];
  const allies=G.alliances.filter(al=>al.members.length>=2);
  const arenaName=G.settings.theme||'the arena';

  const deathLines=deaths.map(d=>{
    const killerId=day.killers?.[d.id];
    const killer=killerId?G.cast.find(t=>t.id===killerId):null;
    const killerDesc=killer?'killed by '+killer.name+' ('+killer.archetype+', '+killer.districtName+')':'killed by the arena/environment';
    const wasAllied=killer&&d.allianceIds&&d.allianceIds.some(id=>killer.allianceIds&&killer.allianceIds.includes(id));
    return d.name+' | '+d.districtName+' | '+d.archetype+' | '+killerDesc+(wasAllied?' | BETRAYAL':'')+' | personality: '+d.personality;
  }).join('\n')||'No deaths today';

  const eventLines=events.map(function(ev){
    return ev.event.name+': '+(ev.deaths&&ev.deaths.length?ev.deaths.map(t=>t.name.split(' ')[0]).join(', ')+' died':'no deaths');
  }).join('\n')||'No events';

  const allianceLines=allies.map(al=>{
    const names=al.members.map(id=>{const t=G.cast.find(x=>x.id===id);return t?t.name.split(' ')[0]:null;}).filter(Boolean);
    return '['+names.join(' + ')+']';
  }).join(', ')||'None';

  const notableSurvivors=alive.filter(t=>t.kills>0||t.allianceIds.length>0).slice(0,4)
    .map(t=>t.name.split(' ')[0]+' ('+t.archetype+(t.kills?', '+t.kills+' kills':'')+')').join(', ');

  // Build interactions instruction
  const interactionInstructions=day.interactions&&day.interactions.length
    ?day.interactions.map(i=>'playerIds: ["'+i.a.id+'","'+i.b.id+'"] = '+i.a.name.split(' ')[0]+' + '+i.b.name.split(' ')[0]).join(' | ')
    :'none';

  // Build deaths instruction  
  const deathInstructions=deaths.length
    ?deaths.map(d=>{
      const killerId=day.killers?.[d.id];
      const killer=killerId?G.cast.find(t=>t.id===killerId):null;
      return 'id:'+d.id+' = '+d.name.split(' ')[0]+(killer?' killed by '+killer.name.split(' ')[0]:'');
    }).join(' | ')
    :'none';

  const closecallIds=alive.filter(t=>t.allianceIds.length>0||t.kills>0).slice(0,2)
    .map(t=>'id:'+t.id+' = '+t.name.split(' ')[0]).join(' | ')||'none';

  const prompt=
    'You write for a Hunger Games simulator. Capitol announcer voice: theatrical, complicit, slightly sinister.\n'+
    'Season: "'+( G.settings.name||'The Hunger Games')+'" — Arena: '+arenaName+' — Day '+day.day+'\n'+
    alive.length+' tributes alive. '+deaths.length+' cannon shot'+(deaths.length!==1?'s':'')+' today.\n\n'+
    '== FACTS (use ONLY these) ==\n'+
    "Today's event(s): "+eventLines+'\n'+
    'Deaths and how they happened:\n'+deathLines+'\n'+
    'Notable survivors: '+(notableSurvivors||'none')+('\n')+
    'Active alliances: '+allianceLines+'\n'+
    (day.sponsorGift?'Sponsor gift: '+day.sponsorGift.gift.name+' to '+day.sponsorGift.recipient.name.split(' ')[0]+'\n':'')+
    '\n== HARD RULES ==\n'+
    '- interactions recorded BEFORE events — NEVER reference today\'s deaths in them\n'+
    '- Only reference tributes listed above\n'+
    '- Never invent events or kills not in the facts\n\n'+
    '== INTERACTIONS ==\n'+
    'Pairs (use these exact playerIds): '+interactionInstructions+'\n\n'+
    '== DEATHS ==\n'+
    'Write encounter (2-3 dramatic sentences HOW they died) and commentary (1 Claudius line) for each:\n'+
    deathInstructions+'\n\n'+
    '== CLOSE CALLS ==\n'+
    'Write 2-3 sentences for each survivor who had a near-miss:\n'+
    closecallIds+'\n\n'+
    'Write ONLY valid JSON (no markdown, no backticks):\n'+
    '{\n'+
    '  "openingNarration": "2-3 Capitol sentences opening Day '+day.day+'",\n'+
    '  "interactions": [\n'+
    (day.interactions&&day.interactions.length
      ?'    '+day.interactions.map(i=>'{"playerIds":["'+i.a.id+'","'+i.b.id+'"],"text":"1-2 sentences"}').join(',\n    ')
      :'')+
    '\n  ],\n'+
    '  "deaths": [\n'+
    (deaths.length
      ?'    '+deaths.map(d=>'{"id":"'+d.id+'","encounter":"dramatic 2-3 sentence death description","commentary":"sharp Claudius one-liner"}').join(',\n    ')
      :'')+
    '\n  ],\n'+
    '  "closeCalls": [\n'+
    (alive.filter(t=>t.allianceIds.length>0||t.kills>0).slice(0,2).length
      ?'    '+alive.filter(t=>t.allianceIds.length>0||t.kills>0).slice(0,2).map(t=>'{"id":"'+t.id+'","text":"2-3 sentence near-miss"}').join(',\n    ')
      :'')+
    '\n  ]\n'+
    '}';

  return prompt;
}


// ===== GENERATE AI CONTENT =====
async function generateAIArenaDay(day){
  // Show loading screen
  const c=document.getElementById('ep-view-container');
  if(c&&G.stageIndex===0){
    // Only show loading on stage 0 (not if already viewing events)
  }

  const prompt=buildArenaDayPrompt(day);
  const raw=await callGemini(prompt);
  if(!raw) return;

  try{
    const text=raw.replace(/```json|```/g,'').trim();
    const parsed=JSON.parse(text);

    if(parsed.openingNarration) day._aiOpeningNarration=parsed.openingNarration;

    if(parsed.interactions){
      parsed.interactions.forEach(i=>{
        const match=day.interactions?.find(d=>d.a.id===i.playerIds?.[0]&&d.b.id===i.playerIds?.[1]);
        if(match) match._aiText=i.text;
      });
    }

    // New structure: deaths array with per-tribute encounter + commentary
    if(parsed.deaths&&Array.isArray(parsed.deaths)){
      if(!day._encounterNarration) day._encounterNarration={};
      if(!day._deathCommentary) day._deathCommentary={};
      parsed.deaths.forEach(d=>{
        if(d.id&&d.encounter) day._encounterNarration[d.id]=d.encounter;
        if(d.id&&d.commentary) day._deathCommentary[d.id]=d.commentary;
      });
    }

    // Close calls for survivors
    if(parsed.closeCalls&&Array.isArray(parsed.closeCalls)){
      if(!day._encounterNarration) day._encounterNarration={};
      parsed.closeCalls.forEach(c=>{
        if(c.id&&c.text) day._encounterNarration['survive_'+c.id]=c.text;
      });
    }

    saveGame();

    // Re-render current stage with new AI content
    if(G.stageIndex===1||G.stageIndex===0){
      renderStage(G.stageIndex);
    }
  }catch(e){
    console.error('AI parse failed:',e,raw?.slice(0,200));
  }
}
