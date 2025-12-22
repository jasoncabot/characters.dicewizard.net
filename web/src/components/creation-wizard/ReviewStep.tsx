import {
  ABILITIES,
  calculateModifier,
  formatModifier,
  CLASS_HIT_DICE,
} from "../../types/character";
import type {
  CharacterCreate,
  SkillName,
  Ability,
  Species,
  ClassName,
  BackgroundName,
} from "../../types/character";
import {
  SPECIES_INFO,
  CLASS_INFO,
  BACKGROUND_INFO,
  type WizardStep,
} from "../../data/characterData";
import type { AbilityScores } from "../character-sheet/types";
import type { TraitDescription } from "../../data/traitDescriptions";
import { getTraitDescription } from "../../data/traitDescriptions";
import { TappableTrait } from "./TappableTrait";
import { useInfoPanel } from "./TraitInfoContext";

// Saving throw descriptions (same as ClassStep)
const SAVING_THROW_INFO: Record<string, TraitDescription> = {
  strength: {
    name: "Strength Saving Throw",
    category: "class_feature",
    subtitle: "Physical Power",
    description:
      "Strength measures your character's muscle and physical power. A Strength saving throw is used to resist forces that would physically move or bind you.",
    examples:
      "Resisting being pushed, grappled, or knocked prone. Breaking free from restraints.",
  },
  dexterity: {
    name: "Dexterity Saving Throw",
    category: "class_feature",
    subtitle: "Agility & Reflexes",
    description:
      "Dexterity measures your character's agility, reflexes, and balance. A Dexterity saving throw is used to dodge out of harm's way.",
    examples:
      "Dodging fireballs, avoiding traps, ducking under falling debris.",
  },
  constitution: {
    name: "Constitution Saving Throw",
    category: "class_feature",
    subtitle: "Health & Stamina",
    description:
      "Constitution measures your character's health, stamina, and vital force. A Constitution saving throw is used to endure effects that drain your vitality.",
    examples:
      "Resisting poison, disease, exhaustion, or concentration-breaking damage.",
  },
  intelligence: {
    name: "Intelligence Saving Throw",
    category: "class_feature",
    subtitle: "Mental Acuity",
    description:
      "Intelligence measures your character's mental acuity, accuracy of recall, and ability to reason. An Intelligence saving throw is used to resist mental attacks that can be overcome through logic.",
    examples:
      "Seeing through illusions, resisting psychic effects, breaking mental control.",
  },
  wisdom: {
    name: "Wisdom Saving Throw",
    category: "class_feature",
    subtitle: "Perception & Intuition",
    description:
      "Wisdom measures your character's perception, intuition, and willpower. A Wisdom saving throw is used to resist effects that manipulate your mind or senses.",
    examples:
      "Resisting charm effects, fear, compulsions, and other mind-affecting magic.",
  },
  charisma: {
    name: "Charisma Saving Throw",
    category: "class_feature",
    subtitle: "Force of Personality",
    description:
      "Charisma measures your character's force of personality, persuasiveness, and strength of presence. A Charisma saving throw is used to resist effects that would subsume your personality.",
    examples:
      "Resisting possession, banishment, or effects that assert control over your identity.",
  },
};

interface ReviewStepProps {
  characterData: Partial<CharacterCreate>;
  abilityScores: AbilityScores;
  skillProficiencies: SkillName[];
  savingThrowProficiencies: Ability[];
  onEditStep: (step: WizardStep) => void;
  isTransitioning?: boolean;
}

export function ReviewStep({
  characterData,
  abilityScores,
  skillProficiencies,
  savingThrowProficiencies,
  onEditStep,
}: ReviewStepProps) {
  const { showInfo } = useInfoPanel();

  const species = characterData.race as Species;
  const cls = characterData.class as ClassName;
  const background = characterData.background as BackgroundName;

  const speciesInfo = SPECIES_INFO[species];
  const classInfo = CLASS_INFO[cls];
  const backgroundInfo = BACKGROUND_INFO[background];

  const hitDie = CLASS_HIT_DICE[cls] || 8;
  const conMod = calculateModifier(abilityScores.constitution);
  const maxHp = Math.max(1, hitDie + conMod);
  const dexMod = calculateModifier(abilityScores.dexterity);
  const ac = 10 + dexMod;

  const handleTraitTap = (trait: TraitDescription) => {
    showInfo(trait);
  };

  const handleSavingThrowTap = (ability: Ability) => {
    const info = SAVING_THROW_INFO[ability];
    if (info) {
      showInfo(info);
    }
  };

  const handleFeatTap = (featName: string) => {
    const feat = getTraitDescription(featName);
    if (feat) {
      showInfo(feat);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6">
        {/* Decorative background */}
        <div className="absolute top-0 right-0 h-40 w-40 translate-x-10 -translate-y-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-3xl" />

        <div className="relative flex items-start gap-6">
          {/* Portrait placeholder */}
          <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 text-4xl shadow-lg">
            {getSpeciesEmoji(species)}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-white">
                {characterData.name || "Unnamed Hero"}
              </h2>
              <button
                onClick={() => onEditStep("details")}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-white"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>
            </div>

            <p className="mt-1 text-lg text-slate-300">
              Level {characterData.level || 1} {species} {cls}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-purple-600/20 px-3 py-1 text-sm font-medium text-purple-300 ring-1 ring-purple-500/30">
                {background}
              </span>
              <span className="rounded-full bg-slate-700/50 px-3 py-1 text-sm text-slate-400">
                {characterData.alignment}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Combat Stats */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
          <h3 className="mb-3 text-sm font-semibold tracking-wide text-slate-400 uppercase">
            Combat Stats
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{maxHp}</div>
              <div className="text-xs text-slate-500">HP</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{ac}</div>
              <div className="text-xs text-slate-500">AC</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {speciesInfo.speed}
              </div>
              <div className="text-xs text-slate-500">Speed</div>
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-slate-900/50 p-2 text-center text-sm text-slate-400">
            Hit Die: d{hitDie}
          </div>
        </div>

        {/* Ability Scores */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 md:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-wide text-slate-400 uppercase">
              Ability Scores
            </h3>
            <button
              onClick={() => onEditStep("abilities")}
              className="text-xs text-purple-400 hover:text-purple-300"
            >
              Edit
            </button>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {ABILITIES.map((ability) => {
              const score = abilityScores[ability];
              const mod = calculateModifier(score);

              return (
                <div
                  key={ability}
                  className="rounded-lg bg-slate-900/50 p-2 text-center"
                >
                  <div className="text-xs font-medium text-slate-500 uppercase">
                    {ability.slice(0, 3)}
                  </div>
                  <div className="text-xl font-bold text-white">{score}</div>
                  <div
                    className={`text-sm font-medium ${
                      mod >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {formatModifier(mod)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Species Info */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-wide text-slate-400 uppercase">
              Species: {species}
            </h3>
            <button
              onClick={() => onEditStep("species")}
              className="text-xs text-purple-400 hover:text-purple-300"
            >
              Change
            </button>
          </div>
          <p className="mb-3 text-sm text-slate-400">
            {speciesInfo.description}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {speciesInfo.traits.map((trait) => (
              <TappableTrait
                key={trait}
                name={trait}
                onTap={handleTraitTap}
                className="px-2 py-1 text-xs"
              />
            ))}
          </div>
        </div>

        {/* Class Info */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-wide text-slate-400 uppercase">
              Class: {cls}
            </h3>
            <button
              onClick={() => onEditStep("class")}
              className="text-xs text-purple-400 hover:text-purple-300"
            >
              Change
            </button>
          </div>
          <p className="mb-3 text-sm text-slate-400">{classInfo.description}</p>
          <div className="text-xs text-slate-500">
            <span className="font-medium text-slate-400">Playstyle:</span>{" "}
            {classInfo.playstyle}
          </div>
        </div>

        {/* Background Info */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-wide text-slate-400 uppercase">
              Background: {background}
            </h3>
            <button
              onClick={() => onEditStep("background")}
              className="text-xs text-purple-400 hover:text-purple-300"
            >
              Change
            </button>
          </div>
          <p className="mb-3 text-sm text-slate-400">
            {backgroundInfo.description}
          </p>
          <button
            onClick={() => handleFeatTap(backgroundInfo.feat)}
            className="w-full rounded-lg bg-amber-500/10 p-2 text-left text-sm transition-colors hover:bg-amber-500/20 active:scale-[0.99]"
          >
            <span className="font-medium text-amber-300">Origin Feat:</span>{" "}
            <span className="text-slate-300">{backgroundInfo.feat}</span>
          </button>
        </div>

        {/* Proficiencies */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-wide text-slate-400 uppercase">
              Proficiencies
            </h3>
            <button
              onClick={() => onEditStep("details")}
              className="text-xs text-purple-400 hover:text-purple-300"
            >
              Edit
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <div className="mb-1 text-xs text-slate-500">Saving Throws</div>
              <div className="flex flex-wrap gap-1.5">
                {savingThrowProficiencies.map((save) => (
                  <button
                    key={save}
                    onClick={() => handleSavingThrowTap(save)}
                    className="rounded-full bg-green-600/20 px-2 py-1 text-xs text-green-300 capitalize transition-colors hover:bg-green-600/30 active:scale-95"
                  >
                    {save}
                  </button>
                ))}
              </div>
            </div>

            {skillProficiencies.length > 0 && (
              <div>
                <div className="mb-1 text-xs text-slate-500">Skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {skillProficiencies.map((skill) => (
                    <TappableTrait
                      key={skill}
                      name={skill}
                      onTap={handleTraitTap}
                      variant="skill"
                      className="px-2 py-1 text-xs"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ready to Create */}
      <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
            <svg
              className="h-5 w-5 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-green-300">Ready to Create!</h3>
            <p className="text-sm text-slate-400">
              Review your choices above, then click "Create Character" to begin
              your adventure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function getSpeciesEmoji(species: Species): string {
  const emojiMap: Record<Species, string> = {
    Aasimar: "😇",
    Dragonborn: "🐉",
    Dwarf: "⛏️",
    Elf: "🧝",
    Gnome: "🔧",
    Goliath: "🗿",
    Halfling: "🍀",
    Human: "👤",
    Orc: "💪",
    Tiefling: "😈",
  };
  return emojiMap[species] || "👤";
}
