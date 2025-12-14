import { Switch } from "@headlessui/react";
import {
  SKILLS,
  calculateModifier,
  formatModifier,
} from "../../types/character";
import type { AbilityScores } from "./types";

interface SkillsSectionProps {
  abilityScores: AbilityScores;
  skillProficiencies: string[];
  setSkillProficiencies: (
    updater: string[] | ((prev: string[]) => string[]),
  ) => void;
  proficiencyBonus: number;
}

export function SkillsSection({
  abilityScores,
  skillProficiencies,
  setSkillProficiencies,
  proficiencyBonus,
}: SkillsSectionProps) {
  const toggleProficiency = (skill: string, checked: boolean) => {
    if (checked) {
      setSkillProficiencies([...skillProficiencies, skill]);
      return;
    }
    setSkillProficiencies(
      skillProficiencies.filter((entry) => entry !== skill),
    );
  };

  return (
    <section className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
      <h2 className="mb-4 text-xl font-bold text-white">Skills</h2>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(SKILLS).map(([skill, ability]) => {
          const isProficient = skillProficiencies.includes(skill);
          const modifier = calculateModifier(abilityScores[ability]);
          const total = modifier + (isProficient ? proficiencyBonus : 0);

          return (
            <Switch
              key={skill}
              checked={isProficient}
              onChange={(checked) => toggleProficiency(skill, checked)}
              className={`group flex w-full cursor-pointer items-center gap-2 rounded-lg border p-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                isProficient
                  ? "border-purple-500/50 bg-purple-600/20"
                  : "border-slate-700/50 bg-slate-900/30 hover:border-slate-600"
              }`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-600 bg-slate-800 transition group-data-[checked]:border-purple-600 group-data-[checked]:bg-purple-600">
                <svg
                  className="h-3 w-3 stroke-white opacity-0 transition group-data-[checked]:opacity-100"
                  viewBox="0 0 14 14"
                  fill="none"
                >
                  <path
                    d="M3 8L6 11L11 3.5"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="flex-1 text-sm text-slate-300">{skill}</span>
              <span className="text-xs text-slate-500 uppercase">
                ({ability.slice(0, 3)})
              </span>
              <span
                className={`font-bold ${
                  isProficient ? "text-purple-400" : "text-white"
                }`}
              >
                {formatModifier(total)}
              </span>
            </Switch>
          );
        })}
      </div>
    </section>
  );
}
