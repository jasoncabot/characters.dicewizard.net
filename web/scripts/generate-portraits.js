// Script to generate D&D character portrait SVGs
// Run with: node scripts/generate-portraits.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPECIES = [
  'Aasimar', 'Dragonborn', 'Dwarf', 'Elf', 'Gnome',
  'Goliath', 'Halfling', 'Human', 'Orc', 'Tiefling'
];

const CLASSES = [
  'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter',
  'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer',
  'Warlock', 'Wizard'
];

// Species characteristics
const speciesTraits = {
  Aasimar: { skinTones: ['#f5e6d3', '#e8d4c4', '#ffecd2'], hairColors: ['#f0f0f0', '#ffe066', '#c0c0c0'], eyeColor: '#ffd700', special: 'halo', ears: 'normal' },
  Dragonborn: { skinTones: ['#8b0000', '#006400', '#00008b', '#4b0082', '#b8860b'], hairColors: ['none'], eyeColor: '#ff4500', special: 'scales', ears: 'none' },
  Dwarf: { skinTones: ['#e8b89d', '#d4a574', '#c49a6c'], hairColors: ['#8b4513', '#654321', '#a0522d', '#696969'], eyeColor: '#8b4513', special: 'beard', ears: 'normal' },
  Elf: { skinTones: ['#ffecd2', '#f5e6d3', '#e8d4c4', '#c2b280'], hairColors: ['#f0f0f0', '#ffd700', '#000000', '#8b4513'], eyeColor: '#00ff7f', special: 'none', ears: 'pointed' },
  Gnome: { skinTones: ['#f5e6d3', '#e8b89d', '#d4a574'], hairColors: ['#ff6b35', '#8b4513', '#f0f0f0', '#4169e1'], eyeColor: '#4169e1', special: 'none', ears: 'pointed-small' },
  Goliath: { skinTones: ['#808080', '#696969', '#a9a9a9'], hairColors: ['#000000', '#696969', 'none'], eyeColor: '#4169e1', special: 'tattoos', ears: 'normal' },
  Halfling: { skinTones: ['#f5e6d3', '#e8b89d', '#d4a574'], hairColors: ['#8b4513', '#654321', '#daa520'], eyeColor: '#8b4513', special: 'none', ears: 'normal' },
  Human: { skinTones: ['#f5e6d3', '#e8b89d', '#d4a574', '#8b7355', '#6b4423'], hairColors: ['#000000', '#8b4513', '#654321', '#daa520', '#f0f0f0'], eyeColor: '#8b4513', special: 'none', ears: 'normal' },
  Orc: { skinTones: ['#556b2f', '#6b8e23', '#808000'], hairColors: ['#000000', '#2f4f4f', 'none'], eyeColor: '#ff0000', special: 'tusks', ears: 'pointed' },
  Tiefling: { skinTones: ['#8b0000', '#800080', '#4b0082', '#dc143c'], hairColors: ['#000000', '#8b0000', '#4b0082'], eyeColor: '#ff0000', special: 'horns', ears: 'pointed' }
};

// Class characteristics
const classTraits = {
  Barbarian: { primaryColor: '#8b0000', secondaryColor: '#654321', symbol: 'axe', armor: 'fur', aura: 'none' },
  Bard: { primaryColor: '#9932cc', secondaryColor: '#daa520', symbol: 'lute', armor: 'cloth', aura: 'music' },
  Cleric: { primaryColor: '#ffd700', secondaryColor: '#f0f0f0', symbol: 'holy', armor: 'chainmail', aura: 'divine' },
  Druid: { primaryColor: '#228b22', secondaryColor: '#8b4513', symbol: 'leaf', armor: 'hide', aura: 'nature' },
  Fighter: { primaryColor: '#4682b4', secondaryColor: '#c0c0c0', symbol: 'sword', armor: 'plate', aura: 'none' },
  Monk: { primaryColor: '#daa520', secondaryColor: '#8b4513', symbol: 'fist', armor: 'robes', aura: 'ki' },
  Paladin: { primaryColor: '#ffd700', secondaryColor: '#4169e1', symbol: 'shield', armor: 'plate', aura: 'divine' },
  Ranger: { primaryColor: '#228b22', secondaryColor: '#8b4513', symbol: 'bow', armor: 'leather', aura: 'none' },
  Rogue: { primaryColor: '#2f2f2f', secondaryColor: '#696969', symbol: 'dagger', armor: 'leather', aura: 'shadow' },
  Sorcerer: { primaryColor: '#ff4500', secondaryColor: '#ffd700', symbol: 'flame', armor: 'robes', aura: 'arcane' },
  Warlock: { primaryColor: '#4b0082', secondaryColor: '#9400d3', symbol: 'eye', armor: 'robes', aura: 'eldritch' },
  Wizard: { primaryColor: '#4169e1', secondaryColor: '#9370db', symbol: 'staff', armor: 'robes', aura: 'arcane' }
};

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generatePortrait(species, className) {
  const speciesTrait = speciesTraits[species];
  const classTrait = classTraits[className];
  
  // Create deterministic seed from species+class combination
  const seed = (species + className).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Select colors based on seed
  const skinTone = speciesTrait.skinTones[Math.floor(seededRandom(seed) * speciesTrait.skinTones.length)];
  const hairColor = speciesTrait.hairColors[Math.floor(seededRandom(seed + 1) * speciesTrait.hairColors.length)];
  
  // Generate background gradient based on class
  const bgGradient = `
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${classTrait.primaryColor};stop-opacity:0.3" />
        <stop offset="100%" style="stop-color:#1a1a2e;stop-opacity:1" />
      </linearGradient>
      <linearGradient id="skin" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${skinTone};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${adjustColor(skinTone, -30)};stop-opacity:1" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.5"/>
      </filter>
      ${getAuraGradient(classTrait.aura, classTrait.primaryColor)}
    </defs>`;

  // Generate face shape based on species
  const face = generateFace(species, skinTone);
  
  // Generate ears based on species
  const ears = generateEars(speciesTrait.ears, skinTone);
  
  // Generate hair (if applicable)
  const hair = hairColor !== 'none' ? generateHair(species, hairColor, className) : '';
  
  // Generate eyes
  const eyes = generateEyes(species, speciesTrait.eyeColor);
  
  // Generate special features (horns, tusks, scales, etc.)
  const special = generateSpecialFeatures(speciesTrait.special, species, skinTone, classTrait.primaryColor);
  
  // Generate class-specific elements (armor, symbols, aura)
  const classElements = generateClassElements(className, classTrait);
  
  // Generate aura effect
  const aura = generateAura(classTrait.aura, classTrait.primaryColor);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  ${bgGradient}
  
  <!-- Background -->
  <rect width="200" height="200" fill="url(#bg)"/>
  
  <!-- Aura Effect -->
  ${aura}
  
  <!-- Body/Shoulders -->
  ${generateBody(species, classTrait)}
  
  <!-- Neck -->
  <path d="M85 150 Q100 145 115 150 L115 165 Q100 160 85 165 Z" fill="url(#skin)" filter="url(#shadow)"/>
  
  <!-- Ears (behind head) -->
  ${ears}
  
  <!-- Face -->
  ${face}
  
  <!-- Special Features (behind face details) -->
  ${special}
  
  <!-- Hair -->
  ${hair}
  
  <!-- Eyes -->
  ${eyes}
  
  <!-- Nose & Mouth -->
  ${generateNoseAndMouth(species, skinTone)}
  
  <!-- Class Elements -->
  ${classElements}
  
  <!-- Frame -->
  <rect x="5" y="5" width="190" height="190" fill="none" stroke="${classTrait.secondaryColor}" stroke-width="3" rx="10" opacity="0.5"/>
</svg>`;

  return svg;
}

function adjustColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

function generateFace(species, skinTone) {
  const faceShapes = {
    Aasimar: `
      <defs>
        <filter id="celestialGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <ellipse cx="100" cy="95" rx="42" ry="50" fill="url(#skin)" filter="url(#shadow)"/>
      <ellipse cx="100" cy="95" rx="40" ry="48" fill="none" stroke="#ffd700" stroke-width="1" opacity="0.3" filter="url(#celestialGlow)"/>`,
    Dragonborn: `<path d="M58 70 Q55 95 60 120 Q70 145 100 150 Q130 145 140 120 Q145 95 142 70 Q130 50 100 45 Q70 50 58 70" fill="url(#skin)" filter="url(#shadow)"/>`,
    Dwarf: `<ellipse cx="100" cy="100" rx="45" ry="48" fill="url(#skin)" filter="url(#shadow)"/>`,
    Elf: `<ellipse cx="100" cy="95" rx="38" ry="52" fill="url(#skin)" filter="url(#shadow)"/>`,
    Gnome: `<ellipse cx="100" cy="100" rx="40" ry="42" fill="url(#skin)" filter="url(#shadow)"/>`,
    Goliath: `<ellipse cx="100" cy="95" rx="48" ry="55" fill="url(#skin)" filter="url(#shadow)"/>`,
    Halfling: `<ellipse cx="100" cy="100" rx="38" ry="40" fill="url(#skin)" filter="url(#shadow)"/>`,
    Human: `<ellipse cx="100" cy="95" rx="40" ry="48" fill="url(#skin)" filter="url(#shadow)"/>`,
    Orc: `<path d="M55 70 Q52 100 58 125 Q70 150 100 155 Q130 150 142 125 Q148 100 145 70 Q130 45 100 42 Q70 45 55 70" fill="url(#skin)" filter="url(#shadow)"/>`,
    Tiefling: `<ellipse cx="100" cy="95" rx="40" ry="50" fill="url(#skin)" filter="url(#shadow)"/>`
  };
  return faceShapes[species] || faceShapes.Human;
}

function generateEars(earType, skinTone) {
  switch (earType) {
    case 'pointed':
      return `
        <path d="M55 90 Q45 70 40 50 Q50 65 58 85" fill="url(#skin)" stroke="${adjustColor(skinTone, -20)}" stroke-width="1"/>
        <path d="M145 90 Q155 70 160 50 Q150 65 142 85" fill="url(#skin)" stroke="${adjustColor(skinTone, -20)}" stroke-width="1"/>`;
    case 'pointed-small':
      return `
        <path d="M58 88 Q50 75 48 65 Q55 75 60 85" fill="url(#skin)" stroke="${adjustColor(skinTone, -20)}" stroke-width="1"/>
        <path d="M142 88 Q150 75 152 65 Q145 75 140 85" fill="url(#skin)" stroke="${adjustColor(skinTone, -20)}" stroke-width="1"/>`;
    case 'none':
      return '';
    default:
      return `
        <ellipse cx="56" cy="95" rx="5" ry="8" fill="url(#skin)" stroke="${adjustColor(skinTone, -20)}" stroke-width="1"/>
        <ellipse cx="144" cy="95" rx="5" ry="8" fill="url(#skin)" stroke="${adjustColor(skinTone, -20)}" stroke-width="1"/>`;
  }
}

function generateHair(species, hairColor, className) {
  // Different hair styles based on class
  const shortHair = `
    <ellipse cx="100" cy="60" rx="42" ry="25" fill="${hairColor}"/>
    <path d="M58 70 Q60 50 100 45 Q140 50 142 70" fill="${hairColor}"/>`;
  
  const longHair = `
    <ellipse cx="100" cy="55" rx="45" ry="28" fill="${hairColor}"/>
    <path d="M55 70 Q50 50 100 40 Q150 50 145 70" fill="${hairColor}"/>
    <path d="M55 80 Q50 120 55 160" stroke="${hairColor}" stroke-width="15" fill="none" stroke-linecap="round"/>
    <path d="M145 80 Q150 120 145 160" stroke="${hairColor}" stroke-width="15" fill="none" stroke-linecap="round"/>`;
  
  const wildHair = `
    <path d="M50 70 Q45 40 70 30 Q100 20 130 30 Q155 40 150 70" fill="${hairColor}"/>
    <path d="M55 65 Q40 50 45 35" stroke="${hairColor}" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M145 65 Q160 50 155 35" stroke="${hairColor}" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M100 45 Q100 25 95 20" stroke="${hairColor}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  
  const mohawk = `
    <path d="M90 45 Q95 15 100 10 Q105 15 110 45" fill="${hairColor}"/>
    <path d="M85 55 Q90 25 100 15 Q110 25 115 55" fill="${adjustColor(hairColor, -20)}"/>`;
  
  const braided = `
    <ellipse cx="100" cy="58" rx="43" ry="25" fill="${hairColor}"/>
    <path d="M60 75 Q55 100 50 140" stroke="${hairColor}" stroke-width="10" fill="none"/>
    <path d="M140 75 Q145 100 150 140" stroke="${hairColor}" stroke-width="10" fill="none"/>
    <ellipse cx="50" cy="145" rx="6" ry="8" fill="${adjustColor(hairColor, 30)}"/>
    <ellipse cx="150" cy="145" rx="6" ry="8" fill="${adjustColor(hairColor, 30)}"/>`;
  
  const hooded = `
    <path d="M45 150 Q30 100 45 55 Q60 25 100 20 Q140 25 155 55 Q170 100 155 150" fill="none" stroke="#2f2f2f" stroke-width="12"/>
    <path d="M50 65 Q60 35 100 30 Q140 35 150 65 Q145 50 100 45 Q55 50 50 65" fill="#2f2f2f"/>`;

  // Choose hair style based on class
  const classHairStyles = {
    Barbarian: wildHair,
    Bard: longHair,
    Cleric: shortHair,
    Druid: braided,
    Fighter: shortHair,
    Monk: species === 'Dwarf' ? shortHair : `<ellipse cx="100" cy="60" rx="38" ry="20" fill="${adjustColor(hairColor, -50)}"/>`, // Shaved/bald for monks
    Paladin: shortHair,
    Ranger: braided,
    Rogue: hooded,
    Sorcerer: wildHair,
    Warlock: longHair,
    Wizard: longHair
  };

  // Dragonborn don't have hair - they have frills
  if (species === 'Dragonborn') {
    return `
      <path d="M58 55 Q50 45 45 30 Q55 45 60 55" fill="${adjustColor(speciesTraits.Dragonborn.skinTones[0], 20)}" stroke="${adjustColor(speciesTraits.Dragonborn.skinTones[0], -20)}" stroke-width="1"/>
      <path d="M70 48 Q65 35 62 20 Q70 35 75 48" fill="${adjustColor(speciesTraits.Dragonborn.skinTones[0], 20)}" stroke="${adjustColor(speciesTraits.Dragonborn.skinTones[0], -20)}" stroke-width="1"/>
      <path d="M142 55 Q150 45 155 30 Q145 45 140 55" fill="${adjustColor(speciesTraits.Dragonborn.skinTones[0], 20)}" stroke="${adjustColor(speciesTraits.Dragonborn.skinTones[0], -20)}" stroke-width="1"/>
      <path d="M130 48 Q135 35 138 20 Q130 35 125 48" fill="${adjustColor(speciesTraits.Dragonborn.skinTones[0], 20)}" stroke="${adjustColor(speciesTraits.Dragonborn.skinTones[0], -20)}" stroke-width="1"/>`;
  }

  return classHairStyles[className] || shortHair;
}

function generateEyes(species, eyeColor) {
  const eyeShapes = {
    Dragonborn: `
      <ellipse cx="82" cy="90" rx="8" ry="5" fill="#1a1a1a"/>
      <ellipse cx="118" cy="90" rx="8" ry="5" fill="#1a1a1a"/>
      <ellipse cx="82" cy="90" rx="3" ry="5" fill="${eyeColor}"/>
      <ellipse cx="118" cy="90" rx="3" ry="5" fill="${eyeColor}"/>`,
    default: `
      <ellipse cx="82" cy="90" rx="8" ry="6" fill="#fff"/>
      <ellipse cx="118" cy="90" rx="8" ry="6" fill="#fff"/>
      <circle cx="82" cy="90" r="4" fill="${eyeColor}"/>
      <circle cx="118" cy="90" r="4" fill="${eyeColor}"/>
      <circle cx="83" cy="89" r="2" fill="#fff"/>
      <circle cx="119" cy="89" r="2" fill="#fff"/>`
  };
  
  // Tiefling and some others have special eyes
  if (species === 'Tiefling' || species === 'Aasimar') {
    return `
      <ellipse cx="82" cy="90" rx="8" ry="6" fill="${species === 'Aasimar' ? '#fff' : '#1a1a1a'}"/>
      <ellipse cx="118" cy="90" rx="8" ry="6" fill="${species === 'Aasimar' ? '#fff' : '#1a1a1a'}"/>
      <circle cx="82" cy="90" r="5" fill="${eyeColor}"/>
      <circle cx="118" cy="90" r="5" fill="${eyeColor}"/>
      <circle cx="82" cy="90" r="2" fill="${species === 'Aasimar' ? '#fff' : eyeColor}" opacity="0.7"/>
      <circle cx="118" cy="90" r="2" fill="${species === 'Aasimar' ? '#fff' : eyeColor}" opacity="0.7"/>`;
  }
  
  return eyeShapes[species] || eyeShapes.default;
}

function generateNoseAndMouth(species, skinTone) {
  const features = {
    Dragonborn: `
      <path d="M95 100 L100 115 L105 100" fill="none" stroke="${adjustColor(skinTone, -30)}" stroke-width="2"/>
      <path d="M88 125 Q100 135 112 125" fill="none" stroke="${adjustColor(skinTone, -40)}" stroke-width="2"/>`,
    Orc: `
      <path d="M95 98 Q100 108 105 98" fill="none" stroke="${adjustColor(skinTone, -30)}" stroke-width="2"/>
      <ellipse cx="92" cy="103" rx="4" ry="3" fill="${adjustColor(skinTone, -20)}"/>
      <ellipse cx="108" cy="103" rx="4" ry="3" fill="${adjustColor(skinTone, -20)}"/>
      <path d="M85 130 Q100 138 115 130" fill="none" stroke="${adjustColor(skinTone, -40)}" stroke-width="2"/>`,
    Gnome: `
      <ellipse cx="100" cy="108" rx="8" ry="6" fill="${adjustColor(skinTone, -15)}"/>
      <path d="M90 125 Q100 132 110 125" fill="none" stroke="${adjustColor(skinTone, -30)}" stroke-width="2"/>`,
    default: `
      <path d="M100 95 Q102 105 100 112" fill="none" stroke="${adjustColor(skinTone, -30)}" stroke-width="2"/>
      <path d="M88 125 Q100 132 112 125" fill="none" stroke="${adjustColor(skinTone, -30)}" stroke-width="2"/>`
  };
  return features[species] || features.default;
}

function generateSpecialFeatures(special, species, skinTone, classColor) {
  switch (special) {
    case 'horns':
      return `
        <path d="M70 55 Q60 35 55 15 Q65 30 75 50" fill="#2f2f2f" stroke="#1a1a1a" stroke-width="1"/>
        <path d="M130 55 Q140 35 145 15 Q135 30 125 50" fill="#2f2f2f" stroke="#1a1a1a" stroke-width="1"/>`;
    case 'tusks':
      return `
        <path d="M78 130 Q75 145 78 155" fill="#fffff0" stroke="#d4c9a8" stroke-width="2" stroke-linecap="round"/>
        <path d="M122 130 Q125 145 122 155" fill="#fffff0" stroke="#d4c9a8" stroke-width="2" stroke-linecap="round"/>`;
    case 'scales':
      return `
        <circle cx="65" cy="75" r="3" fill="${adjustColor(skinTone, -20)}" opacity="0.5"/>
        <circle cx="72" cy="68" r="3" fill="${adjustColor(skinTone, -20)}" opacity="0.5"/>
        <circle cx="135" cy="75" r="3" fill="${adjustColor(skinTone, -20)}" opacity="0.5"/>
        <circle cx="128" cy="68" r="3" fill="${adjustColor(skinTone, -20)}" opacity="0.5"/>
        <circle cx="70" cy="115" r="3" fill="${adjustColor(skinTone, -20)}" opacity="0.5"/>
        <circle cx="130" cy="115" r="3" fill="${adjustColor(skinTone, -20)}" opacity="0.5"/>`;
    case 'beard':
      return `
        <path d="M70 115 Q65 140 75 165 Q100 175 125 165 Q135 140 130 115" fill="#654321" opacity="0.9"/>
        <path d="M75 120 Q70 145 80 165" stroke="#4a3520" stroke-width="2" fill="none"/>
        <path d="M125 120 Q130 145 120 165" stroke="#4a3520" stroke-width="2" fill="none"/>
        <path d="M100 125 Q100 155 100 170" stroke="#4a3520" stroke-width="2" fill="none"/>`;
    case 'halo':
      return `
        <defs>
          <filter id="haloGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <ellipse cx="100" cy="32" rx="38" ry="10" fill="#ffd700" opacity="0.15" filter="url(#haloGlow)"/>
        <ellipse cx="100" cy="32" rx="35" ry="8" fill="none" stroke="#ffd700" stroke-width="4" opacity="0.9" filter="url(#haloGlow)"/>
        <ellipse cx="100" cy="32" rx="35" ry="8" fill="none" stroke="#fff" stroke-width="2" opacity="0.6"/>
        <ellipse cx="100" cy="32" rx="32" ry="6" fill="none" stroke="#fffacd" stroke-width="1" opacity="0.4"/>
        <!-- Light rays -->
        <path d="M100 20 L100 10" stroke="#ffd700" stroke-width="2" opacity="0.5"/>
        <path d="M85 22 L80 14" stroke="#ffd700" stroke-width="1.5" opacity="0.4"/>
        <path d="M115 22 L120 14" stroke="#ffd700" stroke-width="1.5" opacity="0.4"/>
        <path d="M70 28 L62 24" stroke="#ffd700" stroke-width="1" opacity="0.3"/>
        <path d="M130 28 L138 24" stroke="#ffd700" stroke-width="1" opacity="0.3"/>`;
    case 'tattoos':
      return `
        <path d="M65 80 L75 75 L65 70" fill="none" stroke="#1a1a2e" stroke-width="2"/>
        <path d="M135 80 L125 75 L135 70" fill="none" stroke="#1a1a2e" stroke-width="2"/>
        <circle cx="100" cy="55" r="5" fill="none" stroke="#1a1a2e" stroke-width="2"/>`;
    default:
      return '';
  }
}

function generateBody(species, classTrait) {
  const armorColors = {
    fur: { primary: '#654321', secondary: '#8b4513', highlight: '#a0522d' },
    cloth: { primary: classTrait.primaryColor, secondary: classTrait.secondaryColor, highlight: adjustColor(classTrait.primaryColor, 30) },
    chainmail: { primary: '#808080', secondary: '#c0c0c0', highlight: '#d3d3d3' },
    hide: { primary: '#8b4513', secondary: '#654321', highlight: '#a0522d' },
    plate: { primary: '#696969', secondary: '#c0c0c0', highlight: '#d3d3d3' },
    leather: { primary: '#8b4513', secondary: '#654321', highlight: '#a0522d' },
    robes: { primary: classTrait.primaryColor, secondary: classTrait.secondaryColor, highlight: adjustColor(classTrait.primaryColor, 30) }
  };
  
  const colors = armorColors[classTrait.armor] || armorColors.cloth;
  
  // Different armor styles
  if (classTrait.armor === 'plate') {
    return `
      <path d="M50 165 Q45 175 40 200 L160 200 Q155 175 150 165 Q125 155 100 158 Q75 155 50 165" fill="${colors.primary}"/>
      <path d="M55 168 Q100 160 145 168 Q140 175 100 172 Q60 175 55 168" fill="${colors.secondary}"/>
      <path d="M70 175 L70 200" stroke="${colors.highlight}" stroke-width="2"/>
      <path d="M130 175 L130 200" stroke="${colors.highlight}" stroke-width="2"/>
      <circle cx="100" cy="178" r="8" fill="${classTrait.primaryColor}" stroke="${colors.highlight}" stroke-width="1"/>`;
  } else if (classTrait.armor === 'chainmail') {
    return `
      <path d="M50 165 Q45 175 40 200 L160 200 Q155 175 150 165 Q125 155 100 158 Q75 155 50 165" fill="${colors.primary}"/>
      <pattern id="chainPattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
        <circle cx="5" cy="5" r="3" fill="none" stroke="${colors.secondary}" stroke-width="0.5"/>
      </pattern>
      <path d="M55 168 Q100 160 145 168 L140 200 L60 200 Z" fill="url(#chainPattern)"/>
      <circle cx="100" cy="178" r="6" fill="${classTrait.primaryColor}"/>`;
  } else if (classTrait.armor === 'leather') {
    return `
      <path d="M50 165 Q45 175 40 200 L160 200 Q155 175 150 165 Q125 155 100 158 Q75 155 50 165" fill="${colors.primary}"/>
      <path d="M60 170 L60 200" stroke="${colors.secondary}" stroke-width="1"/>
      <path d="M80 168 L80 200" stroke="${colors.secondary}" stroke-width="1"/>
      <path d="M120 168 L120 200" stroke="${colors.secondary}" stroke-width="1"/>
      <path d="M140 170 L140 200" stroke="${colors.secondary}" stroke-width="1"/>
      <path d="M70 175 Q100 170 130 175" fill="none" stroke="${colors.secondary}" stroke-width="2"/>`;
  } else if (classTrait.armor === 'fur') {
    return `
      <path d="M50 165 Q45 175 40 200 L160 200 Q155 175 150 165 Q125 155 100 158 Q75 155 50 165" fill="${colors.primary}"/>
      <path d="M50 165 Q55 168 60 165 Q65 168 70 165 Q75 168 80 165 Q85 168 90 165 Q95 168 100 165 Q105 168 110 165 Q115 168 120 165 Q125 168 130 165 Q135 168 140 165 Q145 168 150 165" fill="none" stroke="${colors.secondary}" stroke-width="3"/>`;
  } else if (classTrait.armor === 'robes') {
    return `
      <path d="M50 165 Q45 175 40 200 L160 200 Q155 175 150 165 Q125 155 100 158 Q75 155 50 165" fill="${colors.primary}"/>
      <path d="M75 165 Q100 185 125 165" fill="none" stroke="${colors.secondary}" stroke-width="2"/>
      <path d="M100 165 L100 200" stroke="${colors.secondary}" stroke-width="1"/>
      <circle cx="100" cy="175" r="4" fill="${colors.secondary}"/>`;
  } else {
    return `
      <path d="M50 165 Q45 175 40 200 L160 200 Q155 175 150 165 Q125 155 100 158 Q75 155 50 165" fill="${colors.primary}"/>`;
  }
}

function getAuraGradient(auraType, color) {
  if (auraType === 'none') return '';
  return `
    <radialGradient id="aura" cx="50%" cy="50%" r="50%">
      <stop offset="60%" style="stop-color:${color};stop-opacity:0" />
      <stop offset="100%" style="stop-color:${color};stop-opacity:0.3" />
    </radialGradient>`;
}

function generateAura(auraType, color) {
  switch (auraType) {
    case 'divine':
      return `<circle cx="100" cy="100" r="95" fill="url(#aura)"/>
              <circle cx="100" cy="100" r="85" fill="none" stroke="${color}" stroke-width="1" opacity="0.3" stroke-dasharray="5,5"/>`;
    case 'arcane':
      return `<circle cx="100" cy="100" r="95" fill="url(#aura)"/>
              ${Array.from({length: 8}, (_, i) => {
                const angle = (i * 45) * Math.PI / 180;
                const x = 100 + 80 * Math.cos(angle);
                const y = 100 + 80 * Math.sin(angle);
                return `<circle cx="${x}" cy="${y}" r="3" fill="${color}" opacity="0.5"/>`;
              }).join('')}`;
    case 'eldritch':
      return `<circle cx="100" cy="100" r="95" fill="url(#aura)"/>
              <path d="M100 10 Q110 50 100 100 Q90 50 100 10" fill="${color}" opacity="0.2"/>
              <path d="M190 100 Q150 110 100 100 Q150 90 190 100" fill="${color}" opacity="0.2"/>
              <path d="M100 190 Q90 150 100 100 Q110 150 100 190" fill="${color}" opacity="0.2"/>
              <path d="M10 100 Q50 90 100 100 Q50 110 10 100" fill="${color}" opacity="0.2"/>`;
    case 'nature':
      return `<circle cx="100" cy="100" r="95" fill="url(#aura)"/>
              <path d="M30 180 Q35 170 40 175 Q45 165 50 170" stroke="${color}" stroke-width="2" fill="none" opacity="0.5"/>
              <path d="M150 180 Q155 170 160 175 Q165 165 170 170" stroke="${color}" stroke-width="2" fill="none" opacity="0.5"/>`;
    case 'shadow':
      return `<circle cx="100" cy="100" r="95" fill="url(#aura)"/>
              <rect x="10" y="10" width="180" height="180" fill="none" stroke="#000" stroke-width="1" opacity="0.2" stroke-dasharray="3,7"/>`;
    case 'ki':
      return `<circle cx="100" cy="100" r="95" fill="url(#aura)"/>
              <circle cx="100" cy="100" r="70" fill="none" stroke="${color}" stroke-width="1" opacity="0.3"/>`;
    case 'music':
      return `<circle cx="100" cy="100" r="95" fill="url(#aura)"/>
              <text x="25" y="40" font-size="20" fill="${color}" opacity="0.5">♪</text>
              <text x="165" y="60" font-size="16" fill="${color}" opacity="0.4">♫</text>
              <text x="20" y="170" font-size="18" fill="${color}" opacity="0.4">♩</text>`;
    default:
      return '';
  }
}

function generateClassElements(className, classTrait) {
  const elements = {
    Barbarian: `<path d="M25 130 L15 160 L30 145 L20 180" fill="none" stroke="#8b4513" stroke-width="4"/>`, // Axe handle hint
    Bard: `<ellipse cx="175" cy="150" rx="12" ry="20" fill="#8b4513" stroke="#654321" stroke-width="1"/>
           <path d="M175 130 L175 100" stroke="#8b4513" stroke-width="3"/>
           <path d="M172 105 L178 105" stroke="#daa520" stroke-width="1"/>
           <path d="M172 110 L178 110" stroke="#daa520" stroke-width="1"/>`,
    Cleric: `<path d="M170 165 L170 185 M162 175 L178 175" stroke="#ffd700" stroke-width="3"/>`,
    Druid: `<path d="M170 160 Q175 150 180 160 Q185 170 175 175 Q165 170 170 160" fill="#228b22" stroke="#006400" stroke-width="1"/>
            <path d="M175 175 L175 185" stroke="#8b4513" stroke-width="2"/>`,
    Fighter: `<path d="M20 140 L25 200" stroke="#c0c0c0" stroke-width="4"/>
              <path d="M15 145 L30 135" stroke="#c0c0c0" stroke-width="3"/>`,
    Monk: `<circle cx="100" cy="175" r="8" fill="none" stroke="#daa520" stroke-width="2"/>
           <circle cx="100" cy="175" r="3" fill="#daa520"/>`,
    Paladin: `<path d="M168 155 L168 190 L182 190 L182 155 L175 145 Z" fill="#4169e1" stroke="#ffd700" stroke-width="2"/>
              <path d="M175 160 L175 180 M170 170 L180 170" stroke="#ffd700" stroke-width="2"/>`,
    Ranger: `<path d="M175 140 L185 190 M175 140 L165 190" stroke="#8b4513" stroke-width="2"/>
             <path d="M160 145 L175 140 L190 145" fill="none" stroke="#8b4513" stroke-width="3"/>`,
    Rogue: `<path d="M20 160 L30 140 L25 160 L35 145" fill="none" stroke="#696969" stroke-width="2"/>`,
    Sorcerer: `<circle cx="175" cy="165" r="10" fill="#ff4500" opacity="0.6"/>
               <circle cx="175" cy="165" r="5" fill="#ffd700"/>`,
    Warlock: `<ellipse cx="175" cy="165" rx="10" ry="12" fill="#4b0082" stroke="#9400d3" stroke-width="1"/>
              <circle cx="175" cy="165" r="4" fill="#ff00ff"/>`,
    Wizard: `<path d="M175 190 L175 130" stroke="#8b4513" stroke-width="4"/>
             <circle cx="175" cy="125" r="8" fill="#4169e1" stroke="#9370db" stroke-width="2"/>
             <circle cx="175" cy="125" r="3" fill="#fff"/>`
  };
  return elements[className] || '';
}

// Main execution
const outputDir = path.join(__dirname, '../public/portraits');

// Ensure directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate all combinations
let count = 0;
for (const species of SPECIES) {
  for (const className of CLASSES) {
    const filename = `${species.toLowerCase()}-${className.toLowerCase()}.svg`;
    const filepath = path.join(outputDir, filename);
    const svg = generatePortrait(species, className);
    fs.writeFileSync(filepath, svg);
    count++;
    console.log(`Generated: ${filename}`);
  }
}

console.log(`\nGenerated ${count} portrait SVGs in ${outputDir}`);
