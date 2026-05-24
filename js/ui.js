// Hunger Games Simulator — ui.js
// All DOM rendering — arena, tributes, deaths, victor screen, Gamemaker UI

// ===== PORTRAITS =====
function getTributePortrait(t, size=48){
  if(t.customImage){
    return `<img src="${esc(t.customImage)}" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:50%;border:2px solid ${esc(t.color)};flex-shrink:0">`;
  }
  // Use SVG portrait generator if available (portraits.js loaded)
  if(size>=60&&typeof getPortrait==='function'){
    const svg=getPortrait(t);
    const scaledW=Math.round(size*0.83);
    const scaledH=size;
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid rgba(255,255,255,0.2)">
      <div style="margin-top:-${Math.round(size*0.1)}px;margin-left:-${Math.round((scaledW-size)/2)}px">
        ${svg.replace('width="120" height="145"',`width="${scaledW}" height="${scaledH}"`).replace('width:120px','width:'+scaledW+'px').replace('height:145px','height:'+scaledH+'px')}
      </div>
    </div>`;
  }
  // Fallback: initials circle
  const initials=t.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${esc(t.color)};display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',cursive;font-size:${Math.floor(size*0.38)}px;color:#fff;border:2px solid rgba(255,255,255,0.3);flex-shrink:0">${esc(initials)}</div>`;
}

// ===== SIDEBAR =====
function updateGameSidebar(){
  const alive=getActive();
  const fallen=G.cast.filter(c=>c.eliminated);
  const el=id=>document.getElementById(id);
  if(el('gs-day-num'))   el('gs-day-num').textContent=G.day;
  if(el('gs-alive-count'))  el('gs-alive-count').textContent=alive.length+' alive';
  // Only reveal today's deaths in sidebar after the summary screen (stage 2)
  // Before that, show the pre-day fallen count so deaths aren't spoiled
  const deathsRevealed = G.stageIndex>=2 || G.stageIndex===99;
  const displayFallen = deathsRevealed ? fallen.length : (G._dayStartFallen??fallen.length);
  if(el('gs-fallen-count')) el('gs-fallen-count').textContent=displayFallen+' fallen';
  const pct=Math.round(fallen.length/G.cast.length*100);
  if(el('gs-progress-bar')) el('gs-progress-bar').style.width=pct+'%';
  if(el('gs-progress-txt')) el('gs-progress-txt').textContent=`${fallen.length}/${G.cast.length} fallen`;
  const list=el('gs-tribute-list');
  if(!list) return;
  list.innerHTML='';
  DISTRICTS.forEach((d,di)=>{
    const dt=alive.filter(t=>t.district===di);
    if(!dt.length) return;
    const grp=document.createElement('div');
    grp.style.cssText='margin-bottom:6px';
    grp.innerHTML=`<div style="font-size:9px;font-family:'Space Mono',monospace;color:var(--text3);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:3px">${esc(d.name)}</div>`;
    dt.forEach(t=>{
      const row=document.createElement('div');
      row.style.cssText='display:flex;align-items:center;gap:6px;padding:4px 0;cursor:pointer';
      row.onclick=()=>showTributeDetail(t.id);
      const icons=(t.allianceIds.length?'🤝':'')+(G.sponsorHolders.includes(t.id)?'🪙':'')+(G._gmProtectedId===t.id?'🛡️':'');
      row.innerHTML=`${getTributePortrait(t,26)}<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.name.split(' ')[0])}</div><div style="font-size:9px;color:var(--text3)">${esc(t.archetype.replace('The ',''))}${t.kills?` · ${t.kills}⚔`:''}</div></div><span style="font-size:10px">${icons}</span>`;
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
    // Camp life + Gamemaker event chooser
    html+=buildDayHeader(day);
    html+=buildOpeningNarrationCard(day);
    html+=buildCampLifeSection(day);
    html+=buildGamemakerChooser(day);
  } else if(idx===1){
    // Arena events + deaths
    html+=buildDayHeader(day);
    html+=buildArenaEventsSection(day);
    html+=buildStageNav(day,1);
  } else if(idx===2){
    // Day summary
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
      const a=getActive().filter(t=>t.district===i);
      return `<span class="district-dot" style="background:${esc(d.color)};opacity:${a.length?1:0.2}" title="${esc(d.name)}: ${a.length} alive"></span>`;
    }).join('')}</div>
  </div>`;
}

// ===== NARRATION =====
function buildOpeningNarrationCard(day){
  const text=day._aiOpeningNarration||day._openingNarration||'';
  if(!text) return '';
  return `<div class="narrator-card narrator-opening">
    <div class="narrator-kicker">📢 CLAUDIUS TEMPLESMITH</div>
    <div class="narrator-body">${esc(text)}</div>
  </div>`;
}

// ===== CAMP LIFE (richer interactions) =====
function buildCampLifeSection(day){
  if(!day.interactions?.length) return '';
  let html=`<div class="stage-block">
    <div class="stage-label">🏕️ In the Arena — Before the Event</div>`;

  day.interactions.forEach(i=>{
    const text=i._aiText||buildTributeInteraction(i.a,i.b);
    const rel=G.relationships[i.a.id]?.[i.b.id]||40;
    const allied=i.a.allianceIds.some(id=>i.b.allianceIds.includes(id));
    const relLabel=allied?'🤝 Allies':rel>=65?'👍 Friendly':rel<30?'⚠️ Rivals':'😐 Wary';
    html+=`<div class="interaction-card">
      <div class="iheader">
        ${getTributePortrait(i.a,36)}<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700">${esc(i.a.name.split(' ')[0])}</div><div style="font-size:9px;color:var(--text3)">${esc(i.a.districtName)}</div></div>
        <span style="font-size:10px;color:var(--text3);padding:0 6px">${relLabel}</span>
        <div style="flex:1;min-width:0;text-align:right"><div style="font-size:13px;font-weight:700">${esc(i.b.name.split(' ')[0])}</div><div style="font-size:9px;color:var(--text3)">${esc(i.b.districtName)}</div></div>
        ${getTributePortrait(i.b,36)}
      </div>
      <div class="ibody">${esc(text)}</div>
    </div>`;
  });

  // Active alliances snapshot
  const alliances=G.alliances.filter(al=>al.members.length>=2);
  if(alliances.length){
    html+=`<div style="margin-top:12px;padding:10px 12px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:10px">
      <div style="font-size:9px;font-family:'Space Mono',monospace;color:var(--text3);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:8px">Active Alliances</div>
      <div style="display:flex;flex-direction:column;gap:6px">`;
    alliances.forEach(al=>{
      const members=al.members.map(id=>G.cast.find(t=>t.id===id)).filter(Boolean);
      const str=al.strength||50;
      html+=`<div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:10px;color:${str>=70?'var(--win)':str>=40?'var(--fire2)':'var(--elim)'}">●</span>
        ${members.map(m=>`<div style="display:flex;align-items:center;gap:4px">${getTributePortrait(m,22)}<span style="font-size:11px">${esc(m.name.split(' ')[0])}</span></div>`).join('<span style="font-size:10px;color:var(--text3)"> + </span>')}
      </div>`;
    });
    html+=`</div></div>`;
  }

  html+=`</div>`;
  return html;
}

// ===== GAMEMAKER CHOOSER =====
function buildGamemakerChooser(day){
  const options=day._eventOptions||[];
  const typeIcons={combat:'⚔️',survival:'🌿',hazard:'💀',feast:'🎒',sponsor:'🪙'};
  const typeColors={combat:'rgba(232,69,10,0.08)',survival:'rgba(56,189,248,0.06)',hazard:'rgba(168,85,247,0.08)',feast:'rgba(251,191,36,0.08)',sponsor:'rgba(74,222,128,0.06)'};

  let html=`<div class="gamemaker-panel">
    <div class="gm-header">
      <div class="gm-badge">${day.day===1?'⚔️ THE CORNUCOPIA AWAITS':'⚡ GAMEMAKER CONTROL'}</div>
      <div class="gm-sub">${day.day===1?'The tributes are on their pedestals. The countdown has begun. You control when this starts.':'You are the Head Gamemaker. Choose today\'s arena event — or intervene directly.'}</div>
    </div>
    <div class="gm-options">`;

  options.forEach(event=>{
    const alive=getActive();
    const deathEst=event.id==='cornucopia'?getBloodbathDeaths():
      Math.round(event.deadly*Math.min(getMaxDeaths(),Math.floor(alive.length*0.35)));
    html+=`<div class="gm-option-card" onclick="applyGamemakerChoice('${esc(event.id)}')">
      <div class="gm-option-type">${typeIcons[event.type]||'🏹'} ${esc(event.type.toUpperCase())}</div>
      <div class="gm-option-name">${esc(event.name)}</div>
      <div class="gm-option-desc">${esc(event.desc)}</div>
      <div class="gm-option-meta">
        <span style="color:var(--elim)">~${deathEst} death${deathEst!==1?'s':''}</span>
        <span style="color:var(--text3)">Stat: ${esc(event.stat)}</span>
        <span style="color:var(--fire2)">Deadly: ${Math.round(event.deadly*100)}%</span>
      </div>
    </div>`;
  });

  html+=`</div>
    <div class="gm-powers">
      <div style="font-size:9px;font-family:'Space Mono',monospace;color:var(--text3);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:8px">⚡ Gamemaker Interventions</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-danger btn-sm" onclick="showGMTargetModal()">🎯 Release Muttations</button>
        <button class="btn btn-outline btn-sm" onclick="showGMProtectModal()" style="border-color:rgba(74,222,128,0.3);color:var(--win)">🛡️ Sponsor Protection</button>
        <button class="btn btn-outline btn-sm" onclick="showTributeStatus()">👥 Tributes</button>
        <button class="btn btn-outline btn-sm" onclick="showAllianceStatus()">🤝 Alliances</button>
      </div>
    </div>
  </div>`;

  return html;
}

// ===== GAMEMAKER TARGET MODAL =====
function showGMTargetModal(){
  const alive=getActive();
  let html=`<div style="font-size:13px;color:var(--text2);margin-bottom:14px">Select a tribute to send muttations after. They will almost certainly die.</div>
  <div style="display:flex;flex-direction:column;gap:6px">`;
  alive.forEach(t=>{
    const threat=Math.round((t.physical+t.kills*10)/2);
    html+=`<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--panel2);border-radius:8px;cursor:pointer;border:1.5px solid var(--border);transition:border-color 0.15s" onclick="gamemakerTargetTribute('${esc(t.id)}')" onmouseover="this.style.borderColor='var(--elim)'" onmouseout="this.style.borderColor='var(--border)'">
      ${getTributePortrait(t,36)}
      <div style="flex:1">
        <div style="font-size:13px;font-weight:700">${esc(t.name)}</div>
        <div style="font-size:10px;color:var(--text3)">${esc(t.districtName)} · ${esc(t.archetype)}</div>
      </div>
      <div style="text-align:right;font-size:10px;color:var(--text3)">
        <div style="color:var(--fire)">Phys ${t.physical}</div>
        ${t.kills?`<div style="color:var(--elim)">${t.kills} kills</div>`:''}
        ${t.allianceIds.length?'<div>🤝 Allied</div>':''}
      </div>
    </div>`;
  });
  html+=`</div>`;
  document.getElementById('modal-gm-target-content').innerHTML=html;
  openModal('modal-gm-target');
}

// ===== GAMEMAKER PROTECT MODAL =====
function showGMProtectModal(){
  const alive=getActive();
  let html=`<div style="font-size:13px;color:var(--text2);margin-bottom:14px">Grant Capitol protection to one tribute. They will be shielded from death today.</div>
  <div style="display:flex;flex-direction:column;gap:6px">`;
  alive.forEach(t=>{
    html+=`<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--panel2);border-radius:8px;cursor:pointer;border:1.5px solid var(--border);transition:border-color 0.15s" onclick="gamemakerProtectTribute('${esc(t.id)}')" onmouseover="this.style.borderColor='var(--win)'" onmouseout="this.style.borderColor='var(--border)'">
      ${getTributePortrait(t,36)}
      <div style="flex:1">
        <div style="font-size:13px;font-weight:700">${esc(t.name)}</div>
        <div style="font-size:10px;color:var(--text3)">${esc(t.districtName)} · ${esc(t.archetype)}</div>
      </div>
      <div style="font-size:11px;color:var(--win)">🛡️ Protect</div>
    </div>`;
  });
  html+=`</div>`;
  document.getElementById('modal-gm-protect-content').innerHTML=html;
  openModal('modal-gm-protect');
}

// ===== ARENA EVENTS SECTION =====
function buildArenaEventsSection(day){
  if(!day.events?.length) return `<div class="stage-block"><div class="stage-label">No events today</div></div>`;
  let html='';
  const typeColors={combat:'rgba(232,69,10,0.12)',survival:'rgba(56,189,248,0.08)',hazard:'rgba(168,85,247,0.10)',feast:'rgba(251,191,36,0.10)',sponsor:'rgba(74,222,128,0.08)'};
  const typeIcons={combat:'⚔️',survival:'🌿',hazard:'💀',feast:'🎒',sponsor:'🪙'};

  const _day=day; day.events.forEach(({event,deaths,killers,rolls})=>{ const day=_day;
    html+=`<div class="event-card anim-in" style="background:${typeColors[event.type]||'rgba(255,255,255,0.04)'}">
      <div class="event-card-type">${typeIcons[event.type]||'🏹'} ${esc(event.type.toUpperCase())}</div>
      <div class="event-card-title">${esc(event.name)}</div>
      <div class="event-card-desc">${esc(event.desc)}</div>`;

    if(deaths?.length){
      html+=`<div class="death-list">`;
      deaths.forEach(d=>{
        const killerId=killers?.[d.id];
        const killer=killerId?G.cast.find(t=>t.id===killerId):null;
        const msgPool=DEATH_MSGS[event.type==='combat'||event.type==='feast'?'combat':event.type==='survival'?'survival':'hazard']||DEATH_MSGS.combat;
        const msg=pick(msgPool).replace('{name}',d.name.split(' ')[0]);
        const encounterText=day._encounterNarration?.[d.id]||'';
        const commentText=day._deathCommentary?.[d.id]||'';
        html+=`<div class="death-row">
          <div class="cannon-icon">💥</div>
          ${getTributePortrait(d,42)}
          <div class="death-info">
            <div class="death-name">${esc(d.name)}</div>
            <div class="death-district">${esc(d.districtName)} · ${esc(d.archetype)}</div>
            ${encounterText
              ?`<div class="encounter-narration">${esc(encounterText)}</div>`
              :`<div class="death-msg">${esc(msg)}</div>`}
            ${killer?`<div class="death-killer">⚔️ ${esc(killer.name.split(' ')[0])}</div>`:''}
            ${commentText?`<div class="death-commentary">"${esc(commentText)}"</div>`:''}
          </div>
        </div>`;
      });
      html+=`</div>`;
    } else {
      html+=`<div style="font-size:12px;color:var(--text2);margin-top:8px;font-style:italic;padding:8px 0">The arena was quiet. No cannon fired.</div>`;
    }
    html+=`</div>`;
  });

  // Survivor near-miss narrations (AI generated)
  if(day._encounterNarration){
    const survivorKeys=Object.keys(day._encounterNarration).filter(k=>k.startsWith('survive_'));
    if(survivorKeys.length){
      html+=`<div class="stage-block"><div class="stage-label">⚡ Close Calls</div>`;
      survivorKeys.forEach(k=>{
        const tid=k.replace('survive_','');
        const t=G.cast.find(c=>c.id===tid);
        const text=day._encounterNarration[k];
        if(!t||!text) return;
        html+=`<div class="near-miss-card">
          ${getTributePortrait(t,36)}
          <div class="near-miss-info">
            <div style="font-size:13px;font-weight:700">${esc(t.name.split(' ')[0])}</div>
            <div class="near-miss-text">${esc(text)}</div>
          </div>
        </div>`;
      });
      html+=`</div>`;
    }
  }
  if(day.sponsorGift){
    const{recipient,gift}=day.sponsorGift;
    html+=`<div class="event-card anim-in" style="background:rgba(74,222,128,0.06);border-color:rgba(74,222,128,0.2)">
      <div class="event-card-type">🪙 SPONSOR GIFT</div>
      <div class="event-card-title">${esc(gift.name)} → ${esc(recipient.name)}</div>
      <div class="event-card-desc">${esc(gift.desc)} (+${gift.bonus} ${esc(gift.stat)})</div>
    </div>`;
  }

  html=`<div class="stage-block">${html}</div>`;
  return html;
}

// ===== DAY SUMMARY =====
function buildDaySummary(day){
  const alive=getActive();
  let html=`<div class="stage-block"><div class="stage-label">📊 End of Day ${day.day}</div>`;

  if(day.deaths?.length){
    html+=`<div class="summary-section">
      <div class="summary-label">💥 Cannon Shots Today (${day.deaths.length})</div>
      <div class="cannon-grid">`;
    day.deaths.forEach(d=>{
      html+=`<div class="cannon-item">${getTributePortrait(d,38)}<div style="font-size:10px;text-align:center;margin-top:4px;color:var(--text3)">${esc(d.name.split(' ')[0])}</div><div style="font-size:9px;color:var(--elim);text-align:center">${esc(d.districtName)}</div></div>`;
    });
    html+=`</div></div>`;
  } else {
    html+=`<div class="summary-section"><div style="font-size:13px;color:var(--text3);font-style:italic;padding:8px 0">No cannon shots today. The arena grows impatient.</div></div>`;
  }

  html+=`<div class="summary-section"><div class="summary-label">⚡ Alive (${alive.length})</div><div class="alive-grid">`;
  DISTRICTS.forEach((d,di)=>{
    const da=alive.filter(t=>t.district===di);
    da.forEach(t=>{
      const allies=getTributeAllies(t).map(id=>G.cast.find(c=>c.id===id)?.name.split(' ')[0]).filter(Boolean);
      html+=`<div class="alive-card" onclick="showTributeDetail('${esc(t.id)}')">
        ${getTributePortrait(t,44)}
        <div style="font-size:11px;font-weight:700;margin-top:4px">${esc(t.name.split(' ')[0])}</div>
        <div style="font-size:9px;color:var(--text3)">${esc(d.name)}</div>
        ${t.kills?`<div style="font-size:9px;color:var(--fire)">⚔ ${t.kills}</div>`:''}
        ${allies.length?`<div style="font-size:9px;color:var(--text2)">🤝 ${allies.slice(0,1).join(',')}</div>`:''}
      </div>`;
    });
  });
  html+=`</div></div>`;

  const topKillers=alive.filter(t=>t.kills>0).sort((a,b)=>b.kills-a.kills).slice(0,4);
  if(topKillers.length){
    html+=`<div class="summary-section"><div class="summary-label">⚔️ Kill Leaderboard</div>`;
    topKillers.forEach((t,i)=>{
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
  if(idx===1){
    html+=`<button class="btn btn-fire" onclick="renderStage(2)">📊 Day Summary →</button>`;
    html+=`<button class="btn btn-outline btn-sm" onclick="showTributeStatus()">👥 Tributes</button>`;
  } else if(idx===2){
    if(alive.length<=1||day._victorPending){
      html+=`<button class="btn btn-fire" onclick="declareVictor(getActive()[0]||G.currentDayData?._victorPending)">🏆 Declare Victor →</button>`;
    } else {
      html+=`<button class="btn btn-fire" onclick="nextDay()">▶ Day ${(day.day||G.day)+1} →</button>`;
    }
    html+=`<button class="btn btn-outline btn-sm" onclick="showTributeStatus()">👥 Tributes</button>`;
    html+=`<button class="btn btn-outline btn-sm" onclick="showAllianceStatus()">🤝 Alliances</button>`;
    html+=`<button class="btn btn-outline btn-sm" onclick="saveGame();notify('Saved ✓','win')">💾 Save</button>`;
  }
  html+=`</div>`;
  return html;
}

// ===== TRIBUTE DETAIL =====
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
        ${t.eliminated?`<div style="font-size:11px;color:var(--elim);margin-top:4px">💀 Fell Day ${t.elimDay}</div>`:''}
        ${G.sponsorHolders.includes(t.id)?`<div style="font-size:11px;color:var(--win);margin-top:4px">🪙 Sponsor gift</div>`:''}
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

// ===== ALL TRIBUTES =====
function showTributeStatus(){
  const alive=getActive();
  const fallen=G.cast.filter(c=>c.eliminated).sort((a,b)=>(b.elimDay||0)-(a.elimDay||0));
  let html=`<div style="margin-bottom:16px">
    <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">⚡ Alive (${alive.length})</div>
    ${alive.map(t=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="closeModal('modal-status');showTributeDetail('${esc(t.id)}')">
      ${getTributePortrait(t,32)}
      <div style="flex:1"><div style="font-size:13px;font-weight:600">${esc(t.name)}</div><div style="font-size:10px;color:var(--text3)">${esc(t.districtName)} · ${esc(t.archetype)}</div></div>
      <div style="text-align:right;font-size:10px">
        ${t.kills?`<div style="color:var(--fire)">⚔ ${t.kills}</div>`:''}
        ${t.allianceIds.length?'<div>🤝</div>':''}
      </div>
    </div>`).join('')}
  </div>
  <div>
    <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">💀 Fallen (${fallen.length})</div>
    ${fallen.map(t=>`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);opacity:0.5">
      ${getTributePortrait(t,26)}
      <div style="flex:1"><div style="font-size:12px">${esc(t.name)}</div><div style="font-size:10px;color:var(--text3)">${esc(t.districtName)} · Day ${t.elimDay}</div></div>
    </div>`).join('')}
  </div>`;
  document.getElementById('modal-status-content').innerHTML=html;
  openModal('modal-status');
}

// ===== ALLIANCES =====
function showAllianceStatus(){
  const alliances=G.alliances.filter(al=>al.members.length>=2);
  let html='';
  if(!alliances.length){
    html='<div style="color:var(--text3);font-size:14px">No active alliances.</div>';
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
  const fallen=G.cast.filter(c=>c.eliminated).sort((a,b)=>(a.elimDay||0)-(b.elimDay||0));
  if(!v){
    container.innerHTML=`<div class="ep-view"><div class="victor-screen"><div style="font-size:40px">💀</div><div style="font-size:24px;font-weight:700;margin-top:12px">No Victor</div><div style="color:var(--text3);margin-top:8px">The arena claimed everyone.</div></div></div>`;
    return;
  }
  container.innerHTML=`<div class="ep-view"><div class="victor-screen">
    <div class="victor-crown">🏆</div>
    <div class="victor-label">VICTOR</div>
    <div class="victor-portrait">${getTributePortrait(v,96)}</div>
    <div class="victor-name">${esc(v.name)}</div>
    <div class="victor-district" style="color:${esc(v.color)}">${esc(v.districtName)} — ${esc(v.archetype)}</div>
    <div class="victor-stats">
      <div class="victor-stat"><div class="victor-stat-val">${G.day}</div><div class="victor-stat-label">Days</div></div>
      <div class="victor-stat"><div class="victor-stat-val">${v.kills||0}</div><div class="victor-stat-label">Kills</div></div>
      <div class="victor-stat"><div class="victor-stat-val">${G.cast.length-1}</div><div class="victor-stat-label">Defeated</div></div>
    </div>
    <div class="victor-speech">${esc(buildVictorSpeech(v))}</div>
    <div style="margin-top:24px">
      <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px">Order of Elimination</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center">
        ${fallen.map(t=>`<div style="text-align:center;opacity:0.6">${getTributePortrait(t,30)}<div style="font-size:9px;color:var(--text3);margin-top:2px">Day ${t.elimDay}</div></div>`).join('')}
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
  const speeches={
    'The Career':pick([`I trained for this my entire life. The arena was always going to be mine.`,`Every tribute I faced — I was ready. I was born ready.`]),
    'The Underdog':pick([`Nobody believed I'd make it. I barely believed it myself. But here I am.`,`I was supposed to go home on Day One. The arena had other plans.`]),
    'The Strategist':pick([`Every alliance I formed, every move I made — it was all leading here.`,`The Games are won in the mind before they're won in the arena.`]),
    'The Brute':pick([`I outlasted all of them. Pure and simple.`,`They were strong. I was stronger.`]),
    'The Survivor':pick([`I didn't fight my way through. I endured. There's a difference.`,`The arena tried to kill me every single day. It ran out of time.`]),
    'The Hunter':pick([`I knew this arena better than any of them. That's why I'm standing here.`,`Patience. That's the weapon nobody talks about.`]),
    'The Healer':pick([`I kept people alive as long as I could. In the end, I had to survive too.`,`They underestimated me. That was their mistake.`]),
    'The Runner':pick([`I ran when I had to. I fought when I had to. I'm still here.`,`Speed and patience. That's all the arena required.`]),
    'The Romantic':pick([`I didn't come here to win. I came here to survive. The winning came after.`,`I made the choices I had to make. At least I get to live.`]),
    'The Tribute':pick([`I don't know how I'm still standing. I genuinely don't know.`,`I'm just a tribute from my district. I just kept going.`]),
  };
  const base=speeches[v.archetype]||`I survived. That's all there is to say.`;
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
        ${[['Phys',t.physical,'var(--fire)'],['Ment',t.mental,'var(--ice)'],['Soc',t.social,'#a855f7'],['End',t.endurance,'var(--win)']].map(([l,v,c])=>`<div style="font-size:9px;color:var(--text3)">${l} <span style="font-weight:700;color:${c}">${v}</span></div>`).join('')}
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
    `${a.name.split(' ')[0]} and ${b.name.split(' ')[0]} keep close. Neither talks about what happens when the numbers get small. They don't have to.`,
    `${b.name.split(' ')[0]} checks ${a.name.split(' ')[0]}'s wounds without being asked. In here, that means something.`,
    `"We're still in this," ${a.name.split(' ')[0]} says. ${b.name.split(' ')[0]} doesn't answer. They both know what that means.`,
    `Back to back, watching the trees. ${a.name.split(' ')[0]} and ${b.name.split(' ')[0]} haven't talked about the endgame yet. They're both thinking about it.`,
  ]);
  if(rel<30) return pick([
    `${a.name.split(' ')[0]} clocks ${b.name.split(' ')[0]}'s position across the clearing and moves the other way. Smart.`,
    `Eye contact. Nothing said. Both of them already know.`,
    `${a.name.split(' ')[0]} and ${b.name.split(' ')[0]} cross paths at the water. Neither reaches for a weapon. Not yet.`,
  ]);
  return pick([
    `${a.name.split(' ')[0]} watches ${b.name.split(' ')[0]} from the treeline. Not an ally. Not a target. Not yet.`,
    `"How long do you think you've got?" ${a.name.split(' ')[0]} asks. ${b.name.split(' ')[0]} doesn't answer. That's an answer.`,
    `${b.name.split(' ')[0]} and ${a.name.split(' ')[0]} share water without words. It doesn't mean trust. It means neither of them wants to fight right now.`,
    `${a.name.split(' ')[0]} sizes up ${b.name.split(' ')[0]}. The math is simple: weaker than a Career, stronger than they look.`,
  ]);
}
