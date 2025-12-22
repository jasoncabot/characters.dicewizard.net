import { useState } from "react";
import { Field, Input, Label } from "@headlessui/react";
import {
  ALIGNMENTS,
  SKILLS,
  calculateModifier,
  formatModifier,
} from "../../types/character";
import type {
  CharacterCreate,
  SkillName,
  Alignment,
} from "../../types/character";
import type { AbilityScores } from "../character-sheet/types";
import { getTraitDescription } from "../../data/traitDescriptions";
import { useInfoPanel } from "./TraitInfoContext";

interface DetailsStepProps {
  characterData: Partial<CharacterCreate>;
  updateCharacterData: <K extends keyof CharacterCreate>(
    key: K,
    value: CharacterCreate[K],
  ) => void;
  skillProficiencies: SkillName[];
  setSkillProficiencies: (skills: SkillName[]) => void;
  abilityScores: AbilityScores;
  isTransitioning?: boolean;
}

const ALIGNMENT_DESCRIPTIONS: Record<Alignment, string> = {
  "Lawful Good": "Crusader - follows rules and helps others",
  "Neutral Good": "Benefactor - does good without bias for or against order",
  "Chaotic Good": "Rebel - values freedom and kindness over laws",
  "Lawful Neutral": "Judge - order and organization above all",
  "True Neutral": "Undecided - maintains balance, avoids extremes",
  "Chaotic Neutral": "Free Spirit - follows whims, values personal freedom",
  "Lawful Evil": "Dominator - uses rules and order for selfish gains",
  "Neutral Evil": "Malefactor - does whatever they can get away with",
  "Chaotic Evil": "Destroyer - pursues freedom through violence and chaos",
};

const SKILL_GROUPS = [
  {
    name: "Strength",
    skills: ["Athletics"] as SkillName[],
  },
  {
    name: "Dexterity",
    skills: ["Acrobatics", "Sleight of Hand", "Stealth"] as SkillName[],
  },
  {
    name: "Intelligence",
    skills: [
      "Arcana",
      "History",
      "Investigation",
      "Nature",
      "Religion",
    ] as SkillName[],
  },
  {
    name: "Wisdom",
    skills: [
      "Animal Handling",
      "Insight",
      "Medicine",
      "Perception",
      "Survival",
    ] as SkillName[],
  },
  {
    name: "Charisma",
    skills: [
      "Deception",
      "Intimidation",
      "Performance",
      "Persuasion",
    ] as SkillName[],
  },
];

export function DetailsStep({
  characterData,
  updateCharacterData,
  skillProficiencies,
  setSkillProficiencies,
  abilityScores,
}: DetailsStepProps) {
  const [nameError, setNameError] = useState<string | null>(null);
  const { showInfo } = useInfoPanel();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    updateCharacterData("name", name);
    if (name.trim().length === 0) {
      setNameError("Your character needs a name!");
    } else {
      setNameError(null);
    }
  };

  const toggleSkill = (skill: SkillName) => {
    if (skillProficiencies.includes(skill)) {
      setSkillProficiencies(skillProficiencies.filter((s) => s !== skill));
    } else {
      setSkillProficiencies([...skillProficiencies, skill]);
    }
  };

  const showSkillInfo = (skill: SkillName) => {
    const trait = getTraitDescription(skill);
    if (trait) {
      showInfo(trait);
    }
  };

  const getSkillModifier = (skill: SkillName) => {
    const ability = SKILLS[skill];
    const abilityMod = calculateModifier(abilityScores[ability]);
    const profBonus = skillProficiencies.includes(skill) ? 2 : 0; // Level 1 proficiency
    return abilityMod + profBonus;
  };

  return (
    <div className="space-y-6">
      {/* Character Name */}
      <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6">
        <h2 className="mb-4 text-xl font-semibold text-white">
          Name Your Character
        </h2>

        <Field>
          <Label className="mb-2 block text-sm font-medium text-slate-300">
            Character Name *
          </Label>
          <Input
            type="text"
            value={characterData.name || ""}
            onChange={handleNameChange}
            placeholder="Enter a name for your hero..."
            className={`w-full rounded-xl border bg-slate-900/50 px-4 py-3 text-lg text-white placeholder-slate-500 transition focus:ring-2 focus:outline-none ${
              nameError
                ? "border-red-500 focus:ring-red-500"
                : "border-slate-600 hover:border-slate-500 focus:ring-purple-500"
            }`}
          />
          {nameError && (
            <p className="mt-2 text-sm text-red-400">{nameError}</p>
          )}
        </Field>

        {/* Name suggestions based on race */}
        <div className="mt-4 rounded-lg bg-slate-900/30 p-3">
          <p className="text-sm text-slate-400">
            <span className="font-medium text-slate-300">💡 Tip:</span> Choose a
            name that fits your character's personality and background. Consider
            their species ({characterData.race}) and origin (
            {characterData.background}) for inspiration.
          </p>
        </div>
      </div>

      {/* Alignment Selection */}
      <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6">
        <h2 className="mb-4 text-xl font-semibold text-white">
          Choose Your Alignment
        </h2>
        <p className="mb-4 text-sm text-slate-400">
          Alignment represents your character's moral compass and personality
          tendencies.
        </p>

        <div className="grid grid-cols-3 gap-2">
          {ALIGNMENTS.map((alignment) => {
            const isSelected = characterData.alignment === alignment;

            return (
              <button
                key={alignment}
                onClick={() => updateCharacterData("alignment", alignment)}
                className={`group relative rounded-lg border p-3 text-center transition-all duration-200 ${
                  isSelected
                    ? "border-purple-500 bg-purple-600/20 shadow-lg shadow-purple-500/20"
                    : "border-slate-700/50 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-1 right-1">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-500">
                      <svg
                        className="h-2.5 w-2.5 text-white"
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
                <div className="text-sm font-medium text-white">
                  {alignment}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {ALIGNMENT_DESCRIPTIONS[alignment]}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Skill Proficiencies */}
      <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Skill Proficiencies
            </h2>
            <p className="text-sm text-slate-400">
              Select skills you're proficient in (typically 2-4 based on class
              and background)
            </p>
          </div>
          <div className="rounded-lg bg-purple-600/20 px-3 py-1.5 text-sm font-medium text-purple-300">
            {skillProficiencies.length} selected
          </div>
        </div>

        <div className="space-y-4">
          {SKILL_GROUPS.map((group) => (
            <div key={group.name}>
              <div className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                {group.name} Skills
              </div>
              <div className="flex flex-wrap gap-2">
                {group.skills.map((skill) => {
                  const isProficient = skillProficiencies.includes(skill);
                  const modifier = getSkillModifier(skill);

                  return (
                    <div
                      key={skill}
                      className={`group flex items-center gap-1 rounded-lg border transition-all ${
                        isProficient
                          ? "border-purple-500 bg-purple-600/20"
                          : "border-slate-700/50 bg-slate-800/50 hover:border-slate-600"
                      }`}
                    >
                      <button
                        onClick={() => toggleSkill(skill)}
                        className={`flex items-center gap-2 px-3 py-2 text-sm transition-all ${
                          isProficient
                            ? "text-white"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded border ${
                            isProficient
                              ? "border-purple-500 bg-purple-500"
                              : "border-slate-600"
                          }`}
                        >
                          {isProficient && (
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
                          )}
                        </span>
                        <span>{skill}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                            modifier >= 0
                              ? "bg-green-600/20 text-green-400"
                              : "bg-red-600/20 text-red-400"
                          }`}
                        >
                          {formatModifier(modifier)}
                        </span>
                      </button>
                      <button
                        onClick={() => showSkillInfo(skill)}
                        className="flex h-full items-center px-2 text-slate-500 transition-colors hover:text-purple-400"
                        title={`Learn more about ${skill}`}
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
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Skills explanation */}
        <div className="mt-4 flex items-start gap-3 rounded-lg bg-slate-900/30 p-3">
          <span className="text-lg">📖</span>
          <p className="text-sm text-slate-400">
            <span className="font-medium text-slate-300">Note:</span> Your class
            and background typically grant specific skill proficiencies. The
            skills shown here let you customize further. Proficiency adds +2 at
            level 1.
          </p>
        </div>
      </div>
    </div>
  );
}
