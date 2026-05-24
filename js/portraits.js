// No Signal — portraits.js
// SVG portrait generator and custom image upload

// ===== SVG PORTRAIT GENERATOR =====
function generatePortrait(contestant) {
  const c = contestant;
  const hue = parseInt(c.color.slice(1),16);
  const skinTones=['#FDDBB4','#F5C594','#E8A87C','#C68642','#8D5524','#4A2F1A'];
  const hairColors=['#1a1a1a','#3d2b1f','#7B3F00','#C19A6B','#F5DEB3','#FF6B35','#4A0E8F','#2E8B57'];
  const personality = c.personality||'';
  const archetype = c.archetype||'';

  // Deterministic seeding from id
  const seed = c.id.split('').reduce((a,ch)=>a+ch.charCodeAt(0),0);
  const r = (n) => { const x=Math.sin(seed*n)*10000; return x-Math.floor(x); };

  const skinIdx = Math.floor(r(1)*skinTones.length);
  const hairIdx = Math.floor(r(2)*hairColors.length);
  const skinColor = skinTones[skinIdx];
  const hairColor = hairColors[hairIdx];
  const eyeColor = ['#3B2314','#1B4F72','#145A32','#784212'][Math.floor(r(3)*4)];

  // Face shape
  const faceW = 54 + Math.floor(r(4)*14);
  const faceH = 60 + Math.floor(r(5)*16);
  const faceX = 60 - faceW/2;
  const faceY = 28;

  // Hair style based on archetype/personality
  const isVillain = personality==='Villain'||archetype.includes('Villain');
  const isHero = personality==='Hero'||archetype.includes('Hero')||archetype.includes('Favorite');
  const isJock = personality==='Jock'||archetype.includes('Challenge Beast');
  const isNerd = personality==='Nerd'||archetype.includes('Narrator');
  const isWild = personality==='Chaotic'||archetype.includes('Loose Cannon')||personality==='Wildcard';

  // Eye shape
  const eyeSlant = isVillain ? -3 : isHero ? 2 : 0;
  const eyeSize = isNerd ? 7 : isJock ? 5 : 6;
  const browThick = isVillain ? 4 : 2.5;

  // Expression
  const smileAmount = isVillain ? -1 : isHero ? 6 : personality==='Hothead' ? -3 : personality==='Social' ? 8 : 3;

  // Accessories
  const hasGlasses = isNerd || (r(6)>0.85);
  const hasBandana = isJock || isWild;
  const hasEarrings = personality==='Romantic'||personality==='Social';

  // Background gradient using contestant color
  const bg1 = c.color;
  const bg2 = shadeColor(c.color, -40);

  // Hair paths
  let hairPath = '';
  if(isJock) {
    hairPath = `<rect x="${faceX-2}" y="${faceY-4}" width="${faceW+4}" height="18" rx="6" fill="${hairColor}"/>`;
  } else if(isVillain) {
    hairPath = `<path d="M${faceX-4},${faceY+20} Q${60},${faceY-18} ${faceX+faceW+4},${faceY+20} Q${faceX+faceW},${faceY-2} ${faceX+faceW-8},${faceY+10} Q60,${faceY-12} ${faceX+8},${faceY+10} Z" fill="${hairColor}"/>`;
  } else if(isWild) {
    // Messy wild hair
    hairPath = `<path d="M${faceX},${faceY+20} Q${faceX-14},${faceY-20} ${60},${faceY-16} Q${faceX+faceW+14},${faceY-20} ${faceX+faceW},${faceY+20} Q${faceX+faceW-4},${faceY-4} ${60},${faceY-10} Q${faceX+4},${faceY-4} Z" fill="${hairColor}"/>
      <path d="M${faceX-4},${faceY+14} Q${faceX-18},${faceY} ${faceX-10},${faceY-10}" stroke="${hairColor}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M${faceX+faceW+4},${faceY+14} Q${faceX+faceW+18},${faceY} ${faceX+faceW+10},${faceY-10}" stroke="${hairColor}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  } else if(r(7)>0.5) {
    // Long hair
    hairPath = `<path d="M${faceX},${faceY+24} Q${faceX-12},${faceY+60} ${faceX},${faceY+faceH+12} L${faceX-4},${faceY+faceH+16} Q${faceX-8},${faceY+50} ${faceX-4},${faceY+20} Q${faceX},${faceY-16} ${60},${faceY-14} Q${faceX+faceW},${faceY-16} ${faceX+faceW+4},${faceY+20} Q${faceX+faceW+8},${faceY+50} ${faceX+faceW+4},${faceY+faceH+16} L${faceX+faceW},${faceY+faceH+12} Q${faceX+faceW+12},${faceY+60} ${faceX+faceW},${faceY+24} Z" fill="${hairColor}"/>`;
  } else {
    // Medium hair
    hairPath = `<path d="M${faceX+4},${faceY+22} Q${faceX-8},${faceY-10} ${60},${faceY-14} Q${faceX+faceW+8},${faceY-10} ${faceX+faceW-4},${faceY+22} Q${faceX+faceW},${faceY+6} ${faceX+faceW-6},${faceY+2} Q60,${faceY-8} ${faceX+6},${faceY+2} Z" fill="${hairColor}"/>`;
  }

  const bandanaEl = hasBandana ? `<rect x="${faceX}" y="${faceY+2}" width="${faceW}" height="10" rx="3" fill="${c.color}" opacity="0.85"/>
    <line x1="${faceX}" y1="${faceY+2}" x2="${faceX+faceW}" y2="${faceY+2}" stroke="${shadeColor(c.color,-20)}" stroke-width="1.5"/>
    <line x1="${faceX}" y1="${faceY+12}" x2="${faceX+faceW}" y2="${faceY+12}" stroke="${shadeColor(c.color,-20)}" stroke-width="1"/>` : '';

  const glassesEl = hasGlasses ? `<rect x="${60-22}" y="${faceY+faceH*0.32-3}" width="16" height="12" rx="5" fill="none" stroke="#2c3e50" stroke-width="2"/>
    <rect x="${60+6}" y="${faceY+faceH*0.32-3}" width="16" height="12" rx="5" fill="none" stroke="#2c3e50" stroke-width="2"/>
    <line x1="${60-6}" y1="${faceY+faceH*0.32+3}" x2="${60+6}" y2="${faceY+faceH*0.32+3}" stroke="#2c3e50" stroke-width="2"/>` : '';

  const earringEl = hasEarrings ? `<circle cx="${faceX-3}" cy="${faceY+faceH*0.5}" r="3" fill="${c.color}"/>
    <circle cx="${faceX+faceW+3}" cy="${faceY+faceH*0.5}" r="3" fill="${c.color}"/>` : '';

  const eyeY = faceY + faceH*0.35;
  const leftEyeX = 60 - 14;
  const rightEyeX = 60 + 14;

  // Clothing based on archetype
  const clothingColor = isVillain ? '#1a1a2e' : isHero ? '#1B4F72' : isJock ? '#117a3e' : c.color;
  const clothingEl = `<path d="M${faceX-10},${faceY+faceH+40} Q${faceX-4},${faceY+faceH+8} ${60},${faceY+faceH+10} Q${faceX+faceW+4},${faceY+faceH+8} ${faceX+faceW+10},${faceY+faceH+40} Z" fill="${clothingColor}"/>
    ${isVillain?`<path d="M${60-8},${faceY+faceH+10} L${60},${faceY+faceH+28} L${60+8},${faceY+faceH+10}" fill="white" opacity="0.15"/>`:''}
    ${isHero?`<path d="M${60-14},${faceY+faceH+12} L${60},${faceY+faceH+24} L${60+14},${faceY+faceH+12}" fill="white" opacity="0.2"/>`:''}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 145" width="120" height="145">
  <defs>
    <radialGradient id="bg-${c.id}" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="${bg1}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${bg2}" stop-opacity="1"/>
    <\/radialGradient>
    <radialGradient id="face-${c.id}" cx="45%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${lightenColor(skinColor,20)}"/>
      <stop offset="100%" stop-color="${skinColor}"/>
    <\/radialGradient>
    <filter id="shadow-${c.id}">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
    <\/filter>
  <\/defs>
  <rect width="120" height="145" rx="12" fill="url(#bg-${c.id})"/>
  ${clothingEl}
  ${hairPath}
  <rect x="${60-10}" y="${faceY+faceH-4}" width="20" height="20" fill="${skinColor}"/>
  <ellipse cx="${60}" cy="${faceY+faceH*0.5}" rx="${faceW/2}" ry="${faceH/2}" fill="url(#face-${c.id})" filter="url(#shadow-${c.id})"/>
  <ellipse cx="${faceX-4}" cy="${faceY+faceH*0.48}" rx="5" ry="7" fill="${skinColor}"/>
  <ellipse cx="${faceX+faceW+4}" cy="${faceY+faceH*0.48}" rx="5" ry="7" fill="${skinColor}"/>
  ${earringEl}
  <path d="M${leftEyeX-eyeSize},${eyeY-eyeSize-4+eyeSlant} Q${leftEyeX},${eyeY-eyeSize-7} ${leftEyeX+eyeSize},${eyeY-eyeSize-4-eyeSlant}" stroke="${hairColor}" stroke-width="${browThick}" fill="none" stroke-linecap="round"/>
  <path d="M${rightEyeX-eyeSize},${eyeY-eyeSize-4-eyeSlant} Q${rightEyeX},${eyeY-eyeSize-7} ${rightEyeX+eyeSize},${eyeY-eyeSize-4+eyeSlant}" stroke="${hairColor}" stroke-width="${browThick}" fill="none" stroke-linecap="round"/>
  <ellipse cx="${leftEyeX}" cy="${eyeY}" rx="${eyeSize}" ry="${eyeSize*0.8}" fill="white"/>
  <circle cx="${leftEyeX+1}" cy="${eyeY}" r="${eyeSize*0.55}" fill="${eyeColor}"/>
  <circle cx="${leftEyeX+2}" cy="${eyeY-1}" r="${eyeSize*0.2}" fill="white"/>
  <ellipse cx="${rightEyeX}" cy="${eyeY}" rx="${eyeSize}" ry="${eyeSize*0.8}" fill="white"/>
  <circle cx="${rightEyeX+1}" cy="${eyeY}" r="${eyeSize*0.55}" fill="${eyeColor}"/>
  <circle cx="${rightEyeX+2}" cy="${eyeY-1}" r="${eyeSize*0.2}" fill="white"/>
  ${hasGlasses?glassesEl:''}
  <path d="M${60},${eyeY+eyeSize+2} Q${60+5},${eyeY+eyeSize+10} ${60+2},${eyeY+eyeSize+13} Q${60},${eyeY+eyeSize+15} ${60-2},${eyeY+eyeSize+13} Q${60-5},${eyeY+eyeSize+10} ${60},${eyeY+eyeSize+2}" fill="${shadeColor(skinColor,-15)}" opacity="0.6"/>
  <path d="M${60-9},${eyeY+eyeSize+20} Q${60},${eyeY+eyeSize+20+smileAmount} ${60+9},${eyeY+eyeSize+20}" stroke="${shadeColor(skinColor,-30)}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  ${smileAmount>4?`<path d="M${60-7},${eyeY+eyeSize+20} Q${60},${eyeY+eyeSize+24+smileAmount*0.5} ${60+7},${eyeY+eyeSize+20}" fill="${shadeColor(skinColor,-10)}" opacity="0.5"/>`:''}
  ${bandanaEl}
  ${isVillain?`<path d="M${faceX+faceW*0.6},${eyeY-8} L${faceX+faceW*0.7},${eyeY+10}" stroke="${shadeColor(skinColor,-40)}" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>`:''}
  <rect x="6" y="120" width="108" height="19" rx="5" fill="rgba(0,0,0,0.35)"/>
  <text x="60" y="133" text-anchor="middle" font-family="'Bebas Neue', sans-serif" font-size="11" fill="white" letter-spacing="0.5">${c.name.toUpperCase()}<\/text>
<\/svg>`;
}

function shadeColor(hex, percent) {
  const num = parseInt(hex.replace('#',''),16);
  const r=Math.max(0,Math.min(255,(num>>16)+percent));
  const g=Math.max(0,Math.min(255,((num>>8)&0x00FF)+percent));
  const b=Math.max(0,Math.min(255,(num&0x0000FF)+percent));
  return '#'+(b|g<<8|r<<16).toString(16).padStart(6,'0');
}
function lightenColor(hex, percent) { return shadeColor(hex, percent); }

// ===== CUSTOM IMAGE UPLOAD =====
// Triggers the hidden file input for a specific contestant
function triggerImageUpload(id){
  const inp=document.getElementById(`img-input-${id}`);
  if(inp) inp.click();
}

// Handles the file change event — resize & store
function handleImageUpload(id,input){
  const file=input.files&&input.files[0];
  if(!file) return;
  if(!file.type.startsWith('image/')){notify('Please choose an image file');return;}

  const reader=new FileReader();
  reader.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      // Resize to max 256×256 to keep localStorage usage low (~15-30KB per image)
      const MAX=256;
      const canvas=document.createElement('canvas');
      // Crop to portrait aspect ratio (4:5) from centre top
      const srcAspect=img.width/img.height;
      const targetAspect=4/5;
      let sx=0,sy=0,sw=img.width,sh=img.height;
      if(srcAspect>targetAspect){
        // wider than portrait — crop sides
        sw=Math.round(img.height*targetAspect);
        sx=Math.round((img.width-sw)/2);
      } else {
        // taller than portrait — crop from top
        sh=Math.round(img.width/targetAspect);
        sy=0;
      }
      const outW=Math.min(MAX,sw);
      const outH=Math.round(outW/targetAspect);
      canvas.width=outW; canvas.height=outH;
      const ctx=canvas.getContext('2d');
      // Smooth scaling
      ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
      ctx.drawImage(img,sx,sy,sw,sh,0,0,outW,outH);
      const dataUrl=canvas.toDataURL('image/jpeg',0.80);
      applyCustomImage(id,dataUrl);
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
  // Reset input so re-uploading same file triggers onchange
  input.value='';
}

function applyCustomImage(id,dataUrl){
  const c=G.cast.find(x=>x.id===id); if(!c) return;
  c.customImage=dataUrl;
  c._portrait=null; c._portraitKey=null; // invalidate cache
  // Patch the cast card in-place without full re-render (faster)
  const wrap=document.getElementById(`cpu-${id}`);
  if(wrap){
    renderCastList(); // re-render the whole list to pick up changes
  }
  updateTeamsPanel();
  notify(`Photo uploaded for ${c.name.split(' ')[0]}! 📷`,'win');
}

function clearImage(id){
  const c=G.cast.find(x=>x.id===id); if(!c) return;
  c.customImage=null; c._portrait=null; c._portraitKey=null;
  renderCastList();
  updateTeamsPanel();
  notify(`Photo removed — back to generated portrait`);
}

// Bulk upload: present a UI to upload all at once

// ===== PORTRAIT CACHE =====
function getPortrait(t, style=''){
  if(t.customImage){
    return `<img src="${esc(t.customImage)}" style="width:120px;height:145px;object-fit:cover;border-radius:10px;${style}">`;
  }
  const key=`${t.id}|${t.color}|${t.archetype}|${t.personality}`;
  if(t._portraitKey===key&&t._portrait) return t._portrait;
  t._portrait=generatePortrait(t);
  t._portraitKey=key;
  return t._portrait;
}
