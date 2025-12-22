import { useState } from "react";
import { CLASSES } from "../../types/character";
import type { ClassName } from "../../types/character";
import { CLASS_INFO } from "../../data/characterData";
import type { TraitDescription } from "../../data/traitDescriptions";
import { useInfoPanel } from "./TraitInfoContext";

// Create ability descriptions for saving throws
const ABILITY_INFO: Record<string, TraitDescription> = {
  strength: {
    name: "Strength",
    category: "skill",
    subtitle: "Physical Power",
    description:
      "Strength measures your character's muscle and physical power. A Strength saving throw is used to resist forces that would physically move or bind you.",
    examples:
      "Resisting being pushed, grappled, or knocked prone. Breaking free from restraints.",
  },
  dexterity: {
    name: "Dexterity",
    category: "skill",
    subtitle: "Agility & Reflexes",
    description:
      "Dexterity measures your character's agility, reflexes, and balance. A Dexterity saving throw is used to dodge out of harm's way.",
    examples:
      "Dodging fireballs, avoiding traps, ducking under falling debris.",
  },
  constitution: {
    name: "Constitution",
    category: "skill",
    subtitle: "Health & Stamina",
    description:
      "Constitution measures your character's health, stamina, and vital force. A Constitution saving throw is used to endure effects that drain your vitality.",
    examples:
      "Resisting poison, disease, exhaustion, or concentration-breaking damage.",
  },
  intelligence: {
    name: "Intelligence",
    category: "skill",
    subtitle: "Mental Acuity",
    description:
      "Intelligence measures your character's mental acuity, accuracy of recall, and ability to reason. An Intelligence saving throw is used to resist mental attacks that can be overcome through logic.",
    examples:
      "Seeing through illusions, resisting psychic effects, breaking mental control.",
  },
  wisdom: {
    name: "Wisdom",
    category: "skill",
    subtitle: "Perception & Intuition",
    description:
      "Wisdom measures your character's perception, intuition, and willpower. A Wisdom saving throw is used to resist effects that manipulate your mind or senses.",
    examples:
      "Resisting charm effects, fear, compulsions, and other mind-affecting magic.",
  },
  charisma: {
    name: "Charisma",
    category: "skill",
    subtitle: "Force of Personality",
    description:
      "Charisma measures your character's force of personality, persuasiveness, and strength of presence. A Charisma saving throw is used to resist effects that would subsume your personality.",
    examples:
      "Resisting possession, banishment, or effects that assert control over your identity.",
  },
};

interface ClassStepProps {
  selectedClass: ClassName;
  onSelect: (cls: ClassName) => void;
  isTransitioning?: boolean;
}

export function ClassStep({ selectedClass, onSelect }: ClassStepProps) {
  const [hoveredClass, setHoveredClass] = useState<ClassName | null>(null);
  const { showInfo } = useInfoPanel();
  const displayClass = hoveredClass || selectedClass;
  const classInfo = CLASS_INFO[displayClass];

  const handleSaveThrowTap = (save: string) => {
    const info = ABILITY_INFO[save];
    if (info) {
      showInfo(info);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Class Selection Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            Choose Your Class
          </h2>
          <span className="text-sm text-slate-400">
            {CLASSES.length} classes available
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CLASSES.map((cls) => {
            const info = CLASS_INFO[cls];
            const isSelected = cls === selectedClass;
            const isHovered = cls === hoveredClass;

            return (
              <button
                key={cls}
                onClick={() => onSelect(cls)}
                onMouseEnter={() => setHoveredClass(cls)}
                onMouseLeave={() => setHoveredClass(null)}
                className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-purple-500 bg-purple-600/20 shadow-lg shadow-purple-500/20"
                    : "border-slate-700/50 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800"
                }`}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500">
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-lg">{getClassEmoji(cls)}</span>
                  <span className="font-semibold text-white">{cls}</span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  d{info.hitDie} Hit Die
                </div>

                {/* Hover glow effect */}
                <div
                  className={`absolute inset-0 -z-10 opacity-0 blur-xl transition-opacity duration-300 ${
                    isHovered || isSelected ? "opacity-20" : ""
                  }`}
                  style={{
                    background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Class Details Panel */}
      <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 backdrop-blur-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-2xl shadow-lg">
            {getClassEmoji(displayClass)}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">{displayClass}</h3>
            <p className="text-sm text-slate-400">{classInfo.description}</p>
          </div>
        </div>

        {/* Flavor Text */}
        <div className="mb-6 rounded-lg border border-purple-500/20 bg-purple-500/5 p-4">
          <p className="text-sm leading-relaxed text-slate-300 italic">
            "{classInfo.flavorText}"
          </p>
        </div>

        {/* Playstyle */}
        <div className="mb-6 rounded-lg bg-slate-900/50 p-4">
          <div className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">
            Playstyle
          </div>
          <p className="text-sm text-slate-300">{classInfo.playstyle}</p>
        </div>

        {/* Stats Grid */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-slate-900/50 p-3">
            <div className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              Hit Die
            </div>
            <div className="mt-1 text-xl font-bold text-white">
              d{classInfo.hitDie}
            </div>
          </div>
          <div className="rounded-lg bg-slate-900/50 p-3">
            <div className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              Primary Ability
            </div>
            <div className="mt-1 text-lg font-semibold text-white capitalize">
              {classInfo.primaryAbility.join(" / ")}
            </div>
          </div>
        </div>

        {/* Saving Throws */}
        <div className="mb-6">
          <h4 className="mb-3 text-sm font-semibold tracking-wide text-slate-300 uppercase">
            Saving Throw Proficiencies
            <span className="ml-2 text-xs font-normal text-slate-500">
              (tap for details)
            </span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {classInfo.savingThrows.map((save) => (
              <button
                key={save}
                onClick={() => handleSaveThrowTap(save)}
                className="group relative inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-green-600/20 to-emerald-600/20 px-3 py-1.5 text-sm font-medium text-green-300 capitalize ring-1 ring-green-500/30 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-green-500/10 active:scale-100"
              >
                {save}
                <svg
                  className="h-3.5 w-3.5 opacity-50 transition-opacity group-hover:opacity-100"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* Class Role Visual */}
        <div className="flex items-start gap-3 rounded-lg bg-slate-900/50 p-3">
          <span className="text-lg">⚔️</span>
          <div className="text-sm text-slate-400">
            <span className="font-medium text-slate-300">Combat Role:</span>{" "}
            {getClassRole(displayClass)}
          </div>
        </div>
      </div>
    </div>
  );
}

function getClassEmoji(cls: ClassName): string {
  const emojiMap: Record<ClassName, string> = {
    Barbarian: "🪓",
    Bard: "🎸",
    Cleric: "✨",
    Druid: "🌿",
    Fighter: "⚔️",
    Monk: "👊",
    Paladin: "🛡️",
    Ranger: "🏹",
    Rogue: "🗡️",
    Sorcerer: "🔮",
    Warlock: "👁️",
    Wizard: "📖",
  };
  return emojiMap[cls] || "⚔️";
}

function getClassRole(cls: ClassName): string {
  const roleMap: Record<ClassName, string> = {
    Barbarian:
      "Melee DPS / Tank - High damage and survivability in close combat",
    Bard: "Support / Utility - Buffs allies and controls the battlefield",
    Cleric: "Healer / Support - Keeps the party alive with divine magic",
    Druid: "Versatile Caster - Nature magic and shapeshifting adaptability",
    Fighter: "Martial Expert - Reliable damage dealer with many attacks",
    Monk: "Skirmisher - Fast, mobile melee combatant",
    Paladin: "Frontline / Support - Tanky warrior with healing and smites",
    Ranger: "Ranged DPS / Scout - Skilled hunter and tracker",
    Rogue: "Striker - High single-target burst damage",
    Sorcerer: "Blaster - Raw magical power with metamagic flexibility",
    Warlock: "Sustained Caster - Reliable damage with unique invocations",
    Wizard: "Controller / Utility - Widest spell selection in the game",
  };
  return roleMap[cls] || "Versatile combatant";
}
