// Hunger Games Simulator — data.js
// Districts, archetypes, arena events, tribute templates, narration

const APP_VERSION = '1.0.0';
const RNG_VERSION = 1;

// ===== DISTRICTS =====
const DISTRICTS = [
  {id:1,  name:'District 1',  industry:'Luxury',       color:'#D4AF37', typical:['Career']},
  {id:2,  name:'District 2',  industry:'Masonry',      color:'#C0392B', typical:['Career','Brute']},
  {id:3,  name:'District 3',  industry:'Technology',   color:'#2980B9', typical:['Strategist','Inventor']},
  {id:4,  name:'District 4',  industry:'Fishing',      color:'#1ABC9C', typical:['Career','Hunter']},
  {id:5,  name:'District 5',  industry:'Power',        color:'#8E44AD', typical:['Underdog','Survivor']},
  {id:6,  name:'District 6',  industry:'Transport',    color:'#E67E22', typical:['Runner','Underdog']},
  {id:7,  name:'District 7',  industry:'Lumber',       color:'#27AE60', typical:['Survivor','Brute']},
  {id:8,  name:'District 8',  industry:'Textiles',     color:'#E91E63', typical:['Underdog','Healer']},
  {id:9,  name:'District 9',  industry:'Grain',        color:'#F39C12', typical:['Survivor','Tribute']},
  {id:10, name:'District 10', industry:'Livestock',    color:'#795548', typical:['Brute','Survivor']},
  {id:11, name:'District 11', industry:'Agriculture',  color:'#558B2F', typical:['Hunter','Runner']},
  {id:12, name:'District 12', industry:'Mining',       color:'#607D8B', typical:['Underdog','Tribute']},
];

// ===== TRIBUTE ARCHETYPES =====
const ARCHETYPES = [
  'The Career',       // Trained since birth. Lethal, confident, target
  'The Underdog',     // Overlooked. Surprise wins. Crowd favourite
  'The Strategist',   // Alliances, manipulation, reads the arena
  'The Brute',        // Raw power. Feared. Makes enemies
  'The Survivor',     // Endurance, nature skills, quiet threat
  'The Hunter',       // Tracking, ranged, methodical
  'The Healer',       // Keeps allies alive, low threat profile
  'The Runner',       // Speed, evasion, never stands and fights
  'The Romantic',     // One key alliance, dies or wins with them
  'The Tribute',      // Just trying to survive another day
];

const PERSONALITIES = [
  'Ruthless','Calculated','Defiant','Fearless','Desperate',
  'Loyal','Cunning','Reckless','Stoic','Compassionate',
];

// ===== TRIBUTE NAME POOLS =====
const FIRST_NAMES_M = [
  'Cato','Peeta','Finnick','Thresh','Marvel','Gloss','Brutus','Rue','Gale',
  'Titus','Corin','Ajax','Davan','Lyme','Stave','Blight','Woof','Seeder',
  'Chaff','Haymitch','Beetee','Wiress','Mags','Enobaria',
  'Corvus','Talon','Flint','Reed','Storm','Ash','Slate','Hawk','River',
  'Cinder','Rook','Sable','Crane','Flare','Thorn','Coal','Forge',
];
const FIRST_NAMES_F = [
  'Katniss','Clove','Glimmer','Cashmere','Johanna','Foxface','Rue','Enobaria',
  'Seeder','Cecelia','Wiress','Mags','Portia','Effie',
  'Lyra','Vex','Sera','Wren','Briar','Fern','Ivy','Aura','Lark','Senna',
  'Flint','Reva','Crest','Delia','Oria','Nova','Vesper','Zara','Ember',
  'Calla','Indra','Petra','Vale','Mira','Sable','Rook',
];
const LAST_NAMES = [
  'Abernathy','Everdeen','Mellark','Odair','Hadley','Mason','Vickers','Cross',
  'Stone','Gray','Hawk','Flint','Reed','Crest','Vale','Forge','Ash',
  'Thorn','Crane','Storm','Rook','Sable','Coal','Ember','Lyra',
  'Blight','Stave','Corin','Talon','Sloane','Marsh','Vane','Kest',
];

// ===== ARENA EVENT DATA =====
// type: 'combat' | 'survival' | 'feast' | 'hazard' | 'sponsor' | 'alliance'
// stat: which tribute stat matters most
// minTributes: minimum alive for this event to trigger
// deadlyness: how likely (0-1) to kill vs just wound/scatter
const ARENA_EVENTS = [
  // ── COMBAT ──────────────────────────────────────────────────────
  {id:'career_hunt',    name:'Career Pack Hunt',       type:'combat',   stat:'physical',   deadly:0.85, minAlive:8,  desc:'The Career pack moves through the arena, hunting methodically.'},
  {id:'ambush',         name:'Nighttime Ambush',       type:'combat',   stat:'physical',   deadly:0.75, minAlive:6,  desc:'A tribute strikes from the shadows while others sleep.'},
  {id:'duel',           name:'Cornucopia Standoff',    type:'combat',   stat:'physical',   deadly:0.9,  minAlive:4,  desc:'Two tributes face each other at the Cornucopia. Only one walks away.'},
  {id:'alliance_hunt',  name:'Alliance Sweep',         type:'combat',   stat:'social',     deadly:0.7,  minAlive:8,  desc:'An alliance coordinates to eliminate a specific target.'},
  {id:'betrayal_kill',  name:'Ally Betrayal',          type:'combat',   stat:'mental',     deadly:0.9,  minAlive:5,  desc:'Someone turns on a trusted partner when the numbers get small.'},

  // ── SURVIVAL ────────────────────────────────────────────────────
  {id:'dehydration',    name:'Water Scarcity',         type:'survival', stat:'endurance',  deadly:0.4,  minAlive:6,  desc:'The Gamemakers drain the water sources. Weaker tributes falter.'},
  {id:'wildfire',       name:'Arena Wildfire',         type:'survival', stat:'endurance',  deadly:0.6,  minAlive:5,  desc:'Walls of fire drive tributes toward each other.'},
  {id:'poison_fog',     name:'Tracker Jacker Fog',     type:'survival', stat:'endurance',  deadly:0.5,  minAlive:6,  desc:'Toxic fog rolls through the arena. Hallucinations. Paralysis.'},
  {id:'flood',          name:'Arena Flood',            type:'survival', stat:'endurance',  deadly:0.45, minAlive:8,  desc:'Rising water forces tributes to higher ground — or drowns them.'},
  {id:'cold_snap',      name:'Freezing Night',         type:'survival', stat:'endurance',  deadly:0.35, minAlive:6,  desc:'Temperatures plummet. Tributes without shelter pay the price.'},

  // ── HAZARD ──────────────────────────────────────────────────────
  {id:'muttations',     name:'Muttation Attack',       type:'hazard',   stat:'physical',   deadly:0.7,  minAlive:4,  desc:'The Gamemakers release engineered creatures into the arena.'},
  {id:'tracker_jackers',name:'Tracker Jacker Nest',    type:'hazard',   stat:'mental',     deadly:0.55, minAlive:6,  desc:'A tracker jacker hive is disturbed. Venom claims the slow.'},
  {id:'landmines',      name:'Hidden Mine Field',      type:'hazard',   stat:'mental',     deadly:0.6,  minAlive:8,  desc:'Landmines from the Cornucopia perimeter have been moved.'},
  {id:'acid_rain',      name:'Acid Rain',              type:'hazard',   stat:'endurance',  deadly:0.45, minAlive:6,  desc:'The Capitol poisons the rain. Exposed tributes suffer.'},
  {id:'lightning_tree', name:'Lightning Tree',         type:'hazard',   stat:'mental',     deadly:0.5,  minAlive:6,  desc:'A tree becomes a weapon in the right hands.'},

  // ── FEAST ───────────────────────────────────────────────────────
  {id:'feast',          name:'Cornucopia Feast',       type:'feast',    stat:'physical',   deadly:0.8,  minAlive:5,  desc:'Backpacks at the Cornucopia. Something each tribute desperately needs. Everyone shows up.'},
  {id:'sponsor_race',   name:'Sponsor Supply Drop',    type:'sponsor',  stat:'social',     deadly:0.15, minAlive:3,  desc:'Gifts from sponsors rain down. Medicine. Weapons. Food. Not everyone gets what they need.'},
];

// Cornucopia — Day 1 only, always deadly
const CORNUCOPIA_EVENT = {
  id:'cornucopia', name:'The Cornucopia Bloodbath', type:'combat', stat:'physical',
  deadly:0.95, minAlive:24,
  desc:'The tributes launch off their pedestals. Weapons, supplies, survival gear — all of it piled at the golden horn. The fastest, strongest, most ruthless survive the opening minutes.',
};

// ===== CHALLENGE/STAT MAP =====
const STAT_LABELS = {physical:'Physical',mental:'Mental',social:'Social',endurance:'Endurance'};

// ===== SPONSOR GIFTS =====
const SPONSOR_GIFTS = [
  {id:'medicine',  name:'Medicine Pack',   desc:'Heals wounds and illness. Saves a tribute from a fatal blow.',  stat:'endurance', bonus:15},
  {id:'weapon',    name:'Capitol Weapon',  desc:'A superior blade or bow. Increases lethality in combat.',       stat:'physical',  bonus:20},
  {id:'food',      name:'Food & Water',    desc:'Restores strength. Prevents death from starvation.',            stat:'endurance', bonus:10},
  {id:'antidote',  name:'Antidote',        desc:'Counters poison, tracker jacker venom, and toxic hazards.',     stat:'mental',    bonus:15},
  {id:'fire',      name:'Fire Starter',    desc:'Warmth and cooked food. Prevents exposure deaths.',             stat:'endurance', bonus:12},
  {id:'armour',    name:'Body Armour',     desc:'Reduces physical damage. Makes the wearer harder to kill.',     stat:'physical',  bonus:18},
];

// ===== DEATH MESSAGES =====
// Used by the renderer for variety. {name} is replaced with tribute name.
const DEATH_MSGS = {
  combat:[
    '{name} fell in combat.',
    'The cannon fired for {name}.',
    '{name} did not survive the encounter.',
    '{name} made a fatal mistake.',
    '{name}\'s luck finally ran out.',
    'A tribute the Capitol will remember: {name}.',
  ],
  survival:[
    '{name} could not outlast the arena.',
    'The elements claimed {name}.',
    '{name} succumbed to the Gamemakers\' arena.',
    '{name} was found too late.',
    'Exposure took {name}.',
  ],
  hazard:[
    '{name} did not see it coming.',
    'The arena took {name}.',
    '{name} encountered something they couldn\'t fight.',
    'The Capitol\'s creatures found {name}.',
  ],
  betrayal:[
    '{name} trusted the wrong person.',
    'An ally became an enemy for {name}.',
    '{name} never expected the knife in the back.',
  ],
};

// ===== NARRATOR TEMPLATES =====
// VOICE: Claudius Templesmith / Capitol announcer — theatrical, complicit, occasionally grotesque
function buildArenaOpening(day){
  const alive = getActive();
  const fallen = G.cast.filter(c=>c.eliminated);
  const prev = (G.episodeLog||[]).filter(e=>e.day<day).slice(-1)[0];

  if(day===1){
    const seasonName=G.settings.name||'The Hunger Games';
    const arenaTheme=G.settings.theme||'an undisclosed arena';
    return pick([
      `Welcome. Welcome to the ${seasonName}. Twenty-four tributes have been reaped from their districts and brought to ${arenaTheme}. The Capitol has been waiting. Panem et Circenses — bread and circuses. Let the Games begin.`,
      `Twenty-four tributes. One Victor. The rules are simple: survive. The ${seasonName} begins now on ${arenaTheme}. May the odds be ever in your favour — though the odds, as you know, are rarely in anyone's favour.`,
      `The pedestals are locked. The countdown is running. In moments, twenty-four tributes will sprint toward the Cornucopia and everything in the ${seasonName} will be decided in the first sixty seconds. This is ${arenaTheme}. This is the Capitol's gift to Panem.`,
      `Ladies and gentlemen of the Capitol — your tributes. Twenty-four young men and women, reaped from across Panem, brought to ${arenaTheme} for your entertainment. The ${seasonName} are about to begin. Watch closely. Every single moment matters.`,
    ]);
  }

  // Day after bloodbath
  if(day===2&&fallen.length){
    return pick([
      `The first night in the arena is behind us. ${fallen.length} cannon shot${fallen.length!==1?'s':''} marked the end of the Cornucopia. ${alive.length} tributes remain — scattered, hunting, hiding, planning. Day Two begins.`,
      `${alive.length} tributes woke up this morning. ${fallen.length} did not. The Capitol mourns their fallen tributes, naturally. The survivors have a harder morning ahead of them. Day Two in the arena.`,
    ]);
  }

  // Final tributes
  if(alive.length<=4){
    return pick([
      `${alive.length} tributes remain. After everything the arena has thrown at them, after every cannon shot, every betrayal, every desperate night — it comes down to this. The Capitol is watching.`,
      `We are approaching the end. ${alive.length} left standing. The Gamemakers are watching very closely now — the arena has a way of delivering its Victor when the time is right. Tonight, the final moves are made.`,
      `${alive.length} tributes. The Capitol hasn't slept. This is what the Games are built for — the last handful, the final reckoning. One of these tributes becomes a Victor. The rest become history.`,
    ]);
  }

  // Recent deaths
  if(prev?.deaths?.length){
    const names=prev.deaths.map(d=>d.name.split(' ')[0]);
    const nameStr=names.length===1?names[0]:names.slice(0,-1).join(', ')+' and '+names[names.length-1];
    const haveStr=names.length>1?'s have':'has';
    const timesStr=names.length>1?' multiple times':' again';
    const sStr=names.length>1?'s':'';
    return pick([
      `The cannon${haveStr} fired${timesStr}. ${nameStr} — gone. ${alive.length} remain. The Games continue, as they always do.`,
      `${names.length} tribute${sStr} left the arena since we last spoke. The Capitol notes each name. ${alive.length} are still in play. Day ${day}.`,
      `Yesterday the arena was generous with its body count. ${nameStr} fell. ${alive.length} tributes wake to another morning in the Capitol's arena. They should make it count.`,
    ]);
  }

  return pick([
    `Day ${day}. ${alive.length} tributes remain. The Gamemakers are watching — and when the Games go quiet, they have a way of making them loud again.`,
    `The arena is never still for long. ${alive.length} tributes alive. Alliances are fracturing, supplies are running low, and the Capitol is growing restless. Day ${day} begins.`,
    `${alive.length} tributes. Some are sleeping. Some are hunting. Some are being hunted. The Capitol audience is tuned in from every screen in Panem. Day ${day} of the Games.`,
  ]);
}

function buildArenaEventIntro(event, day){
  const alive=getActive();
  switch(event.type){
    case 'feast': return pick([
      `An announcement echoes across the arena. At dawn, the Cornucopia will be restocked. Something each tribute needs desperately will be waiting. The Gamemakers know what happens next — and so do we.`,
      `The Capitol horn sounds. A feast. Supplies, medicine, weapons — all of it waiting at the Cornucopia. The tributes have heard it. The question is: how badly do they need it?`,
    ]);
    case 'hazard': return pick([
      `The Gamemakers have decided the arena needs adjusting. When the Capitol grows bored, the arena grows dangerous. Something is coming — and the tributes don't know what.`,
      `A hum in the air. A shift in the light. The arena is about to change. ${alive.length} tributes are about to be reminded who built this place and why.`,
    ]);
    case 'survival': return pick([
      `The natural world of this arena has turned hostile. What the tributes couldn't fight with a blade, they'll have to outlast with their bodies. Endurance, strength, desperation.`,
      `The Gamemakers don't always need to send something at the tributes. Sometimes they just take something away.`,
    ]);
    case 'sponsor': return pick([
      `Silver parachutes are descending. The Capitol audience has been generous tonight. Sponsors have been watching — and they've decided some tributes deserve a fighting chance.`,
    ]);
    default: return pick([
      `The arena does not rest. Twenty-four hours a day, seven days — the Gamemakers ensure that no tribute can ever fully relax. Today, that promise is kept.`,
      `It's been too quiet. The Capitol audience knows it. The Gamemakers know it. And somewhere in that arena, ${alive.length} tributes are about to find out it's been too quiet.`,
    ]);
  }
}

// ===== TRIBUTE BUILDER =====
let _namePool = {m:[...FIRST_NAMES_M], f:[...FIRST_NAMES_F], last:[...LAST_NAMES]};
function resetNamePool(){ _namePool={m:[...FIRST_NAMES_M],f:[...FIRST_NAMES_F],last:[...LAST_NAMES]}; }

function makeContestant(districtIdx){
  const district = DISTRICTS[districtIdx%12];
  const isMale = seededRandom()>0.5;
  const pool = isMale?_namePool.m:_namePool.f;
  const fi = rng(0,pool.length-1);
  const firstName = pool.splice(fi,1)[0]||pick(isMale?FIRST_NAMES_M:FIRST_NAMES_F);
  const li = rng(0,_namePool.last.length-1);
  const lastName = _namePool.last.splice(li,1)[0]||pick(LAST_NAMES);

  // Archetype influenced by district
  const typical = district.typical;
  const archetype = seededRandom()<0.6 ? pick(typical) : pick(ARCHETYPES);

  // Stats shaped by archetype
  const base = ()=>rng(45,75);
  let physical=base(), mental=base(), social=base(), endurance=base();

  switch(archetype){
    case 'The Career':    physical=rng(75,95); endurance=rng(70,90); mental=rng(60,80); break;
    case 'The Brute':     physical=rng(80,98); endurance=rng(70,88); social=rng(30,55); break;
    case 'The Strategist':mental=rng(78,95);  social=rng(72,90);  physical=rng(45,65); break;
    case 'The Hunter':    physical=rng(70,88); mental=rng(68,85);  endurance=rng(70,88); break;
    case 'The Survivor':  endurance=rng(78,95);mental=rng(65,80);  physical=rng(55,72); break;
    case 'The Runner':    endurance=rng(75,92);physical=rng(65,80); social=rng(50,70); break;
    case 'The Healer':    mental=rng(72,88);  social=rng(70,88);  physical=rng(40,60); break;
    case 'The Romantic':  social=rng(78,95);  mental=rng(65,80);  physical=rng(50,70); break;
    case 'The Underdog':  physical=rng(50,70); mental=rng(60,78); endurance=rng(58,78); break;
    case 'The Tribute':   // balanced mediocre
      physical=rng(42,62); mental=rng(42,62); social=rng(42,62); endurance=rng(42,62); break;
  }

  const colors = ['#E53935','#8E24AA','#1E88E5','#00ACC1','#43A047',
                  '#FB8C00','#6D4C41','#546E7A','#F06292','#26A69A',
                  '#EF5350','#AB47BC','#42A5F5','#26C6DA','#66BB6A'];

  return {
    id: uid(),
    name: `${firstName} ${lastName}`,
    district: districtIdx,
    districtName: district.name,
    archetype,
    personality: pick(PERSONALITIES),
    color: district.color,
    physical: Math.min(98,physical),
    mental: Math.min(98,mental),
    social: Math.min(98,social),
    endurance: Math.min(98,endurance),
    eliminated: false,
    elimDay: null,
    kills: 0,
    allianceIds: [],
    sponsorGift: null,
    customImage: null,
  };
}

function generateTributes(){
  G.cast=[];
  resetNamePool();
  DISTRICTS.forEach((d,i)=>{
    G.cast.push(makeContestant(i));
    G.cast.push(makeContestant(i));
  });
  notify(`24 tributes reaped from the districts ✓`);
  renderTributeGrid();
  updateTributeCount();
}

function updateTributeCount(){
  const el=document.getElementById('cast-count-display');
  if(el) el.textContent=`(${G.cast.length})`;
  const nav=document.getElementById('cast-nav-count');
  if(nav) nav.textContent=G.cast.length;
}
