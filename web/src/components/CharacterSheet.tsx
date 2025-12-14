import { useState, useEffect, useCallback } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@headlessui/react";
import { charactersApi } from "../api/client";
import type { Character, CharacterCreate, Ability } from "../types/character";
import {
  ABILITIES,
  CLASS_HIT_DICE,
  CLASS_SAVING_THROWS,
  SPECIES_TRAITS,
  POINT_BUY_COSTS,
  POINT_BUY_TOTAL,
  calculateModifier,
  calculateProficiencyBonus,
  rollAbilityScore,
} from "../types/character";
import { BasicInfoSection } from "./character-sheet/BasicInfoSection";
import { AbilityScoresSection } from "./character-sheet/AbilityScoresSection";
import { CombatStatsSection } from "./character-sheet/CombatStatsSection";
import { SavingThrowsSection } from "./character-sheet/SavingThrowsSection";
import { SkillsSection } from "./character-sheet/SkillsSection";
import { NotesSection } from "./character-sheet/NotesSection";
import type { AbilityMethod, AbilityScores } from "./character-sheet/types";

interface CharacterSheetProps {
  character?: Character | null;
  onBack: () => void;
  onSaved: () => void;
}

const defaultScores: AbilityScores = {
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
};

export function CharacterSheet({
  character,
  onBack,
  onSaved,
}: CharacterSheetProps) {
  const queryClient = useQueryClient();
  const isEditing = !!character;

  // Ability score generation state
  const [abilityMethod, setAbilityMethodState] =
    useState<AbilityMethod>("standard");
  const [abilityScores, setAbilityScores] = useState<AbilityScores>(
    character
      ? {
          strength: character.strength,
          dexterity: character.dexterity,
          constitution: character.constitution,
          intelligence: character.intelligence,
          wisdom: character.wisdom,
          charisma: character.charisma,
        }
      : defaultScores,
  );
  const [standardArrayAssignments, setStandardArrayAssignments] = useState<
    Record<Ability, number | null>
  >({
    strength: null,
    dexterity: null,
    constitution: null,
    intelligence: null,
    wisdom: null,
    charisma: null,
  });
  const [rolledScores, setRolledScores] = useState<
    { rolls: number[]; total: number }[]
  >([]);

  // Proficiency state
  const [skillProficiencies, setSkillProficiencies] = useState<string[]>(
    character?.skillProficiencies ?? [],
  );
  const [savingThrowProficiencies, setSavingThrowProficiencies] = useState<
    string[]
  >(
    character?.savingThrowProficiencies ??
      CLASS_SAVING_THROWS[character?.class ?? "Fighter"] ??
      [],
  );

  // Form state
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<CharacterCreate>({
    defaultValues: character
      ? {
          name: character.name,
          race: character.race,
          class: character.class,
          level: character.level,
          background: character.background,
          alignment: character.alignment,
          experiencePoints: character.experiencePoints,
          strength: character.strength,
          dexterity: character.dexterity,
          constitution: character.constitution,
          intelligence: character.intelligence,
          wisdom: character.wisdom,
          charisma: character.charisma,
          maxHp: character.maxHp,
          currentHp: character.currentHp,
          tempHp: character.tempHp,
          armorClass: character.armorClass,
          speed: character.speed,
          hitDice: character.hitDice,
          skillProficiencies: character.skillProficiencies,
          savingThrowProficiencies: character.savingThrowProficiencies,
          features: character.features,
          equipment: character.equipment,
          notes: character.notes,
        }
      : {
          name: "",
          race: "Human",
          class: "Fighter",
          level: 1,
          background: "Soldier",
          alignment: "True Neutral",
          experiencePoints: 0,
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
          maxHp: 10,
          currentHp: 10,
          tempHp: 0,
          armorClass: 10,
          speed: 30,
          hitDice: "1d10",
          skillProficiencies: [],
          savingThrowProficiencies: [],
          features: [],
          equipment: [],
          notes: "",
        },
  });

  const selectedClass =
    (useWatch({ control, name: "class" }) as
      | CharacterCreate["class"]
      | undefined) || "Fighter";
  const selectedRace =
    (useWatch({ control, name: "race" }) as
      | CharacterCreate["race"]
      | undefined) || "Human";
  const level =
    (useWatch({ control, name: "level" }) as
      | CharacterCreate["level"]
      | undefined) || 1;
  const background =
    (useWatch({ control, name: "background" }) as
      | CharacterCreate["background"]
      | undefined) || "Soldier";
  const alignment =
    (useWatch({ control, name: "alignment" }) as
      | CharacterCreate["alignment"]
      | undefined) || "True Neutral";
  const proficiencyBonus = calculateProficiencyBonus(level);

  const applyStandardAssignments = useCallback(
    (assignments: Record<Ability, number | null>): AbilityScores => {
      const updated: AbilityScores = { ...defaultScores };
      (Object.entries(assignments) as [Ability, number | null][]).forEach(
        ([ability, value]) => {
          if (value !== null) {
            updated[ability] = value;
          }
        },
      );
      return updated;
    },
    [],
  );

  const updateStandardArrayAssignment = useCallback(
    (abilityKey: Ability, value: number | null) => {
      setStandardArrayAssignments((prev) => {
        const next = { ...prev, [abilityKey]: value };
        if (abilityMethod === "standard") {
          setAbilityScores(applyStandardAssignments(next));
        }
        return next;
      });
    },
    [abilityMethod, applyStandardAssignments],
  );

  const handleAbilityMethodChange = useCallback(
    (method: AbilityMethod) => {
      setAbilityMethodState(method);
      if (method === "standard") {
        setAbilityScores(applyStandardAssignments(standardArrayAssignments));
      }
    },
    [applyStandardAssignments, standardArrayAssignments],
  );

  const handleClassSelection = useCallback(
    (newClass: CharacterCreate["class"]) => {
      if (!isEditing) {
        const classSaves = CLASS_SAVING_THROWS[newClass] || [];
        setSavingThrowProficiencies(classSaves);
        const hitDie = CLASS_HIT_DICE[newClass] || 8;
        setValue("hitDice", `1d${hitDie}`);
      }
    },
    [isEditing, setSavingThrowProficiencies, setValue],
  );

  const handleRaceSelection = useCallback(
    (newRace: CharacterCreate["race"]) => {
      if (!isEditing) {
        const traits = SPECIES_TRAITS[newRace];
        if (traits) {
          setValue("speed", traits.speed);
        }
      }
    },
    [isEditing, setValue],
  );

  // Sync ability scores to form
  useEffect(() => {
    ABILITIES.forEach((ability) => {
      setValue(ability, abilityScores[ability]);
    });
  }, [abilityScores, setValue]);

  // Calculate HP when constitution or class changes
  useEffect(() => {
    if (!isEditing) {
      const hitDie = CLASS_HIT_DICE[selectedClass] || 8;
      const conMod = calculateModifier(abilityScores.constitution);
      const hp = Math.max(1, hitDie + conMod);
      setValue("maxHp", hp);
      setValue("currentHp", hp);
    }
  }, [selectedClass, abilityScores.constitution, isEditing, setValue]);

  // Calculate AC based on dexterity
  useEffect(() => {
    if (!isEditing) {
      const dexMod = calculateModifier(abilityScores.dexterity);
      setValue("armorClass", 10 + dexMod);
    }
  }, [abilityScores.dexterity, isEditing, setValue]);

  // Point buy calculation
  const pointBuyCost = Object.values(abilityScores).reduce(
    (total, score) => total + (POINT_BUY_COSTS[score] ?? 0),
    0,
  );
  const pointsRemaining = POINT_BUY_TOTAL - pointBuyCost;

  // Roll all ability scores
  const handleRollAll = useCallback(() => {
    const newRolls = ABILITIES.map(() => rollAbilityScore());
    setRolledScores(newRolls);
    const newScores = { ...defaultScores };
    ABILITIES.forEach((ability, index) => {
      newScores[ability] = newRolls[index].total;
    });
    setAbilityScores(newScores);
  }, []);

  // Point buy adjustment
  const adjustPointBuy = (ability: Ability, delta: number) => {
    const current = abilityScores[ability];
    const newValue = current + delta;
    if (newValue < 8 || newValue > 15) return;

    const newCost = POINT_BUY_COSTS[newValue] - POINT_BUY_COSTS[current];
    if (pointsRemaining - newCost < 0) return;

    setAbilityScores((prev) => ({ ...prev, [ability]: newValue }));
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CharacterCreate) => charactersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters"] });
      onSaved();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CharacterCreate) =>
      charactersApi.update(character!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters"] });
      onSaved();
    },
  });

  const onSubmit = (data: CharacterCreate) => {
    const payload: CharacterCreate = {
      ...data,
      ...abilityScores,
      skillProficiencies,
      savingThrowProficiencies,
    };

    if (isEditing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <Button
          onClick={onBack}
          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-slate-400 transition hover:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
        >
          ← Back to Characters
        </Button>
        <h1 className="text-2xl font-bold text-white">
          {isEditing ? `Edit ${character.name}` : "Create New Character"}
        </h1>
        <div className="w-32"></div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <BasicInfoSection
          register={register}
          errors={errors}
          selectedRace={selectedRace}
          selectedClass={selectedClass}
          background={background}
          alignment={alignment}
          setValue={setValue}
          proficiencyBonus={proficiencyBonus}
          onClassChange={handleClassSelection}
          onRaceChange={handleRaceSelection}
        />

        <AbilityScoresSection
          isEditing={isEditing}
          abilityMethod={abilityMethod}
          onAbilityMethodChange={handleAbilityMethodChange}
          abilityScores={abilityScores}
          setAbilityScores={setAbilityScores}
          standardArrayAssignments={standardArrayAssignments}
          onStandardArrayAssignment={updateStandardArrayAssignment}
          rolledScores={rolledScores}
          handleRollAll={handleRollAll}
          adjustPointBuy={adjustPointBuy}
          pointsRemaining={pointsRemaining}
        />

        <CombatStatsSection
          register={register}
          abilityScores={abilityScores}
          proficiencyBonus={proficiencyBonus}
          skillProficiencies={skillProficiencies}
        />

        <SavingThrowsSection
          abilityScores={abilityScores}
          savingThrowProficiencies={savingThrowProficiencies}
          setSavingThrowProficiencies={setSavingThrowProficiencies}
          proficiencyBonus={proficiencyBonus}
        />

        <SkillsSection
          abilityScores={abilityScores}
          skillProficiencies={skillProficiencies}
          setSkillProficiencies={setSkillProficiencies}
          proficiencyBonus={proficiencyBonus}
        />

        <NotesSection register={register} />

        {/* Error and Submit */}
        {error && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/20 p-4 text-red-300">
            {error instanceof Error ? error.message : "An error occurred"}
          </div>
        )}

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            onClick={onBack}
            className="cursor-pointer rounded-lg bg-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-600 focus:ring-2 focus:ring-slate-400 focus:outline-none active:bg-slate-500"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="cursor-pointer rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:from-purple-500 hover:to-pink-500 hover:shadow-purple-500/25 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none active:from-purple-700 active:to-pink-700 disabled:cursor-not-allowed disabled:opacity-50 data-[disabled]:cursor-not-allowed"
          >
            {isLoading
              ? "Saving..."
              : isEditing
                ? "Save Changes"
                : "Create Character"}
          </Button>
        </div>
      </form>
    </div>
  );
}
