// Hunger Games Simulator — ui.js
// All DOM rendering — arena, tributes, deaths, victor screen

// ===== PORTRAITS =====
function getTributePortrait(t, size=48){
  if(t.customImage) return `<img src="${esc(t.customImage)}" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:50%;border:2px solid ${esc(t.color)}">`;
  const initials=t.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const sz=size;
  return `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${esc(t.color)};display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',cursive;font-size:${Math.floor(sz*0.38)}px;color:#fff;border:2px solid rgba(255,255,255,0.3);flex-shrink:0">${esc(initials)}</div>`;
}

// ===== GAME SIDEBAR =====
function updateGameSidebar(){
  const alive=getActive();
  const fallen=G.cast.filter(c=>c.eliminated);

  const dayEl=document.getElementById('gs-day-num');
  if(dayEl) dayEl.textContent=G.day;

  const aliveEl=document.getElementById('gs-alive-count');
  if(aliveEl) aliveEl.textContent=alive.length+' alive';

  const fallenEl=document.getElementById('gs-fallen-count');
  if(fallenEl) fallenEl.textContent=fallen.length+' fallen';

  // Progress bar
  const total=G.cast.length;
  const dead=fallen.length;
  const pct=Math.round(dead/total*100);
  const bar=document.getElementById('gs-progress-bar');
  const txt=document.getElementById('gs-progress-txt');
  if(bar) bar.style.width=pct+'%';
  if(txt) txt.textContent=`${dead}/${total} fallen`;

  // Tribute list
  const list=document.getElementById('gs-tribute-list');
  if(!list) return;
  list.innerHTML='';
  // Group by district
  DISTRICTS.forEach((d,di)=>{
    const dTributes=alive.filter(t=>t.district===di);
    if(!dTributes.length) return;
    const grp=document.createElement('div');
    grp.style.cssText='margin-bottom:6px';
    grp.innerHTML=`<div style="font-size:9px;font-family:'Space Mono',monospace;color:var(--text3);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:3px">${esc(d.name)}</div>`;
    dTributes.forEach(t=>{
      const row=document.createElement('div');
      row.style.cssText='display:flex;align-items:center;gap:6px;padding:4px 0;cursor:pointer';
      row.onclick=()=>showTributeDetail(t.id);
      const allianceIcon=t.allianceIds.length?'🤝':'';
      const sponsorIcon=G.sponsorHolders.includes(t.id)?'🪙':'';
      row.innerHTML=`${getTributePortrait(t,26)}<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.name.split(' ')[0])}</div><div style="font-size:9px;color:var(--text3)">${esc(t.archetype.replace('The ',''))}${t.kills?` · ${t.kills}⚔`:''}</div></div><span style="font-size:10px">${allianceIcon}${sponsorIcon}</span>`;
      grp.appendChild(row);
    });
    list.appendChild(grp);
  });

  updateStatusTicker();
}

// ===== RENDER STAGE =====
function renderStage(idx){
  if(typeof sfxNav==='function'&&idx>0){sfxNav();if(typeof hapticAdv==='function')hapticAdv();}
  G.stageIndex=idx;
  const day=G.currentDayData;
  const container=document.getElementById('ep-view-container');
  if(!container) return;

  let html='';

  if(idx===0){
    // Day header + opening narration + interactions
    html+=buildDayHeader(day);
    html+=buildOpeningNarrationCard(day);
    if(day.interactions?.length) html+=buildInteractionCards(day);
    html+=buildStageNav(day,0);
  } else if(idx===1){
    // Arena events + deaths
    html+=buildDayHeader(day);
    html+=buildArenaEventsSection(day);
    html+=buildStageNav(day,1);
  } else if(idx===2){
    // Day summary — who's left, kills, alliances
    html+=buildDayHeader(day);
    html+=buildDaySummary(day);
    html+=buildStageNav(day,2);
  }

  container.innerHTML=`<div class="ep-view">${html}</div>`;
  setTimeout(()=>{const ev=document.querySelector('.ep-view');if(ev)ev.scrollTop=0;window.scrollTo(0,0);},50);
  updateGameSidebar();
}

// ===== DAY HEADER =====
function buildDayHeader(day){
  const alive=getActive();
  return `<div class="day-header">
    <div class="day-badge">DAY ${day.day}</div>
    <div class="day-alive-count">${alive.length} TRIBUTE${alive.length!==1?'S':''} REMAIN</div>
    <div class="district-dots">${DISTRICTS.map((d,i)=>{
      const alive2=getActive().filter(t=>t.district===i);
      return `<span class="district-dot" style="background:${esc(d.color)};opacity:${alive2.length?1:0.2}" title="${esc(d.name)}: ${alive2.length} alive"></span>`;
    }).join('')}</div>
  </div>`;
}

// ===== OPENING NARRATION =====
function buildOpeningNarrationCard(day){
  const text=day._aiOpeningNarration||day._openingNarration||'';
  if(!text) return '';
  return `<div class="narrator-card narrator-opening">
    <div class="narrator-kicker">📢 CLAUDIUS TEMPLESMITH</div>
    <div class="narrator-body">${esc(text)}</div>
  </div>`;
}

// ===== INTERACTION CARDS =====
function buildInteractionCards(day){
  if(!day.interactions?.length) return '';
  let html='<div class="stage-block">';
  html+=`<div class="stage-label">⚔️ In the Arena</div>`;
  day.interactions.forEach(i=>{
    const text=i._aiText||buildTributeInteraction(i.a,i.b);
    html+=`<div class="interaction-card">
      <div class="iheader">${getTributePortrait(i.a,32)} <span style="font-size:12px;font-weight:700">${esc(i.a.name.split(' ')[0])}</span>
      <span style="color:var(--text3);font-size:11px;margin:0 6px">×</span>
      ${getTributePortrait(i.b,32)} <span style="font-size:12px;font-weight:700">${esc(i.b.name.split(' ')[0])}</span></div>
      <div class="ibody">${esc(text)}</div>
    </div>`;
  });
  html+='</div>';
  return html;
}

// ===== ARENA EVENTS =====
function buildArenaEventsSection(day){
  if(!day.events?.length) return '<div class="stage-block"><div class="stage-label">No major events</div></div>';
  let html='';

  day.events.forEach(({event,deaths,killers})=>{
    const typeColors={combat:'rgba(232,69,10,0.15)',survival:'rgba(56,189,248,0.10)',hazard:'rgba(168,85,247,0.12)',feast:'rgba(251,191,36,0.12)',sponsor:'rgba(74,222,128,0.10)'};
    const typeIcons={combat:'⚔️',survival:'🌿',hazard:'💀',feast:'🎒',sponsor:'🪙'};
    html+=`<div class="event-card" style="background:${typeColors[event.type]||'rgba(255,255,255,0.04)'}">
      <div class="event-card-type">${typeIcons[event.type]||'🏹'} ${esc(event.type.toUpperCase())}</div>
      <div class="event-card-title">${esc(event.name)}</div>
      <div class="event-card-desc">${esc(event.desc)}</div>`;

    if(deaths.length){
      html+=`<div class="death-list">`;
      deaths.forEach(d=>{
        const killerId=killers[d.id];
        const killer=killerId?G.cast.find(t=>t.id===killerId):null;
        const msg=pick(DEATH_MSGS[event.type==='combat'||event.type==='feast'?'combat':event.type==='survival'?'survival':'hazard']||DEATH_MSGS.combat).replace('{name}',d.name.split(' ')[0]);
        html+=`<div class="death-row">
          <div class="cannon-icon">💥</div>
          ${getTributePortrait(d,38)}
          <div class="death-info">
            <div class="death-name">${esc(d.name)}</div>
            <div class="death-district">${esc(d.districtName)} · ${esc(d.archetype)}</div>
            <div class="death-msg">${esc(msg)}</div>
            ${killer?`<div class="death-killer">Killed by ${esc(killer.name.split(' ')[0])}</div>`:''}
          </div>
        </div>`;
      });
      html+=`</div>`;
    } else {
      html+=`<div style="font-size:12px;color:var(--text2);margin-top:8px;font-style:italic">No tributes died in this event.</div>`;
    }
    html+=`</div>`;
  });

  // Sponsor gift
  if(day.sponsorGift){
    const{recipient,gift}=day.sponsorGift;
    html+=`<div class="event-card" style="background:rgba(74,222,128,0.08);border-color:rgba(74,222,128,0.2)">
      <div class="event-card-type">🪙 SPONSOR GIFT</div>
      <div class="event-card-title">${esc(gift.name)} → ${esc(recipient.name)}</div>
      <div class="event-card-desc">${esc(gift.desc)}</div>
    </div>`;
  }

  return html;
}

// ===== DAY SUMMARY =====
function buildDaySummary(day){
  const alive=getActive();
  const fallen=G.cast.filter(c=>c.eliminated);

  let html=`<div class="stage-block">
    <div class="stage-label">📊 End of Day ${day.day}</div>`;

  // Deaths today
  if(day.deaths?.length){
    html+=`<div class="summary-section">
      <div class="summary-label">💥 Cannon Shots Today (${day.deaths.length})</div>
      <div class="cannon-grid">`;
    day.deaths.forEach(d=>{
      html+=`<div class="cannon-item">${getTributePortrait(d,36)}<div style="font-size:11px;text-align:center;margin-top:4px;color:var(--text3)">${esc(d.name.split(' ')[0])}</div></div>`;
    });
    html+=`</div></div>`;
  }

  // Alive tributes
  html+=`<div class="summary-section">
    <div class="summary-label">⚡ Still Alive (${alive.length})</div>
    <div class="alive-grid">`;
  DISTRICTS.forEach((d,di)=>{
    const da=alive.filter(t=>t.district===di);
    if(!da.length) return;
    da.forEach(t=>{
      const allies=getTributeAllies(t).map(id=>G.cast.find(c=>c.id===id)?.name.split(' ')[0]).filter(Boolean);
      html+=`<div class="alive-card" onclick="showTributeDetail('${esc(t.id)}')">
        ${getTributePortrait(t,44)}
        <div style="font-size:11px;font-weight:700;margin-top:4px">${esc(t.name.split(' ')[0])}</div>
        <div style="font-size:9px;color:var(--text3)">${esc(d.name)}</div>
        ${t.kills?`<div style="font-size:9px;color:var(--fire)">⚔ ${t.kills} kill${t.kills!==1?'s':''}</div>`:''}
        ${allies.length?`<div style="font-size:9px;color:var(--text2)">🤝 ${allies.slice(0,2).join(', ')}</div>`:''}
      </div>`;
    });
  });
  html+=`</div></div>`;

  // Kill leaderboard
  const killers=alive.filter(t=>t.kills>0).sort((a,b)=>b.kills-a.kills).slice(0,5);
  if(killers.length){
    html+=`<div class="summary-section">
      <div class="summary-label">⚔️ Kill Count</div>`;
    killers.forEach((t,i)=>{
      html+=`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:12px;color:var(--text3);width:16px">${i+1}</span>
        ${getTributePortrait(t,28)}
        <span style="flex:1;font-size:13px">${esc(t.name)}</span>
        <span style="font-family:'DM Mono',monospace;font-size:13px;font-weight:700;color:var(--fire)">${t.kills}</span>
      </div>`;
    });
    html+=`</div>`;
  }

  html+=`</div>`;
  return html;
}

// ===== STAGE NAV =====
function buildStageNav(day, idx){
  const alive=getActive();
  let html=`<div class="ep-stage-nav" id="stage-nav">`;

  if(idx===0){
    html+=`<button class="btn btn-fire" onclick="renderStage(1)">⚔️ Enter the Arena →</button>`;
  } else if(idx===1){
    html+=`<button class="btn btn-fire" onclick="renderStage(2)">📊 Day Summary →</button>`;
  } else if(idx===2){
    if(alive.length<=1){
      html+=`<button class="btn btn-fire" onclick="declareVictor(getActive()[0])">🏆 Declare Victor →</button>`;
    } else {
      html+=`<button class="btn btn-fire" onclick="nextDay()">▶ Day ${(day.day||G.day)+1} →</button>`;
    }
    html+=`<button class="btn btn-outline btn-sm" onclick="showTributeStatus()">👥 All Tributes</button>`;
    html+=`<button class="btn btn-outline btn-sm" onclick="showAllianceStatus()">🤝 Alliances</button>`;
    html+=`<button class="btn btn-outline btn-sm" onclick="saveGame();notify('Saved ✓','win')">💾 Save</button>`;
  }

  html+=`</div>`;
  return html;
}

// ===== TRIBUTE DETAIL MODAL =====
function showTributeDetail(id){
  const t=G.cast.find(c=>c.id===id);
  if(!t) return;
  const allies=getTributeAllies(t).map(aid=>G.cast.find(c=>c.id===aid)).filter(Boolean);
  const stats=[
    {label:'Physical',val:t.physical,color:'var(--fire)'},
    {label:'Mental',val:t.mental,color:'var(--ice)'},
    {label:'Social',val:t.social,color:'#a855f7'},
    {label:'Endurance',val:t.endurance,color:'var(--win)'},
  ];
  const content=`
    <div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:16px">
      ${getTributePortrait(t,64)}
      <div>
        <div style="font-size:20px;font-weight:700">${esc(t.name)}</div>
        <div style="font-size:12px;color:var(--text3)">${esc(t.districtName)} · ${esc(t.archetype)}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:2px">${esc(t.personality)}</div>
        ${t.kills?`<div style="font-size:12px;color:var(--fire);margin-top:4px">⚔️ ${t.kills} kill${t.kills!==1?'s':''}</div>`:''}
        ${t.eliminated?`<div style="font-size:11px;color:#991b1b;margin-top:4px">💀 Fell on Day ${t.elimDay}</div>`:''}
        ${G.sponsorHolders.includes(t.id)?`<div style="font-size:11px;color:var(--win);margin-top:4px">🪙 Has sponsor gift</div>`:''}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
      ${stats.map(s=>`<div style="background:var(--panel2);border-radius:8px;padding:8px 10px">
        <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px">${esc(s.label)}</div>
        <div style="font-size:20px;font-weight:700;color:${s.color};font-family:'DM Mono',monospace">${s.val}</div>
        <div style="height:3px;background:var(--border);border-radius:2px;margin-top:4px"><div style="height:3px;background:${s.color};border-radius:2px;width:${s.val}%"></div></div>
      </div>`).join('')}
    </div>
    ${allies.length?`<div style="margin-bottom:10px"><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Alliance</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
    ${allies.map(a=>`<div style="display:flex;align-items:center;gap:6px;background:var(--panel2);border-radius:6px;padding:5px 8px">${getTributePortrait(a,24)}<span style="font-size:12px">${esc(a.name.split(' ')[0])}</span></div>`).join('')}
    </div></div>`:''}
  `;
  document.getElementById('modal-tribute-content').innerHTML=content;
  openModal('modal-tribute');
}

// ===== ALL TRIBUTES STATUS =====
function showTributeStatus(){
  const alive=getActive();
  const fallen=G.cast.filter(c=>c.eliminated).sort((a,b)=>(b.elimDay||0)-(a.elimDay||0));
  let html=`<div style="margin-bottom:16px">
    <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">⚡ Alive (${alive.length})</div>
    ${alive.map(t=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
      ${getTributePortrait(t,32)}
      <div style="flex:1"><div style="font-size:13px;font-weight:600">${esc(t.name)}</div><div style="font-size:10px;color:var(--text3)">${esc(t.districtName)} · ${esc(t.archetype)}</div></div>
      ${t.kills?`<span style="font-size:11px;color:var(--fire)">⚔ ${t.kills}</span>`:''}
    </div>`).join('')}
  </div>
  <div>
    <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">💀 Fallen (${fallen.length})</div>
    ${fallen.map(t=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);opacity:0.55">
      ${getTributePortrait(t,28)}
      <div style="flex:1"><div style="font-size:12px">${esc(t.name)}</div><div style="font-size:10px;color:var(--text3)">${esc(t.districtName)} · Day ${t.elimDay}</div></div>
    </div>`).join('')}
  </div>`;
  document.getElementById('modal-status-content').innerHTML=html;
  openModal('modal-status');
}

// ===== ALLIANCE STATUS =====
function showAllianceStatus(){
  const alliances=G.alliances.filter(al=>al.members.length>=2);
  let html='';
  if(!alliances.length){
    html='<div style="color:var(--text3);font-size:14px">No active alliances. Every tribute is alone.</div>';
  } else {
    alliances.forEach(al=>{
      const members=al.members.map(id=>G.cast.find(t=>t.id===id)).filter(Boolean);
      const str=al.strength||50;
      const health=str>=70?'strong':str>=40?'shaky':'fragile';
      html+=`<div style="background:var(--panel2);border-radius:10px;padding:12px;margin-bottom:10px">
        <div style="font-size:11px;color:var(--text3);margin-bottom:8px">Alliance · <span style="color:${str>=70?'var(--win)':str>=40?'var(--fire2)':'var(--elim)'}">${health}</span></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${members.map(m=>`<div style="display:flex;align-items:center;gap:6px">${getTributePortrait(m,32)}<span style="font-size:12px">${esc(m.name.split(' ')[0])}</span></div>`).join('')}
        </div>
      </div>`;
    });
  }
  document.getElementById('modal-alliance-content').innerHTML=html;
  openModal('modal-alliance');
}

// ===== VICTOR SCREEN =====
function renderVictorScreen(){
  const container=document.getElementById('ep-view-container');
  if(!container) return;
  const v=G.victor;
  const totalDays=G.day;
  const fallen=G.cast.filter(c=>c.eliminated).sort((a,b)=>(a.elimDay||0)-(b.elimDay||0));

  if(!v){
    container.innerHTML=`<div class="ep-view"><div class="victor-screen"><div style="font-size:32px;margin-bottom:16px">💀</div><div style="font-size:24px;font-weight:700">No Victor</div><div style="font-size:14px;color:var(--text3);margin-top:8px">The arena claimed everyone.</div></div></div>`;
    return;
  }

  container.innerHTML=`<div class="ep-view"><div class="victor-screen">
    <div class="victor-crown">🏆</div>
    <div class="victor-label">VICTOR</div>
    <div class="victor-portrait">${getTributePortrait(v,96)}</div>
    <div class="victor-name">${esc(v.name)}</div>
    <div class="victor-district" style="color:${esc(v.color)}">${esc(v.districtName)} — ${esc(v.archetype)}</div>
    <div class="victor-stats">
      <div class="victor-stat"><div class="victor-stat-val">${totalDays}</div><div class="victor-stat-label">Days</div></div>
      <div class="victor-stat"><div class="victor-stat-val">${v.kills||0}</div><div class="victor-stat-label">Kills</div></div>
      <div class="victor-stat"><div class="victor-stat-val">${G.cast.length-1}</div><div class="victor-stat-label">Defeated</div></div>
    </div>
    <div class="victor-speech">${esc(buildVictorSpeech(v))}</div>
    <div style="margin-top:24px">
      <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px">Order of Elimination</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center">
        ${fallen.map(t=>`<div style="text-align:center;opacity:0.6">
          ${getTributePortrait(t,32)}
          <div style="font-size:9px;color:var(--text3);margin-top:2px">Day ${t.elimDay}</div>
        </div>`).join('')}
      </div>
    </div>
    <div style="display:flex;gap:10px;justify-content:center;margin-top:28px;flex-wrap:wrap">
      <button class="btn btn-fire" onclick="goHome()">🔥 New Games</button>
      <button class="btn btn-outline" onclick="saveGame();notify('Saved ✓','win')">💾 Save</button>
    </div>
  </div></div>`;

  updateGameSidebar();
}

function buildVictorSpeech(v){
  const kills=v.kills||0;
  const arch=v.archetype;
  const speeches={
    'The Career':pick([`I trained for this my entire life. The arena was always going to be mine.`,`Every tribute I faced today — I was ready for them. I was born ready.`]),
    'The Underdog':pick([`Nobody believed I'd make it. I barely believed it myself. But here I am.`,`I was supposed to go home on Day One. The arena had other plans.`]),
    'The Strategist':pick([`Every alliance I formed, every move I made — it was all leading here.`,`The Games are won in the mind before they're won in the arena.`]),
    'The Brute':pick([`I outlasted all of them. Pure and simple.`,`They were strong. I was stronger.`]),
    'The Survivor':pick([`I didn't fight my way through. I endured my way through. There's a difference.`,`The arena tried to kill me every single day. It ran out of time.`]),
    'The Hunter':pick([`I knew this arena better than any of them. That's why I'm standing here.`,`Patience. That's the weapon nobody talks about. I had patience.`]),
    'The Healer':pick([`I kept people alive as long as I could. In the end, I had to survive too.`,`They underestimated me. That was their mistake.`]),
    'The Runner':pick([`I ran when I had to. I fought when I had to. I'm still here.`,`Speed and patience. That's all the arena required of me.`]),
    'The Romantic':pick([`I didn't come here to win. I came here to survive. The winning came after.`,`I made the choices I had to make. I'll have to live with that. At least I get to live.`]),
    'The Tribute':pick([`I don't know how I'm still standing. I genuinely don't know.`,`I'm just a tribute from my district. I just… kept going.`]),
  };
  const base=speeches[arch]||`I survived. That's all there is to say.`;
  const killLine=kills>=3?` ${kills} cannons I'll carry with me.`:kills>=1?` I did what I had to do.`:'';
  return base+killLine;
}

// ===== TRIBUTE GRID (SETUP) =====
function renderTributeGrid(){
  const container=document.getElementById('cast-list-container');
  if(!container) return;
  container.innerHTML='';
  DISTRICTS.forEach((d,di)=>{
    const tributes=G.cast.filter(t=>t.district===di);
    if(!tributes.length) return;
    const section=document.createElement('div');
    section.style.cssText='margin-bottom:16px';
    section.innerHTML=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <div style="width:10px;height:10px;border-radius:50%;background:${esc(d.color)}"></div>
      <div style="font-size:11px;font-weight:700;color:var(--text);text-transform:uppercase;letter-spacing:0.05em">${esc(d.name)}</div>
      <div style="font-size:10px;color:var(--text3)">${esc(d.industry)}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
    ${tributes.map(t=>`<div class="tribute-card" style="border-color:${esc(t.color)}40">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        ${getTributePortrait(t,40)}
        <div>
          <div style="font-size:13px;font-weight:600">${esc(t.name)}</div>
          <div style="font-size:10px;color:var(--text3)">${esc(t.archetype)}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px">
        ${[['Phys',t.physical,'var(--fire)'],['Ment',t.mental,'var(--ice)'],['Soc',t.social,'#a855f7'],['End',t.endurance,'var(--win)']].map(([l,v,c])=>`
        <div style="font-size:9px;color:var(--text3)">${l} <span style="font-weight:700;color:${c}">${v}</span></div>`).join('')}
      </div>
    </div>`).join('')}
    </div>`;
    container.appendChild(section);
  });
}

// ===== MODALS =====
function openModal(id){ document.getElementById(id)?.classList.add('active'); if(typeof sfxOpen==='function')sfxOpen(); }
function closeModal(id){ document.getElementById(id)?.classList.remove('active'); }

// ===== TRIBUTE INTERACTION TEMPLATE =====
function buildTributeInteraction(a,b){
  const rel=G.relationships[a.id]?.[b.id]||40;
  const allied=a.allianceIds.some(id=>b.allianceIds.includes(id));
  if(allied) return pick([
    `${a.name.split(' ')[0]} and ${b.name.split(' ')[0]} stay close in camp, watching the others carefully. Neither says it out loud, but they both know the alliance won't last until the end.`,
    `${b.name.split(' ')[0]} checks ${a.name.split(' ')[0]}'s injuries without being asked. In the arena, small gestures mean everything.`,
    `"We're still in this," ${a.name.split(' ')[0]} tells ${b.name.split(' ')[0]}. Neither of them is sure they believe it.`,
  ]);
  if(rel<30) return pick([
    `${a.name.split(' ')[0]} and ${b.name.split(' ')[0]} cross paths near the waterline. Nobody says anything. The silence is loud enough.`,
    `${a.name.split(' ')[0]} clocks ${b.name.split(' ')[0]}'s position and moves the other direction. In the arena, that's the safest thing to do.`,
  ]);
  return pick([
    `${a.name.split(' ')[0]} watches ${b.name.split(' ')[0]} from across the clearing. They haven't made a move against each other yet. That won't last.`,
    `${b.name.split(' ')[0]} and ${a.name.split(' ')[0]} share what little water they have left. It doesn't mean trust. It means survival.`,
    `"How long do you think you've got?" ${a.name.split(' ')[0]} asks ${b.name.split(' ')[0]}. Neither of them answers honestly.`,
  ]);
}
