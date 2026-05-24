// Hunger Games Simulator — engine.js
// Arena day resolution, deaths, sponsor gifts, alliance logic

// ===== TRIBUTE SURVIVAL SCORE =====
// Higher = harder to kill in this event type
function survivalScore(tribute, eventStat, isAlly=false){
  const base = tribute[eventStat]||50;
  const allyBonus = isAlly ? 12 : 0;
  const sponsorBonus = G.sponsorHolders.includes(tribute.id) ? 18 : 0;
  const allianceBonus = tribute.allianceIds.length>0 ? 8 : 0;
  const jitter = rng(-8, 8);
  return Math.max(1, base + allyBonus + sponsorBonus + allianceBonus + jitter);
}

// ===== KILL SCORING =====
// How likely a tribute is to kill another — used for credit assignment
function killScore(killer, target){
  const physAdv = killer.physical - target.physical;
  const killArchBonus = ['The Career','The Brute','The Hunter'].includes(killer.archetype) ? 15 : 0;
  return Math.max(0, 50 + physAdv + killArchBonus + rng(-10,10));
}

// ===== SPONSOR GIFT =====
function maybeGiveSponsorGift(alive){
  if(!G.settings.sponsorGifts) return null;
  if(seededRandom()>0.35) return null;
  // Sponsor gifts go to tribute with highest social (crowd favourite)
  const eligible=alive.filter(t=>!G.sponsorHolders.includes(t.id));
  if(!eligible.length) return null;
  const sorted=[...eligible].sort((a,b)=>b.social-a.social);
  const recipient=sorted[0];
  const gift=pick(SPONSOR_GIFTS);
  G.sponsorHolders.push(recipient.id);
  recipient[gift.stat]=Math.min(99,recipient[gift.stat]+gift.bonus);
  return{recipient, gift};
}

// ===== RESOLVE ARENA EVENT =====
// Returns {deaths:[], survivors:[], killers:{tributeId: deathId}, sponsorGift}
function resolveArenaEvent(event, alive){
  const deaths=[], survivors=[];
  const killers={};

  if(event.id==='sponsor_race'){
    // No deaths — sponsor gift only
    return{deaths:[], survivors:[...alive], killers:{}, sponsorGift:maybeGiveSponsorGift(alive)};
  }

  // How many die this event?
  const baseDead = event.id==='cornucopia'
    ? G.settings.bloodbathDeaths||6
    : rng(1, Math.min(G.settings.maxDeaths||3, Math.floor(alive.length*0.4)));

  // Score every tribute's survival chance
  const scored = alive.map(t=>{
    const allies=getTributeAllies(t).map(id=>alive.find(a=>a.id===id)).filter(Boolean);
    const isProtected=allies.some(a=>['The Career','The Brute'].includes(a.archetype)&&a.physical>70);
    return{t, score:survivalScore(t, event.stat, isProtected)};
  }).sort((a,b)=>a.score-b.score); // lowest score = most likely to die

  // Kill the bottom N tributes based on deadly chance
  let killed=0;
  for(let i=0;i<scored.length&&killed<baseDead;i++){
    const{t,score}=scored[i];
    // Career/Brute alliance members protect each other — skip with 60% chance
    if(event.type==='survival'&&['The Career','The Brute'].includes(t.archetype)&&seededRandom()<0.6) continue;
    const deathRoll=seededRandom();
    const threshold = event.deadly * (1-(score/200));
    if(deathRoll<threshold){
      deaths.push(t);
      killed++;
      // Assign credit: most likely killer is highest physical in the arena not dying
      if(event.type==='combat'||event.type==='feast'){
        const potentialKillers=alive.filter(k=>!deaths.find(d=>d.id===k.id));
        if(potentialKillers.length){
          const killer=potentialKillers.sort((a,b)=>killScore(b,t)-killScore(a,t))[0];
          killers[t.id]=killer.id;
          killer.kills=(killer.kills||0)+1;
        }
      }
    }
  }

  // Betray a weaker ally if final few
  if(alive.length<=6&&event.type==='combat'&&seededRandom()<0.35&&deaths.length>0){
    const allies=G.alliances.filter(al=>al.members.length>=2);
    if(allies.length){
      const al=pick(allies);
      const members=al.members.map(id=>alive.find(t=>t.id===id)).filter(Boolean);
      if(members.length>=2){
        const weak=members.sort((a,b)=>a.physical-b.physical)[0];
        if(!deaths.find(d=>d.id===weak.id)){
          deaths.push(weak);
          const betrayer=members.find(m=>m.id!==weak.id);
          if(betrayer){ killers[weak.id]=betrayer.id; betrayer.kills=(betrayer.kills||0)+1; }
          // Alliance breaks
          al.members=al.members.filter(m=>m!==weak.id);
          if(al.members.length<2) G.alliances=G.alliances.filter(a=>a.id!==al.id);
        }
      }
    }
  }

  deaths.forEach(d=>{ if(!survivors.find(s=>s.id===d.id)) return; });
  alive.forEach(t=>{ if(!deaths.find(d=>d.id===t.id)) survivors.push(t); });
  const sponsorGift=maybeGiveSponsorGift(survivors);
  return{deaths, survivors, killers, sponsorGift};
}

// ===== PICK ARENA EVENTS =====
function pickDayEvents(alive, day){
  const events=[];
  if(day===1){
    events.push({...CORNUCOPIA_EVENT});
    return events;
  }
  // Pool of valid events
  const pool=ARENA_EVENTS.filter(e=>e.id!=='cornucopia'&&e.minAlive<=alive.length);
  if(!pool.length) return [pick(ARENA_EVENTS.filter(e=>e.id!=='cornucopia'))];
  // Usually 1 event, sometimes 2
  const count=seededRandom()<0.3?2:1;
  const chosen=shuffle(pool).slice(0,count);
  return chosen;
}

// ===== MAIN DAY COMPUTATION =====
function computeAndStartDay(){
  try{
    const alive=getActive();
    if(alive.length<=1){ declareVictor(); return; }

    G.arenaIntensity=Math.min(5,Math.floor((G.cast.length-alive.length)/4));

    maybeFormAlliances();

    const events=pickDayEvents(alive, G.day);
    let allDeaths=[], allKillers={}, sponsorGift=null, interactions=[];

    // Resolve each event in sequence
    let remaining=[...alive];
    const resolvedEvents=[];
    for(const event of events){
      if(remaining.length<=1) break;
      const res=resolveArenaEvent(event, remaining);
      allDeaths=[...allDeaths,...res.deaths];
      allKillers={...allKillers,...res.killers};
      if(res.sponsorGift&&!sponsorGift) sponsorGift=res.sponsorGift;
      remaining=res.survivors;
      resolvedEvents.push({event, deaths:res.deaths, killers:res.killers});
    }

    // Eliminate dead tributes
    allDeaths.forEach(d=>{
      const t=G.cast.find(c=>c.id===d.id);
      if(t){t.eliminated=true;t.elimDay=G.day;}
    });
    updateAlliancesForDeaths(allDeaths);

    // Generate interactions (pre-event camp moments)
    if(G.settings.confessionals&&alive.length>=2){
      const pair=shuffle(alive).slice(0,2);
      if(pair.length===2) interactions.push({a:pair[0],b:pair[1]});
    }

    const dayData={
      day:G.day,
      events:resolvedEvents,
      deaths:allDeaths,
      killers:allKillers,
      sponsorGift,
      interactions,
      alive:remaining.map(t=>t.id),
      _openingNarration: buildArenaOpening(G.day),
    };

    G.currentDayData=dayData;
    G.episodeLog.push(dayData);
    saveGame();

    if(remaining.length<=1){ declareVictor(remaining[0]); return; }

    G.stageIndex=0;
    updateGameSidebar();
    renderStage(0);

    // AI generation
    if(getGeminiKey()&&typeof generateAIArenaDay==='function'){
      generateAIArenaDay(dayData);
    }

  }catch(err){
    console.error('computeAndStartDay failed:',err);
    notify('⚠️ Day computation failed — see console.');
  }
}

function nextDay(){
  G.day++;
  G.cast.forEach(t=>t.immunity=false);
  saveGame();
  const ev=document.querySelector('.ep-view');
  if(ev) ev.scrollTop=0;
  window.scrollTo(0,0);
  computeAndStartDay();
}

function declareVictor(victor){
  G.victor=victor||null;
  G.stageIndex=99;
  updateGameSidebar();
  renderVictorScreen();
}
