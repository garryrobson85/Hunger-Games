// Hunger Games Simulator — engine.js
// Arena day resolution, deaths, sponsor gifts, alliance logic, Gamemaker mode

// ===== SURVIVAL SCORE =====
function survivalScore(tribute, eventStat, isProtected=false){
  const base=tribute[eventStat]||50;
  const sponsorBonus=G.sponsorHolders.includes(tribute.id)?20:0;
  const allianceBonus=tribute.allianceIds.length>0?8:0;
  const protectedBonus=isProtected?14:0;
  const gmProtect=G._gmProtectedId===tribute.id?999:0; // Gamemaker protection = near-invincible this day
  const jitter=rng(-8,8);
  return Math.max(1,base+allyBonus(tribute)+sponsorBonus+allianceBonus+protectedBonus+gmProtect+jitter);
}
function allyBonus(t){
  const allies=getTributeAllies(t).map(id=>getActive().find(a=>a.id===id)).filter(Boolean);
  return allies.some(a=>['The Career','The Brute'].includes(a.archetype)&&a.physical>70)?12:0;
}

function killScore(killer,target){
  const physAdv=killer.physical-target.physical;
  const bonus=['The Career','The Brute','The Hunter'].includes(killer.archetype)?15:0;
  return Math.max(0,50+physAdv+bonus+rng(-10,10));
}

// ===== RESOLVE BLOODBATH DEATHS =====
function getBloodbathDeaths(){
  const s=G.settings.bloodbathDeaths;
  if(s==='random') return rng(4,10);
  return parseInt(s)||6;
}

// ===== RESOLVE MAX DEATHS =====
function getMaxDeaths(){
  const s=G.settings.maxDeaths;
  if(s==='random') return rng(1,4);
  return parseInt(s)||3;
}

// ===== SPONSOR GIFT =====
function maybeGiveSponsorGift(alive){
  if(!G.settings.sponsorGifts) return null;
  if(seededRandom()>0.35) return null;
  const eligible=alive.filter(t=>!G.sponsorHolders.includes(t.id));
  if(!eligible.length) return null;
  const recipient=[...eligible].sort((a,b)=>b.social-a.social)[0];
  const gift=pick(SPONSOR_GIFTS);
  G.sponsorHolders.push(recipient.id);
  recipient[gift.stat]=Math.min(99,recipient[gift.stat]+gift.bonus);
  return{recipient,gift};
}

// ===== RESOLVE ARENA EVENT =====
function resolveArenaEvent(event, alive, forcedTargetId=null){
  const deaths=[],killers={};

  if(event.id==='sponsor_race'){
    return{deaths:[],survivors:[...alive],killers:{},sponsorGift:maybeGiveSponsorGift(alive)};
  }

  // Forced target from Gamemaker (release muttations on specific tribute)
  if(forcedTargetId){
    const target=alive.find(t=>t.id===forcedTargetId);
    if(target&&target.id!==G._gmProtectedId){
      deaths.push(target);
      const potKillers=alive.filter(k=>k.id!==target.id);
      if(potKillers.length){
        const killer=potKillers.sort((a,b)=>killScore(b,target)-killScore(a,target))[0];
        killers[target.id]=killer.id;
        killer.kills=(killer.kills||0)+1;
      }
    }
    const survivors=alive.filter(t=>!deaths.find(d=>d.id===t.id));
    return{deaths,survivors,killers,sponsorGift:null};
  }

  const maxDead=event.id==='cornucopia'
    ? getBloodbathDeaths()
    : rng(1,Math.min(getMaxDeaths(),Math.max(1,Math.floor(alive.length*0.35))));

  const scored=alive.map(t=>{
    const allies=getTributeAllies(t).map(id=>alive.find(a=>a.id===id)).filter(Boolean);
    const isProtected=allies.some(a=>['The Career','The Brute'].includes(a.archetype)&&a.physical>70);
    return{t,score:survivalScore(t,event.stat,isProtected)};
  }).sort((a,b)=>a.score-b.score);

  let killed=0;
  for(let i=0;i<scored.length&&killed<maxDead;i++){
    const{t,score}=scored[i];
    if(t.id===G._gmProtectedId) continue; // Gamemaker protected this tribute
    if(event.type==='survival'&&['The Career','The Brute'].includes(t.archetype)&&seededRandom()<0.6) continue;
    const deathRoll=seededRandom();
    const threshold=event.deadly*(1-(score/200));
    if(deathRoll<threshold){
      deaths.push(t);
      killed++;
      if(event.type==='combat'||event.type==='feast'){
        const potKillers=alive.filter(k=>!deaths.find(d=>d.id===k.id));
        if(potKillers.length){
          const killer=potKillers.sort((a,b)=>killScore(b,t)-killScore(a,t))[0];
          killers[t.id]=killer.id;
          killer.kills=(killer.kills||0)+1;
        }
      }
    }
  }

  // Endgame betrayal
  if(alive.length<=6&&event.type==='combat'&&seededRandom()<0.4){
    const als=G.alliances.filter(al=>al.members.length>=2);
    if(als.length){
      const al=pick(als);
      const members=al.members.map(id=>alive.find(t=>t.id===id)).filter(Boolean);
      if(members.length>=2){
        const weak=members.sort((a,b)=>a.physical-b.physical)[0];
        if(!deaths.find(d=>d.id===weak.id)&&weak.id!==G._gmProtectedId){
          deaths.push(weak);
          const betrayer=members.find(m=>m.id!==weak.id);
          if(betrayer){killers[weak.id]=betrayer.id;betrayer.kills=(betrayer.kills||0)+1;}
          al.members=al.members.filter(m=>m!==weak.id);
          if(al.members.length<2) G.alliances=G.alliances.filter(a=>a.id!==al.id);
        }
      }
    }
  }

  // Death guarantee — after day 3, if 2+ quiet days, this event MUST kill at least 1
  if(G.day>3&&G._quietDays>=2&&killed===0&&alive.length>2){
    const victim=scored.find(({t})=>t.id!==G._gmProtectedId);
    if(victim){
      deaths.push(victim.t);
      const potKillers=alive.filter(k=>k.id!==victim.t.id);
      if(potKillers.length){
        const killer=potKillers.sort((a,b)=>killScore(b,victim.t)-killScore(a,victim.t))[0];
        killers[victim.t.id]=killer.id;
        killer.kills=(killer.kills||0)+1;
      }
    }
  }

  const survivors=alive.filter(t=>!deaths.find(d=>d.id===t.id));
  const sponsorGift=maybeGiveSponsorGift(survivors);
  return{deaths,survivors,killers,sponsorGift};
}

// ===== PICK ARENA EVENT OPTIONS (for Gamemaker to choose from) =====
function pickEventOptions(alive, day){
  if(day===1) return[{...CORNUCOPIA_EVENT}];
  const pool=ARENA_EVENTS.filter(e=>e.id!=='cornucopia'&&e.minAlive<=alive.length);
  if(!pool.length) return[pick(ARENA_EVENTS.filter(e=>e.id!=='cornucopia'))];
  return shuffle(pool).slice(0,3); // return 3 options for Gamemaker to choose
}

// ===== MORE CAMP INTERACTIONS =====
function buildCampInteractions(alive){
  const interactions=[];
  if(!G.settings.confessionals||alive.length<2) return interactions;

  // 2-3 interaction pairs for richer camp life
  const count=alive.length>=8?3:alive.length>=4?2:1;
  const shuffled=shuffle([...alive]);
  const used=new Set();

  for(let i=0;i<shuffled.length&&interactions.length<count;i++){
    const a=shuffled[i];
    if(used.has(a.id)) continue;
    // Find a partner — prefer allies or rivals
    const partner=shuffled.find(b=>b.id!==a.id&&!used.has(b.id));
    if(!partner) break;
    used.add(a.id);
    used.add(partner.id);
    interactions.push({a,b:partner});
  }
  return interactions;
}

// ===== APPLY GAMEMAKER CHOICE =====
// Called when player picks an event from the chooser
function applyGamemakerChoice(eventId){
  const day=G.currentDayData;
  if(!day||!day._eventOptions) return;
  const chosen=day._eventOptions.find(e=>e.id===eventId);
  if(!chosen) return;

  if(typeof sfxWin==='function') sfxWin();

  // Mark chosen
  day._chosenEvent=chosen;
  // Resolve it now
  resolveChosenEvent(chosen);
}

// ===== TARGET A TRIBUTE (Gamemaker mutt release) =====
function gamemakerTargetTribute(tributeId){
  const day=G.currentDayData;
  if(!day) return;
  const alive=getActive();
  const target=alive.find(t=>t.id===tributeId);
  if(!target){notify('Tribute not found or already fallen.');return;}

  const muttEvent={...ARENA_EVENTS.find(e=>e.id==='muttations')||ARENA_EVENTS[0],id:'mutt_targeted',name:'Muttation Strike',desc:`The Gamemakers release muttations directly toward ${target.name.split(' ')[0]}.`};
  const res=resolveArenaEvent(muttEvent,alive,tributeId);

  res.deaths.forEach(d=>{
    const t=G.cast.find(c=>c.id===d.id);
    if(t){t.eliminated=true;t.elimDay=G.day;}
  });
  updateAlliancesForDeaths(res.deaths);

  if(!day.events) day.events=[];
  day.events.push({event:muttEvent,deaths:res.deaths,killers:res.killers});
  if(!day.deaths) day.deaths=[];
  day.deaths=[...day.deaths,...res.deaths];

  closeModal('modal-gm-target');
  notify(`🎯 Muttations sent after ${target.name.split(' ')[0]}`,'win');

  const remaining=getActive();
  if(remaining.length<=1){declareVictor(remaining[0]);return;}
  renderStage(1); // jump to arena view to show the death
}

// ===== PROTECT A TRIBUTE (Sponsor) =====
function gamemakerProtectTribute(tributeId){
  G._gmProtectedId=tributeId;
  const t=G.cast.find(c=>c.id===tributeId);
  closeModal('modal-gm-protect');
  if(t) notify(`🛡️ ${t.name.split(' ')[0]} is under Gamemaker protection today`,'win');
}

// ===== RESOLVE CHOSEN EVENT =====
function resolveChosenEvent(event){
  const alive=getActive();
  const day=G.currentDayData;

  const res=resolveArenaEvent(event,alive);

  res.deaths.forEach(d=>{
    const t=G.cast.find(c=>c.id===d.id);
    if(t){t.eliminated=true;t.elimDay=G.day;}
  });
  updateAlliancesForDeaths(res.deaths);

  day.events=[{event,deaths:res.deaths,killers:res.killers}];
  day.deaths=res.deaths;
  day.killers=res.killers;
  if(res.sponsorGift) day.sponsorGift=res.sponsorGift;

  // Track quiet days
  if(res.deaths.length===0) G._quietDays=(G._quietDays||0)+1;
  else G._quietDays=0;

  // Clear Gamemaker protection after use
  G._gmProtectedId=null;

  saveGame();
  const remaining=getActive();
  if(remaining.length<=1){declareVictor(remaining[0]);return;}
  renderStage(1);
}

// ===== MAIN DAY SETUP (Gamemaker mode — player picks event) =====
function computeAndStartDay(){
  try{
    const alive=getActive();
    if(alive.length<=1){declareVictor(alive[0]);return;}

    G.arenaIntensity=Math.min(5,Math.floor((G.cast.length-alive.length)/4));
    maybeFormAlliances();

    const eventOptions=pickEventOptions(alive,G.day);
    const interactions=buildCampInteractions(alive);

    const dayData={
      day:G.day,
      _eventOptions:eventOptions,
      _chosenEvent:null,
      events:[],
      deaths:[],
      killers:{},
      sponsorGift:null,
      interactions,
      alive:alive.map(t=>t.id),
      _openingNarration:buildArenaOpening(G.day),
    };

    G.currentDayData=dayData;
    G.episodeLog.push(dayData);

    // Day 1 auto-resolves (Cornucopia — always happens)
    if(G.day===1){
      resolveChosenEvent(eventOptions[0]);
      if(getGeminiKey()&&typeof generateAIArenaDay==='function') generateAIArenaDay(dayData);
      return;
    }

    saveGame();
    G.stageIndex=0;
    updateGameSidebar();
    renderStage(0); // show camp life + event chooser

    if(getGeminiKey()&&typeof generateAIArenaDay==='function') generateAIArenaDay(dayData);

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
  G.victor=victor||getActive()[0]||null;
  G.stageIndex=99;
  updateGameSidebar();
  renderVictorScreen();
}
