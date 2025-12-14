import { Switch } from "@headlessui/react";
import {
  ABILITIES,
  calculateModifier,
  formatModifier,
} from "../../types/character";
import type { Ability } from "../../types/character";
import type { AbilityScores } from "./types";

interface SavingThrowsSectionProps {
  abilityScores: AbilityScores;
  savingThrowProficiencies: string[];
  setSavingThrowProficiencies: (
    updater: string[] | ((prev: string[]) => string[]),
  ) => void;
  proficiencyBonus: number;
}

export function SavingThrowsSection({
  abilityScores,
  savingThrowProficiencies,
  setSavingThrowProficiencies,
  proficiencyBonus,
}: SavingThrowsSectionProps) {
  const toggleProficiency = (ability: Ability, checked: boolean) => {
    if (checked) {
      setSavingThrowProficiencies([...savingThrowProficiencies, ability]);
      return;
    }
    setSavingThrowProficiencies(
      savingThrowProficiencies.filter((entry) => entry !== ability),
    );
  };

  return (
    <section className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
      <h2 className="mb-4 text-xl font-bold text-white">Saving Throws</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {ABILITIES.map((ability) => {
          const isProficient = savingThrowProficiencies.includes(ability);
          const modifier = calculateModifier(abilityScores[ability]);
          const total = modifier + (isProficient ? proficiencyBonus : 0);

          return (
            <Switch
              key={ability}
              checked={isProficient}
              onChange={(checked) => toggleProficiency(ability, checked)}
              className={`group flex w-full cursor-pointer items-center gap-2 rounded-lg border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
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
              <span className="flex-1 text-sm text-slate-300 uppercase">
                {ability.slice(0, 3)}
              </span>
              <span
                className={`cursor-pointer font-bold ${
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
