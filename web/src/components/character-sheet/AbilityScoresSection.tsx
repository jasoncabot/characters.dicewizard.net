import {
  Button,
  Input,
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from "@headlessui/react";
import { useMemo } from "react";
import {
  ABILITIES,
  ABILITY_DESCRIPTIONS,
  ABILITY_LABELS,
  POINT_BUY_TOTAL,
  STANDARD_ARRAY,
  calculateModifier,
  formatModifier,
} from "../../types/character";
import type { Ability } from "../../types/character";
import {
  compactListboxButtonClasses,
  compactListboxOptionsClasses,
  listboxOptionClasses,
} from "./listboxStyles";
import type { AbilityMethod, AbilityScores } from "./types";

interface AbilityScoresSectionProps {
  isEditing: boolean;
  abilityMethod: AbilityMethod;
  onAbilityMethodChange: (method: AbilityMethod) => void;
  abilityScores: AbilityScores;
  setAbilityScores: (
    updater: AbilityScores | ((prev: AbilityScores) => AbilityScores),
  ) => void;
  standardArrayAssignments: Record<Ability, number | null>;
  onStandardArrayAssignment: (ability: Ability, value: number | null) => void;
  rolledScores: { rolls: number[]; total: number }[];
  handleRollAll: () => void;
  adjustPointBuy: (ability: Ability, delta: number) => void;
  pointsRemaining: number;
}

export function AbilityScoresSection({
  isEditing,
  abilityMethod,
  onAbilityMethodChange,
  abilityScores,
  setAbilityScores,
  standardArrayAssignments,
  onStandardArrayAssignment,
  rolledScores,
  handleRollAll,
  adjustPointBuy,
  pointsRemaining,
}: AbilityScoresSectionProps) {
  const methodDescription = useMemo(() => {
    if (abilityMethod === "standard") {
      return "Assign the standard array values (15, 14, 13, 12, 10, 8) to your abilities. Each value can only be used once.";
    }
    if (abilityMethod === "pointbuy") {
      return "Spend 27 points to set your ability scores (8-15 range).";
    }
    return "Roll 4d6, drop the lowest die, for each ability score.";
  }, [abilityMethod]);

  const renderStandardArrayOptions = (ability: Ability) => {
    const currentValue = standardArrayAssignments[ability];
    const otherAssignments = Object.entries(standardArrayAssignments)
      .filter(([key]) => key !== ability)
      .map(([, value]) => value)
      .filter((value): value is number => value !== null);

    const options = STANDARD_ARRAY.filter((score) => {
      const usedCount = otherAssignments.filter((val) => val === score).length;
      const totalCount = STANDARD_ARRAY.filter((val) => val === score).length;
      return usedCount < totalCount || currentValue === score;
    });

    const serializedCurrent = currentValue?.toString() ?? "";

    return (
      <Listbox
        value={serializedCurrent}
        onChange={(value) => {
          const parsedValue = value ? parseInt(value, 10) : null;
          onStandardArrayAssignment(ability, parsedValue);
        }}
      >
        <div className="relative mx-auto w-full max-w-[4.5rem]">
          <ListboxButton className={compactListboxButtonClasses}>
            {serializedCurrent || "--"}
          </ListboxButton>
          <ListboxOptions
            portal
            anchor="bottom start"
            className={compactListboxOptionsClasses}
          >
            <ListboxOption value="" className={listboxOptionClasses}>
              --
            </ListboxOption>
            {options.map((score) => (
              <ListboxOption
                key={score}
                value={score.toString()}
                className={listboxOptionClasses}
              >
                {score}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </div>
      </Listbox>
    );
  };

  return (
    <section className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="cursor-default text-xl font-bold text-white">
          Ability Scores
        </h2>
        {!isEditing && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => onAbilityMethodChange("standard")}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm transition focus:ring-2 focus:ring-purple-400 focus:outline-none ${
                abilityMethod === "standard"
                  ? "bg-purple-600 text-white shadow-lg"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600 active:bg-slate-500"
              }`}
            >
              Standard Array
            </Button>
            <Button
              type="button"
              onClick={() => onAbilityMethodChange("pointbuy")}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm transition focus:ring-2 focus:ring-purple-400 focus:outline-none ${
                abilityMethod === "pointbuy"
                  ? "bg-purple-600 text-white shadow-lg"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600 active:bg-slate-500"
              }`}
            >
              Point Buy
            </Button>
            <Button
              type="button"
              onClick={() => onAbilityMethodChange("roll")}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm transition focus:ring-2 focus:ring-purple-400 focus:outline-none ${
                abilityMethod === "roll"
                  ? "bg-purple-600 text-white shadow-lg"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600 active:bg-slate-500"
              }`}
            >
              Roll
            </Button>
          </div>
        )}
      </div>

      {!isEditing && (
        <div className="mb-4 rounded-lg bg-slate-900/30 p-3 text-sm text-slate-400">
          {abilityMethod === "pointbuy" ? (
            <div className="flex items-center justify-between">
              <p>{methodDescription}</p>
              <div
                className={`text-lg font-bold ${
                  pointsRemaining < 0
                    ? "text-red-400"
                    : pointsRemaining === 0
                      ? "text-green-400"
                      : "text-yellow-400"
                }`}
              >
                Points: {pointsRemaining} / {POINT_BUY_TOTAL}
              </div>
            </div>
          ) : abilityMethod === "roll" ? (
            <div className="flex items-center justify-between gap-4">
              <p>{methodDescription}</p>
              <Button
                type="button"
                onClick={handleRollAll}
                className="cursor-pointer rounded-lg bg-purple-600 px-4 py-1.5 text-white transition hover:bg-purple-500 focus:ring-2 focus:ring-purple-400 focus:outline-none active:bg-purple-700"
              >
                🎲 Roll All
              </Button>
            </div>
          ) : (
            <p>{methodDescription}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {ABILITIES.map((ability, index) => {
          const score = abilityScores[ability];
          const modifier = calculateModifier(score);

          return (
            <div
              key={ability}
              className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4 text-center"
            >
              <p className="mb-1 text-xs font-medium tracking-wider text-slate-400 uppercase">
                {ABILITY_LABELS[ability]}
              </p>
              <div className="mb-2 text-2xl font-bold text-purple-400">
                {formatModifier(modifier)}
              </div>

              {isEditing ? (
                <Input
                  type="number"
                  value={score}
                  onChange={(event) => {
                    const nextValue = parseInt(event.target.value, 10) || 8;
                    setAbilityScores((prev) => ({
                      ...prev,
                      [ability]: nextValue,
                    }));
                  }}
                  className="w-full cursor-text rounded border border-slate-600 bg-slate-800 px-2 py-1 text-center text-white shadow-sm transition hover:border-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  min={1}
                  max={30}
                />
              ) : abilityMethod === "standard" ? (
                renderStandardArrayOptions(ability)
              ) : abilityMethod === "pointbuy" ? (
                <div className="flex items-center justify-center gap-1">
                  <Button
                    type="button"
                    onClick={() => adjustPointBuy(ability, -1)}
                    disabled={score <= 8}
                    className="h-8 w-8 cursor-pointer rounded bg-slate-700 text-white transition hover:bg-slate-600 focus:ring-2 focus:ring-purple-400 focus:outline-none active:bg-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    -
                  </Button>
                  <span className="w-10 cursor-default text-center font-bold text-white">
                    {score}
                  </span>
                  <Button
                    type="button"
                    onClick={() => adjustPointBuy(ability, 1)}
                    disabled={score >= 15 || pointsRemaining <= 0}
                    className="h-8 w-8 cursor-pointer rounded bg-slate-700 text-white transition hover:bg-slate-600 focus:ring-2 focus:ring-purple-400 focus:outline-none active:bg-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    +
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="text-lg font-bold text-white">{score}</div>
                  {rolledScores[index] && (
                    <div className="text-xs text-slate-500">
                      [{rolledScores[index].rolls.join(", ")}]
                    </div>
                  )}
                </div>
              )}

              <p className="mt-2 text-xs text-slate-500">
                {ABILITY_DESCRIPTIONS[ability]}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
