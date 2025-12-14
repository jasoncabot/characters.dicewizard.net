import { Input } from "@headlessui/react";
import type { UseFormRegister } from "react-hook-form";
import { calculateModifier, formatModifier } from "../../types/character";
import type { CharacterCreate } from "../../types/character";
import type { AbilityScores } from "./types";

interface CombatStatsSectionProps {
  register: UseFormRegister<CharacterCreate>;
  abilityScores: AbilityScores;
  proficiencyBonus: number;
  skillProficiencies: string[];
}

export function CombatStatsSection({
  register,
  abilityScores,
  proficiencyBonus,
  skillProficiencies,
}: CombatStatsSectionProps) {
  const dexterityModifier = calculateModifier(abilityScores.dexterity);
  const passivePerception =
    10 +
    calculateModifier(abilityScores.wisdom) +
    (skillProficiencies.includes("Perception") ? proficiencyBonus : 0);

  return (
    <section className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
      <h2 className="mb-4 text-xl font-bold text-white">Combat Stats</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4 text-center">
          <p className="mb-2 cursor-default text-xs font-medium tracking-wider text-slate-400 uppercase">
            Current HP
          </p>
          <Input
            type="number"
            {...register("currentHp", { valueAsNumber: true, min: 0 })}
            className="w-full cursor-text rounded border border-slate-600 bg-slate-800 px-2 py-2 text-center text-xl font-bold text-white shadow-sm transition hover:border-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            min={0}
          />
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4 text-center">
          <p className="mb-2 cursor-default text-xs font-medium tracking-wider text-slate-400 uppercase">
            Max HP
          </p>
          <Input
            type="number"
            {...register("maxHp", { valueAsNumber: true, min: 1 })}
            className="w-full cursor-text rounded border border-slate-600 bg-slate-800 px-2 py-2 text-center text-xl font-bold text-white shadow-sm transition hover:border-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            min={1}
          />
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4 text-center">
          <p className="mb-2 cursor-default text-xs font-medium tracking-wider text-slate-400 uppercase">
            Temp HP
          </p>
          <Input
            type="number"
            {...register("tempHp", { valueAsNumber: true, min: 0 })}
            className="w-full cursor-text rounded border border-slate-600 bg-slate-800 px-2 py-2 text-center text-xl font-bold text-white shadow-sm transition hover:border-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            min={0}
          />
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4 text-center">
          <p className="mb-2 cursor-default text-xs font-medium tracking-wider text-slate-400 uppercase">
            Armor Class
          </p>
          <Input
            type="number"
            {...register("armorClass", { valueAsNumber: true, min: 0 })}
            className="w-full cursor-text rounded border border-slate-600 bg-slate-800 px-2 py-2 text-center text-xl font-bold text-white shadow-sm transition hover:border-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            min={0}
          />
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4 text-center">
          <p className="mb-2 cursor-default text-xs font-medium tracking-wider text-slate-400 uppercase">
            Speed
          </p>
          <div className="flex items-center justify-center">
            <Input
              type="number"
              {...register("speed", { valueAsNumber: true, min: 0 })}
              className="w-full cursor-text rounded border border-slate-600 bg-slate-800 px-2 py-2 text-center text-xl font-bold text-white shadow-sm transition hover:border-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              min={0}
            />
            <span className="ml-1 cursor-default text-slate-400">ft.</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between rounded-lg bg-slate-900/30 p-3">
          <span className="cursor-default text-slate-400">Initiative</span>
          <span className="cursor-default text-xl font-bold text-white">
            {formatModifier(dexterityModifier)}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-slate-900/30 p-3">
          <span className="cursor-default text-slate-400">
            Passive Perception
          </span>
          <span className="cursor-default text-xl font-bold text-white">
            {passivePerception}
          </span>
        </div>
      </div>
    </section>
  );
}
