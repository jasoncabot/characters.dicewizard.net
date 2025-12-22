import {
  Button,
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from "@headlessui/react";
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
import type { AbilityMethod, AbilityScores } from "../character-sheet/types";

interface AbilitiesStepProps {
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
  isTransitioning?: boolean;
}

const METHODS: { id: AbilityMethod; name: string; description: string }[] = [
  {
    id: "standard",
    name: "Standard Array",
    description:
      "Assign predefined values (15, 14, 13, 12, 10, 8) to abilities",
  },
  {
    id: "pointbuy",
    name: "Point Buy",
    description: "Spend 27 points to customize scores from 8-15",
  },
  {
    id: "roll",
    name: "Roll",
    description: "Roll 4d6 drop lowest for each ability - exciting but random!",
  },
];

export function AbilitiesStep({
  abilityMethod,
  onAbilityMethodChange,
  abilityScores,
  standardArrayAssignments,
  onStandardArrayAssignment,
  rolledScores,
  handleRollAll,
  adjustPointBuy,
  pointsRemaining,
}: AbilitiesStepProps) {
  return (
    <div className="space-y-6">
      {/* Method Selection */}
      <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6">
        <h2 className="mb-4 text-xl font-semibold text-white">
          How would you like to generate ability scores?
        </h2>

        <div className="grid gap-3 sm:grid-cols-3">
          {METHODS.map((method) => {
            const isSelected = method.id === abilityMethod;
            return (
              <button
                key={method.id}
                onClick={() => onAbilityMethodChange(method.id)}
                className={`relative rounded-xl border p-4 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-purple-500 bg-purple-600/20 shadow-lg shadow-purple-500/20"
                    : "border-slate-700/50 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3">
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
                <div className="font-semibold text-white">{method.name}</div>
                <div className="mt-1 text-sm text-slate-400">
                  {method.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Method-specific UI */}
      <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6">
        {abilityMethod === "standard" && (
          <StandardArrayUI
            standardArrayAssignments={standardArrayAssignments}
            onStandardArrayAssignment={onStandardArrayAssignment}
          />
        )}

        {abilityMethod === "pointbuy" && (
          <PointBuyUI
            abilityScores={abilityScores}
            adjustPointBuy={adjustPointBuy}
            pointsRemaining={pointsRemaining}
          />
        )}

        {abilityMethod === "roll" && (
          <RollUI
            abilityScores={abilityScores}
            rolledScores={rolledScores}
            handleRollAll={handleRollAll}
          />
        )}
      </div>

      {/* Ability Score Summary */}
      <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Your Ability Scores
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ABILITIES.map((ability) => {
            const score = abilityScores[ability];
            const mod = calculateModifier(score);
            const modStr = formatModifier(mod);

            return (
              <div
                key={ability}
                className="rounded-xl bg-slate-900/50 p-4 text-center ring-1 ring-slate-700/50"
              >
                <div className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                  {ABILITY_LABELS[ability]}
                </div>
                <div className="mt-2 text-3xl font-bold text-white">
                  {score}
                </div>
                <div
                  className={`mt-1 text-lg font-semibold ${
                    mod >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {modStr}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {ABILITY_DESCRIPTIONS[ability]}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Standard Array UI
function StandardArrayUI({
  standardArrayAssignments,
  onStandardArrayAssignment,
}: {
  standardArrayAssignments: Record<Ability, number | null>;
  onStandardArrayAssignment: (ability: Ability, value: number | null) => void;
}) {
  const getAvailableValues = (ability: Ability) => {
    const currentValue = standardArrayAssignments[ability];
    const usedValues = Object.entries(standardArrayAssignments)
      .filter(([key, val]) => key !== ability && val !== null)
      .map(([, val]) => val as number);

    return STANDARD_ARRAY.filter(
      (val) => !usedValues.includes(val) || val === currentValue,
    );
  };

  const assignedCount = Object.values(standardArrayAssignments).filter(
    (v) => v !== null,
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Assign Standard Array Values
          </h3>
          <p className="text-sm text-slate-400">
            Drag or select values to assign them to abilities
          </p>
        </div>
        <div className="text-sm text-slate-400">{assignedCount}/6 assigned</div>
      </div>

      {/* Available values */}
      <div className="flex flex-wrap gap-2">
        {STANDARD_ARRAY.map((val, idx) => {
          const isUsed = Object.values(standardArrayAssignments).includes(val);
          return (
            <div
              key={idx}
              className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold transition-all ${
                isUsed
                  ? "bg-slate-700/50 text-slate-500"
                  : "bg-purple-600/30 text-purple-300 ring-1 ring-purple-500/50"
              }`}
            >
              {val}
            </div>
          );
        })}
      </div>

      {/* Assignment grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {ABILITIES.map((ability) => {
          const currentValue = standardArrayAssignments[ability];
          const availableValues = getAvailableValues(ability);

          return (
            <div
              key={ability}
              className="rounded-lg bg-slate-900/50 p-3 ring-1 ring-slate-700/50"
            >
              <div className="mb-2 text-xs font-medium tracking-wide text-slate-400 uppercase">
                {ABILITY_LABELS[ability]}
              </div>
              <Listbox
                value={currentValue?.toString() || ""}
                onChange={(val) =>
                  onStandardArrayAssignment(ability, val ? parseInt(val) : null)
                }
              >
                <div className="relative">
                  <ListboxButton className="flex w-full cursor-pointer items-center justify-center rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-lg font-bold text-white transition hover:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none">
                    {currentValue ?? "—"}
                  </ListboxButton>
                  <ListboxOptions
                    anchor="bottom"
                    className="z-50 mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl"
                  >
                    <ListboxOption
                      value=""
                      className="cursor-pointer px-3 py-2 text-center text-slate-400 hover:bg-purple-600/20"
                    >
                      —
                    </ListboxOption>
                    {availableValues.map((val) => (
                      <ListboxOption
                        key={val}
                        value={val.toString()}
                        className="cursor-pointer px-3 py-2 text-center font-medium text-white hover:bg-purple-600/20"
                      >
                        {val}
                      </ListboxOption>
                    ))}
                  </ListboxOptions>
                </div>
              </Listbox>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Point Buy UI
function PointBuyUI({
  abilityScores,
  adjustPointBuy,
  pointsRemaining,
}: {
  abilityScores: AbilityScores;
  adjustPointBuy: (ability: Ability, delta: number) => void;
  pointsRemaining: number;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Point Buy System</h3>
          <p className="text-sm text-slate-400">
            Distribute {POINT_BUY_TOTAL} points across your abilities (scores
            8-15)
          </p>
        </div>
        <div
          className={`rounded-lg px-4 py-2 text-lg font-bold ${
            pointsRemaining > 0
              ? "bg-purple-600/20 text-purple-300"
              : pointsRemaining === 0
                ? "bg-green-600/20 text-green-300"
                : "bg-red-600/20 text-red-300"
          }`}
        >
          {pointsRemaining} points left
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {ABILITIES.map((ability) => {
          const score = abilityScores[ability];
          const canIncrease = score < 15 && pointsRemaining > 0;
          const canDecrease = score > 8;

          return (
            <div
              key={ability}
              className="rounded-xl bg-slate-900/50 p-4 text-center ring-1 ring-slate-700/50"
            >
              <div className="mb-2 text-xs font-medium tracking-wide text-slate-400 uppercase">
                {ABILITY_LABELS[ability]}
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => canDecrease && adjustPointBuy(ability, -1)}
                  disabled={!canDecrease}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  −
                </button>
                <span className="w-12 text-2xl font-bold text-white">
                  {score}
                </span>
                <button
                  onClick={() => canIncrease && adjustPointBuy(ability, 1)}
                  disabled={!canIncrease}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  +
                </button>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                {formatModifier(calculateModifier(score))} modifier
              </div>
            </div>
          );
        })}
      </div>

      {/* Point cost reference */}
      <div className="rounded-lg bg-slate-900/30 p-4">
        <div className="mb-2 text-sm font-medium text-slate-400">
          Point Cost Reference
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          {[8, 9, 10, 11, 12, 13, 14, 15].map((score) => (
            <span key={score} className="text-slate-500">
              <span className="font-medium text-slate-300">{score}</span> ={" "}
              {score === 8
                ? 0
                : score === 9
                  ? 1
                  : score === 10
                    ? 2
                    : score === 11
                      ? 3
                      : score === 12
                        ? 4
                        : score === 13
                          ? 5
                          : score === 14
                            ? 7
                            : 9}{" "}
              pts
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Roll UI
function RollUI({
  abilityScores,
  rolledScores,
  handleRollAll,
}: {
  abilityScores: AbilityScores;
  rolledScores: { rolls: number[]; total: number }[];
  handleRollAll: () => void;
}) {
  const hasRolled = rolledScores.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Roll for Abilities
          </h3>
          <p className="text-sm text-slate-400">
            Roll 4d6, drop the lowest die for each ability score
          </p>
        </div>
        <Button
          onClick={handleRollAll}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 font-semibold text-white shadow-lg transition hover:from-purple-500 hover:to-pink-500"
        >
          🎲 {hasRolled ? "Reroll All" : "Roll Abilities"}
        </Button>
      </div>

      {hasRolled && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {ABILITIES.map((ability, index) => {
            const rollData = rolledScores[index];
            const score = abilityScores[ability];

            return (
              <div
                key={ability}
                className="rounded-xl bg-slate-900/50 p-4 text-center ring-1 ring-slate-700/50"
              >
                <div className="mb-2 text-xs font-medium tracking-wide text-slate-400 uppercase">
                  {ABILITY_LABELS[ability]}
                </div>
                <div className="text-3xl font-bold text-white">{score}</div>
                {rollData && (
                  <div className="mt-2 flex justify-center gap-1">
                    {rollData.rolls.map((die, dieIndex) => {
                      const isDropped =
                        die === Math.min(...rollData.rolls) &&
                        rollData.rolls.filter(
                          (d, i) => d === die && i < dieIndex,
                        ).length === 0;
                      return (
                        <span
                          key={dieIndex}
                          className={`flex h-6 w-6 items-center justify-center rounded text-xs font-medium ${
                            isDropped
                              ? "bg-red-900/50 text-red-400 line-through"
                              : "bg-purple-600/30 text-purple-300"
                          }`}
                        >
                          {die}
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="mt-2 text-sm text-slate-500">
                  {formatModifier(calculateModifier(score))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!hasRolled && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 py-12">
          <span className="text-6xl">🎲</span>
          <p className="mt-4 text-slate-400">
            Click the button above to roll your ability scores
          </p>
        </div>
      )}

      {/* Warning about rolling */}
      <div className="flex items-start gap-3 rounded-lg bg-amber-500/10 p-3 ring-1 ring-amber-500/20">
        <span className="text-lg">⚠️</span>
        <p className="text-sm text-slate-400">
          <span className="font-medium text-amber-300">Note:</span> Rolling is
          random and may result in very high or very low scores. If you want
          more control, consider using Standard Array or Point Buy.
        </p>
      </div>
    </div>
  );
}
