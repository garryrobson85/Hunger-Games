// Hunger Games Simulator — ai.js
// Gemini API integration with HG-specific prompts

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
  notify('❌ Key test failed — check console');
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
      const timer=setTimeout(()=>ctrl.abort(),22000);
      const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.85,maxOutputTokens:1200,thinkingConfig:{thinkingBudget:0}}}),
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

// ===== ARENA DAY PROMPT =====
function buildArenaDayPrompt(day){
  const alive=getActive();
  const deaths=day.deaths||[];
  const events=day.events||[];
  const allies=G.alliances.filter(al=>al.members.length>=2);

  const eventLines=events.map(({event,deaths:d})=>
    `${event.name} (${event.type}): ${d.length?d.map(t=>t.name).join(', ')+' died':'no deaths'}`
  ).join('\n');

  const allianceLines=allies.map(al=>{
    const names=al.members.map(id=>G.cast.find(t=>t.id===id)?.name).filter(Boolean);
    return names.join(' + ');
  }).join(' | ')||'None';

  const deathLines=deaths.map(d=>{
    const killerName=day.killers?.[d.id]?G.cast.find(t=>t.id===day.killers[d.id])?.name:'arena';
    return `${d.name} (${d.archetype}, ${d.districtName}) — killed by ${killerName}`;
  }).join('\n')||'No deaths today';

  return `You are writing narration and dialogue for a Hunger Games simulator.
Season: "${G.settings.name||'The Hunger Games'}" — Arena: ${G.settings.theme||'undisclosed location'}
Day: ${day.day} — Tributes alive: ${alive.length}

== STRICT FACT SHEET (reference ONLY these facts) ==
Alive tributes: ${alive.map(t=>`${t.name} (${t.districtName}, ${t.archetype})`).join(', ')}
Events today: 
${eventLines}
Deaths today:
${deathLines}
Active alliances: ${allianceLines}
${day.sponsorGift?`Sponsor gift: ${day.sponsorGift.gift.name} → ${day.sponsorGift.recipient.name}`:'No sponsor gifts today.'}

== HARD RULES ==
1. NEVER reveal who will die in camp interactions or the opening narration — only the events section covers deaths.
2. Interactions are recorded BEFORE the arena events. They must not reference today's deaths.
3. Only reference tributes in the "Alive tributes" list above.
4. Do NOT invent events not listed above.
5. Claudius Templesmith is theatrical, Capitol-biased, slightly sinister — not neutral.
6. Tribute voices: Careers are cold and calculated. Underdogs are defiant. Tributes are scared but surviving.

== WRITING RULES ==
- Narration: 2-3 sentences, theatrical Capitol voice
- Interactions: 1-2 sentences, tense, specific to these two tributes
- Death commentary: 1 sentence, Claudius style — not sentimental, slightly callous Capitol tone
- No generic filler. Every line references actual names, districts, events from the fact sheet.

Write ONLY a JSON object, no markdown, no backticks:
{
  "openingNarration": "2-3 sentence Capitol announcement opening Day ${day.day}. Reference the arena, living tributes by name or district, and the tension of survival.",
  "interactions": [${(day.interactions||[]).map(i=>`{"playerIds":["${i.a.id}","${i.b.id}"],"text":"1-2 sentence interaction between ${i.a.name.split(' ')[0]} and ${i.b.name.split(' ')[0]} recorded before today's events"}`).join(',')}],
  "deathCommentary": {${deaths.map(d=>`"${d.id}":"Claudius one-liner on ${d.name.split(' ')[0]}'s death — specific, slightly callous Capitol tone"`).join(',')}}
}

Alive tribute IDs for reference: ${alive.map(t=>t.id+':'+t.name.split(' ')[0]).join(', ')}`;
}

// ===== GENERATE AI CONTENT FOR A DAY =====
async function generateAIArenaDay(day){
  const c=document.getElementById('ep-view-container');
  if(c){
    const ev=document.querySelector('.ep-view');
    if(ev) ev.scrollTop=0;
    window.scrollTo(0,0);
    c.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;gap:16px;min-height:200px">
      <div style="font-size:36px;animation:pulse-fire 1.5s ease-in-out infinite">⚔️</div>
      <div style="font-family:'Bebas Neue',cursive;font-size:20px;letter-spacing:0.05em;color:var(--fire)">The Capitol is watching…</div>
      <div id="ai-progress-msg" style="font-size:13px;color:var(--text2)">Generating Day ${day.day}…</div>
    </div>`;
  }

  const prompt=buildArenaDayPrompt(day);
  const raw=await callGemini(prompt);

  if(!raw){ renderStage(0); return; }

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
    if(parsed.deathCommentary){
      day._deathCommentary=parsed.deathCommentary;
    }
    saveGame();
  }catch(e){ console.error('AI parse failed:',e); }

  renderStage(0);
}
