// Hunger Games Simulator — engine.js
// D&D-style dice resolution, arena events, Gamemaker mode

// ===== D&D DICE SYSTEM =====
// Roll a d20 + stat modifier vs Difficulty Class (DC)
// Roll >= DC = survive. Roll < DC = in danger. Nat 1 = critical fail. Nat 20 = critical success.

function rollD20(){ return rng(1,20); }
function statMod(stat){ return Math.round((stat-50)/6); } // roughly -8 to +8

const ARCH_BONUS={
  'The Career':    {combat:4, survival:1, hazard:1, feast:3},
  'The Brute':     {combat:3, survival:0, hazard:0, feast:2},
  'The Hunter':    {combat:2, survival:3, hazard:2, feast:1},
  'The Survivor':  {combat:0, survival:4, hazard:2, feast:0},
  'The Runner':    {combat:-1,survival:3, hazard:2, feast:-1},
  'The Strategist':{combat:0, survival:1, hazard:3, feast:1},
  'The Healer':    {combat:-2,survival:2, hazard:2, feast:0},
  'The Romantic':  {combat:-1,survival:1, hazard:0, feast:0},
  'The Underdog':  {combat:-1,survival:0, hazard:0, feast:-1},
  'The Tribute':   {combat:-3,survival:-2,hazard:-2,feast:-2},
};

function tributeDeathCheck(tribute, event, alive){
  const roll=rollD20();
  const mod=statMod(tribute[event.stat]||50);

  // Alliance protection: +3 if sheltered by a Career/Brute
  const allies=getTributeAllies(tribute).map(id=>alive.find(a=>a.id===id)).filter(Boolean);
  const allyBonus=allies.some(a=>['The Career','The Brute'].includes(a.archetype)&&a.physical>68)?3:0;

  // Sponsor gift: +4
  const sponsorBonus=G.sponsorHolders.includes(tribute.id)?4:0;

  // Gamemaker protection: auto-survive
  if(G._gmProtectedId===tribute.id) return{roll,mod,total:20,dc:0,survived:true,critical:'protected'};

  // Archetype bonus for this event type
  const archMap=ARCH_BONUS[tribute.archetype]||{};
  const archBonus=archMap[event.type]||0;

  const total=roll+mod+allyBonus+sponsorBonus+archBonus;

  // DC: base 10, scaled by event deadliness (deadly 0.4 = DC11, deadly 0.9 = DC15)
  const dc=Math.round(9+event.deadly*7);

  // Nat 20 = always survive. Nat 1 = always in danger (must beat DC+5)
  const crit_success=roll===20;
  const crit_fail=roll===1;
  const survived=crit_success||((!crit_fail)&&total>=dc);

  return{roll,mod,total,dc,survived,
    critical:crit_success?'success':crit_fail?'fail':null,
    breakdown:`d20(${roll}) ${mod>=0?'+':''}${mod} arch(${archBonus>=0?'+':''}${archBonus})${allyBonus?` ally(+${allyBonus})`:''}${sponsorBonus?` sponsor(+${sponsorBonus})`:''} = ${total} vs DC${dc}`};
}

// ===== KILL ATTRIBUTION =====
// Weighted random — high physical + archetype favoured but not guaranteed
function assignKiller(victim, notDying, killers){
  const pool=notDying.filter(t=>!killers[victim.id]); // don't double-assign
  if(!pool.length) return null;
  const weighted=pool.map(t=>{
    let w=t.physical;
    if(['The Career','The Brute'].includes(t.archetype)) w+=20;
    if(t.archetype==='The Hunter') w+=12;
    // Allies rarely kill allies
    const alliedWithVictim=getTributeAllies(victim).includes(t.id);
    if(alliedWithVictim) w=Math.max(1,w-35);
    return{t,w:Math.max(1,w)};
  });
  const total=weighted.reduce((s,x)=>s+x.w,0);
  let rand=seededRandom()*total;
  for(const{t,w}of weighted){ rand-=w; if(rand<=0){return t;} }
  return weighted[weighted.length-1].t;
}

// ===== DEATHS & BLOODBATH =====
function getBloodbathDeaths(){
  const s=G.settings.bloodbathDeaths;
  if(s==='random') return rng(3,8);
  return parseInt(s)||6;
}
function getMaxDeaths(){
  const s=G.settings.maxDeaths;
  if(s==='random') return rng(1,4);
  return parseInt(s)||3;
}

// ===== RESOLVE ARENA EVENT =====
function resolveArenaEvent(event, alive, forcedTargetId=null){
  const deaths=[],killers={};

  if(event.id==='sponsor_race'){
    return{deaths:[],survivors:[...alive],killers:{},sponsorGift:maybeGiveSponsorGift(alive),rolls:[]};
  }

  // Forced Gamemaker muttation target
  if(forcedTargetId){
    const target=alive.find(t=>t.id===forcedTargetId);
    if(target&&target.id!==G._gmProtectedId){
      deaths.push(target);
      const killer=assignKiller(target,alive.filter(k=>k.id!==target.id),killers);
      if(killer){killers[target.id]=killer.id;killer.kills=(killer.kills||0)+1;}
    }
    const survivors=alive.filter(t=>!deaths.find(d=>d.id===t.id));
    return{deaths,survivors,killers,sponsorGift:null,rolls:[]};
  }

  const maxDead=event.id==='cornucopia'
    ?getBloodbathDeaths()
    :Math.min(getMaxDeaths(),Math.max(1,Math.floor(alive.length*0.3)));

  // Roll for every tribute
  const rolls=[];
  const failed=[];
  alive.forEach(t=>{
    const result=tributeDeathCheck(t,event,alive);
    rolls.push({tribute:t,...result});
    if(!result.survived) failed.push({t,result});
  });

  // Sort failed by total (lowest = most dead) — take up to maxDead
  failed.sort((a,b)=>a.result.total-b.result.total);
  const toKill=failed.slice(0,maxDead);

  toKill.forEach(({t})=>{
    deaths.push(t);
    const notDying=alive.filter(k=>!deaths.find(d=>d.id===k.id));
    const killer=assignKiller(t,notDying,killers);
    if(killer&&(event.type==='combat'||event.type==='feast')){
      killers[t.id]=killer.id;
      killer.kills=(killer.kills||0)+1;
    }
  });

  // Death guarantee after 2 quiet days (post day 3)
  if(G.day>3&&(G._quietDays||0)>=2&&deaths.length===0&&alive.length>2){
    // Kill the tribute with the lowest total roll
    const victim=rolls.filter(r=>r.tribute.id!==G._gmProtectedId)
      .sort((a,b)=>a.total-b.total)[0];
    if(victim){
      deaths.push(victim.tribute);
      const notDying=alive.filter(k=>k.id!==victim.tribute.id);
      const killer=assignKiller(victim.tribute,notDying,killers);
      if(killer){killers[victim.tribute.id]=killer.id;killer.kills=(killer.kills||0)+1;}
    }
  }

  // Endgame betrayal (small alliances, combat events)
  if(alive.length<=5&&event.type==='combat'&&seededRandom()<0.4&&deaths.length>0){
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

  const survivors=alive.filter(t=>!deaths.find(d=>d.id===t.id));
  return{deaths,survivors,killers,sponsorGift:maybeGiveSponsorGift(survivors),rolls};
}

// ===== SPONSOR GIFT =====
function maybeGiveSponsorGift(alive){
  if(!G.settings.sponsorGifts) return null;
  if(seededRandom()>0.3) return null;
  const eligible=alive.filter(t=>!G.sponsorHolders.includes(t.id));
  if(!eligible.length) return null;
  const recipient=[...eligible].sort((a,b)=>b.social-a.social)[0];
  const gift=pick(SPONSOR_GIFTS);
  G.sponsorHolders.push(recipient.id);
  recipient[gift.stat]=Math.min(99,recipient[gift.stat]+gift.bonus);
  return{recipient,gift};
}

// ===== PICK EVENT OPTIONS =====
function pickEventOptions(alive,day){
  if(day===1) return[{...CORNUCOPIA_EVENT}];
  const pool=ARENA_EVENTS.filter(e=>e.id!=='cornucopia'&&e.minAlive<=alive.length);
  if(!pool.length) return[pick(ARENA_EVENTS.filter(e=>e.id!=='cornucopia'))];
  return shuffle(pool).slice(0,3);
}

// ===== CAMP INTERACTIONS =====
function buildCampInteractions(alive){
  if((!G.settings.confessionals&&!G.settings.tributeFocus)||alive.length<2) return [];
  const count=alive.length>=8?3:alive.length>=4?2:1;
  const shuffled=shuffle([...alive]);
  const used=new Set();
  const interactions=[];
  for(let i=0;i<shuffled.length&&interactions.length<count;i++){
    const a=shuffled[i];
    if(used.has(a.id)) continue;
    const b=shuffled.find(x=>x.id!==a.id&&!used.has(x.id));
    if(!b) break;
    used.add(a.id);used.add(b.id);
    interactions.push({a,b});
  }
  return interactions;
}

// ===== APPLY GAMEMAKER CHOICE =====
function applyGamemakerChoice(eventId){
  const day=G.currentDayData;
  if(!day||day._resolved) return;
  if(typeof sfxWin==='function') sfxWin();

  if(eventId==='no_action'){
    // Passive day — arena background events, low death chance
    const noActionEvent={
      id:'no_action', name:'The Arena Breathes', type:'survival',
      stat:'endurance', deadly:0.25, minAlive:2,
      desc:'No Gamemaker intervention. Tributes deal with hunger, cold, and each other. The odds of death are low but not zero.',
    };
    day._chosenEvent=noActionEvent;
    resolveChosenEvent(noActionEvent);
    return;
  }

  const chosen=day._eventOptions.find(e=>e.id===eventId);
  if(!chosen) return;
  day._chosenEvent=chosen;
  resolveChosenEvent(chosen);
}

// ===== TARGET TRIBUTE (MUTTATIONS) =====
function gamemakerTargetTribute(tributeId){
  const day=G.currentDayData;
  if(!day) return;
  const alive=getActive();
  const target=alive.find(t=>t.id===tributeId);
  if(!target){notify('Tribute already fallen.');return;}
  const muttEvent={
    id:'mutt_targeted',name:'Muttation Strike',type:'hazard',stat:'physical',deadly:0.95,
    desc:`The Gamemakers direct muttations toward ${target.name.split(' ')[0]}.`
  };
  const res=resolveArenaEvent(muttEvent,alive,tributeId);
  res.deaths.forEach(d=>{
    const t=G.cast.find(c=>c.id===d.id);
    if(t){t.eliminated=true;t.elimDay=G.day;}
  });
  updateAlliancesForDeaths(res.deaths);
  if(!day.events) day.events=[];
  day.events.push({event:muttEvent,deaths:res.deaths,killers:res.killers,rolls:res.rolls});
  day.deaths=[...(day.deaths||[]),...res.deaths];
  closeModal('modal-gm-target');
  notify(`🎯 Muttations released on ${target.name.split(' ')[0]}`,'win');
  const remaining=getActive();
  if(remaining.length<=1){declareVictor(remaining[0]);return;}
  renderStage(1);
}

// ===== PROTECT TRIBUTE =====
function gamemakerProtectTribute(tributeId){
  G._gmProtectedId=tributeId;
  const t=G.cast.find(c=>c.id===tributeId);
  closeModal('modal-gm-protect');
  if(t) notify(`🛡️ ${t.name.split(' ')[0]} is under Capitol protection today`,'win');
  updateGameSidebar();
}

// ===== RESOLVE CHOSEN EVENT =====
function resolveChosenEvent(event){
  const day=G.currentDayData;
  if(!day||day._resolved) return; // prevent double-fire
  day._resolved=true;
  const alive=getActive();
  const res=resolveArenaEvent(event,alive);

  // Mark deaths — but don't reveal in sidebar yet
  res.deaths.forEach(d=>{
    const t=G.cast.find(c=>c.id===d.id);
    if(t){t.eliminated=true;t.elimDay=G.day;}
  });
  updateAlliancesForDeaths(res.deaths);

  day.events=[{event,deaths:res.deaths,killers:res.killers,rolls:res.rolls}];
  day.deaths=res.deaths;
  day.killers=res.killers;
  if(res.sponsorGift) day.sponsorGift=res.sponsorGift;

  if(res.deaths.length===0) G._quietDays=(G._quietDays||0)+1;
  else G._quietDays=0;
  G._gmProtectedId=null;
  // Update psychological state after resolution
  updatePsychAfterDay(res.deaths, getActive());

  saveGame();
  const remaining=getActive();
  if(remaining.length<=1){
    // Don't declare immediately — let user see events first
    day._victorPending=remaining[0]||null;
  }
  // Always go to events view (stage 1) — user sees deaths here, not before
  renderStage(1);
}

// ===== MAIN DAY SETUP =====
function computeAndStartDay(){
  try{
    const alive=getActive();
    if(alive.length<=1){declareVictor(alive[0]);return;}

    G.arenaIntensity=Math.min(5,Math.floor((G.cast.length-alive.length)/4));
    // Seed pre-arranged alliances on day 1 before anything else
    if(G.day===1&&typeof seedInitialAlliances==='function') seedInitialAlliances();
    maybeFormAlliances();

    const eventOptions=pickEventOptions(alive,G.day);
    const interactions=buildCampInteractions(alive);

    const dayData={
      day:G.day,
      _eventOptions:eventOptions,
      _chosenEvent:null,
      _victorPending:null,
      _resolved:false,
      events:[],deaths:[],killers:{},sponsorGift:null,
      interactions,
      alive:alive.map(t=>t.id),
      _openingNarration:buildArenaOpening(G.day),
    };

    // Track how many were fallen BEFORE this day starts — sidebar uses this until stage 2
    G._dayStartFallen=G.cast.filter(c=>c.eliminated).length;

    G.currentDayData=dayData;
    G.episodeLog.push(dayData);

    saveGame();
    G.stageIndex=0;
    updateGameSidebar();
    renderStage(0);

    if(getGeminiKey()&&typeof generateAIArenaDay==='function') generateAIArenaDay(dayData);

  }catch(err){
    console.error('computeAndStartDay failed:',err);
    notify('⚠️ Day failed — see console.');
  }
}

function nextDay(){
  G.day++;
  G.cast.forEach(t=>t.immunity=false);
  G._dayStartFallen=G.cast.filter(c=>c.eliminated).length;
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

// ===== ALLIANCE HELPERS =====
function seedInitialAlliances(){
  // Called once at game start
  if(!G.settings.alliances) return;
  const all=G.cast;

  // 1. Career pack — Districts 1, 2, 4 Careers/Brutes form pre-arranged alliance
  const careerDistricts=[0,1,3]; // indices for D1, D2, D4
  const careers=all.filter(t=>
    careerDistricts.includes(t.district)&&
    ['The Career','The Brute'].includes(t.archetype)
  );
  if(careers.length>=2){
    const al={id:uid(),members:careers.map(t=>t.id),strength:rng(72,88),day:0,type:'career'};
    G.alliances.push(al);
    careers.forEach(t=>t.allianceIds.push(al.id));
  }

  // 2. District partner bonds — high relationship, not automatic alliance
  const districts=[...new Set(all.map(t=>t.district))];
  districts.forEach(di=>{
    const pair=all.filter(t=>t.district===di);
    if(pair.length<2) return;
    const [a,b]=pair;
    // Boost relationship between district partners
    if(!G.relationships[a.id]) G.relationships[a.id]={};
    if(!G.relationships[b.id]) G.relationships[b.id]={};
    const bond=rng(60,82);
    G.relationships[a.id][b.id]=bond;
    G.relationships[b.id][a.id]=bond;
    // Allies unless already in Career pack or if archetype is loner
    const loners=['The Tribute'];
    const aInCareer=a.allianceIds.length>0;
    const bInCareer=b.allianceIds.length>0;
    if(!aInCareer&&!bInCareer&&!loners.includes(a.archetype)&&!loners.includes(b.archetype)&&seededRandom()<0.7){
      const al={id:uid(),members:[a.id,b.id],strength:rng(55,75),day:0,type:'district'};
      G.alliances.push(al);
      a.allianceIds.push(al.id);
      b.allianceIds.push(al.id);
    }
  });
}

function maybeFormAlliances(){
  if(!G.settings.alliances) return;
  const active=getActive();
  if(active.length<3) return;
  active.forEach(t=>{
    if(t.allianceIds.length>0||seededRandom()>0.22) return;
    // Only form new alliances with tributes you have decent relationship with
    const candidates=active.filter(o=>
      o.id!==t.id&&
      o.allianceIds.length===0&&
      (G.relationships[t.id]?.[o.id]||40)>=55
    );
    if(!candidates.length) return;
    const partner=pick(candidates);
    const al={id:uid(),members:[t.id,partner.id],strength:rng(45,72),day:G.day};
    G.alliances.push(al);
    t.allianceIds.push(al.id);
    partner.allianceIds.push(al.id);
  });
}

function updateAlliancesForDeaths(deaths){
  deaths.forEach(d=>{
    G.alliances.forEach(al=>{al.members=al.members.filter(m=>m!==d.id);});
    G.alliances=G.alliances.filter(al=>al.members.length>=2);
    const t=G.cast.find(c=>c.id===d.id);
    if(t) t.allianceIds=[];
  });
}
