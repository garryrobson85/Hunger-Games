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
  const survivors=alive; // everyone still alive after today
  const events=day.events||[];
  const allies=G.alliances.filter(al=>al.members.length>=2);
  const arenaName=G.settings.theme||'the arena';

  // Build per-death kill context
  const deathLines=deaths.map(d=>{
    const killerId=day.killers?.[d.id];
    const killer=killerId?G.cast.find(t=>t.id===killerId):null;
    const killerDesc=killer?`killed by ${killer.name} (${killer.archetype}, ${killer.districtName})`:'killed by the arena/environment';
    const wasAllied=killer&&d.allianceIds?.some(id=>killer.allianceIds?.includes(id));
    return `${d.name} | ${d.districtName} | ${d.archetype} | ${killerDesc}${wasAllied?' | BETRAYAL — they were allied':''} | personality: ${d.personality}`;
  }).join('\n')||'No deaths today';

  // Close survivors context (2-3 interesting ones)
  const notableSurvivors=survivors.filter(t=>t.kills>0||t.allianceIds.length>0).slice(0,4)
    .map(t=>`${t.name.split(' ')[0]} (${t.archetype}${t.kills?`, ${t.kills} kills`:''}${t.allianceIds.length?', allied':''})`).join(', ');

  const eventLines=events.map(({event,deaths:d})=>
    `${event.name}: ${d.length?d.map(t=>t.name.split(' ')[0]).join(', ')+' died':'no deaths'}`
  ).join('\n')||'No events';

  const allianceLines=allies.map(al=>{
    const names=al.members.map(id=>G.cast.find(t=>t.id===id)?.name.split(' ')[0]).filter(Boolean);
    return `[${names.join(' + ')}]`;
  }).join(', ')||'None';

  return `You write for a Hunger Games simulator. Capitol announcer voice: theatrical, complicit, slightly sinister.
Season: "${G.settings.name||'The Hunger Games'}" — Arena: ${arenaName} — Day ${day.day}
${alive.length} tributes alive. ${deaths.length} cannon shot${deaths.length!==1?'s':''} today.

== FACTS (use ONLY these) ==
Today's event(s): ${eventLines}
Deaths and how they happened:
${deathLines}
Notable survivors: ${notableSurvivors||'none flagged'}
Active alliances: ${allianceLines}
${day.sponsorGift?`Sponsor gift sent: ${day.sponsorGift.gift.name} → ${day.sponsorGift.recipient.name.split(' ')[0]}`:''}

== WHAT TO WRITE ==

1. openingNarration — 2 sentences. Capitol tone setting the day. Reference arena, tension, tributes by name or district.

2. interactions — BEFORE today's events. 1-2 sentences each. Must NOT reference who died today.
   Pairs: ${(day.interactions||[]).map(i=>`${i.a.name.split(' ')[0]} (${i.a.archetype}) + ${i.b.name.split(' ')[0]} (${i.b.archetype})`).join(' | ')||'none'}

3. encounterNarration — For EACH death and EACH notable survival, write a dramatic 2-3 sentence encounter description.
   - Deaths: describe exactly HOW they died in this event — the final moments, the fatal mistake, or the kill.
   - Survivals (2-3 tributes who had close calls): describe how they barely escaped — the near miss, the split-second decision.
   - Be specific: name the killer, describe the weapon/method if combat, the hazard if environmental.
   - Match archetype: Careers die fighting back, Underdogs die trying, Tributes die scared, Strategists die outmanoeuvred.
   - Claudius narrates in past tense from Capitol broadcast perspective.

4. deathCommentary — One sharp Capitol line per death. Callous but not cruel. Specific to that tribute.

== HARD RULES ==
- interactions happen BEFORE events — NEVER reference today's deaths in them
- Only reference tributes listed above
- Never invent events or kills not in the facts
- encounterNarration MUST reference the actual killer or cause listed above

Write ONLY valid JSON, no markdown, no backticks:
{
  "openingNarration": "...",
  "interactions": [
    ${(day.interactions||[]).map(i=>`{"playerIds":["${i.a.id}","${i.b.id}"],"text":"..."}`).join(',\n    ')}
  ],
  "encounterNarration": {
    ${deaths.map(d=>`"${d.id}": "2-3 sentence dramatic description of how ${d.name.split(' ')[0]} died"`).join(',\n    ')}${deaths.length&&survivors.slice(0,2).length?',':''}
    ${survivors.filter(t=>t.kills>0||seededRandom()<0.3).slice(0,2).map(t=>`"survive_${t.id}": "2-3 sentence near-miss description for ${t.name.split(' ')[0]}"`).join(',\n    ')}
  },
  "deathCommentary": {
    ${deaths.map(d=>`"${d.id}": "One sharp Claudius line on ${d.name.split(' ')[0]}'s death"`).join(',\n    ')}
  }
}

Tribute IDs: ${[...deaths,...survivors.slice(0,3)].map(t=>t.id+':'+t.name.split(' ')[0]).join(', ')}`;
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

    if(parsed.encounterNarration) day._encounterNarration=parsed.encounterNarration;
    if(parsed.deathCommentary) day._deathCommentary=parsed.deathCommentary;

    saveGame();

    // Re-render current stage with new AI content
    if(G.stageIndex===1||G.stageIndex===0){
      renderStage(G.stageIndex);
    }
  }catch(e){
    console.error('AI parse failed:',e,raw?.slice(0,200));
  }
}
