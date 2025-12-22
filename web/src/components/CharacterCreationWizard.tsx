import { useState, useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@headlessui/react";
import { charactersApi } from "../api/client";
import type {
  CharacterCreate,
  Ability,
  SkillName,
  Species,
  ClassName,
  BackgroundName,
  Alignment,
} from "../types/character";
import {
  ABILITIES,
  CLASS_HIT_DICE,
  CLASS_SAVING_THROWS,
  SPECIES_TRAITS,
  POINT_BUY_COSTS,
  POINT_BUY_TOTAL,
  calculateModifier,
  rollAbilityScore,
} from "../types/character";
import { WIZARD_STEPS, type WizardStep } from "../data/characterData";
import type { AbilityMethod, AbilityScores } from "./character-sheet/types";

// Import wizard step components
import { SpeciesStep } from "./creation-wizard/SpeciesStep";
import { ClassStep } from "./creation-wizard/ClassStep";
import { BackgroundStep } from "./creation-wizard/BackgroundStep";
import { AbilitiesStep } from "./creation-wizard/AbilitiesStep";
import { DetailsStep } from "./creation-wizard/DetailsStep";
import { ReviewStep } from "./creation-wizard/ReviewStep";
import { InfoPanelProvider } from "./creation-wizard/TraitInfoContext";
import { InfoPanel } from "./creation-wizard/TraitInfoPanel";

interface CharacterCreationWizardProps {
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

export function CharacterCreationWizard({
  onBack,
  onSaved,
}: CharacterCreationWizardProps) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<WizardStep>("species");
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Character selections
  const [selectedSpecies, setSelectedSpecies] = useState<Species>("Human");
  const [selectedClass, setSelectedClass] = useState<ClassName>("Fighter");
  const [selectedBackground, setSelectedBackground] =
    useState<BackgroundName>("Soldier");
  const [selectedAlignment, setSelectedAlignment] =
    useState<Alignment>("True Neutral");
  const [characterName, setCharacterName] = useState("");

  // Ability score state
  const [abilityMethod, setAbilityMethod] = useState<AbilityMethod>("standard");
  const [abilityScores, setAbilityScores] =
    useState<AbilityScores>(defaultScores);
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

  // Proficiencies
  const [skillProficiencies, setSkillProficiencies] = useState<SkillName[]>([]);

  // Compute derived values
  const savingThrowProficiencies = useMemo(
    () => CLASS_SAVING_THROWS[selectedClass] || [],
    [selectedClass],
  );

  const derivedStats = useMemo(() => {
    const hitDie = CLASS_HIT_DICE[selectedClass] || 8;
    const conMod = calculateModifier(abilityScores.constitution);
    const hp = Math.max(1, hitDie + conMod);
    const dexMod = calculateModifier(abilityScores.dexterity);
    const speed = SPECIES_TRAITS[selectedSpecies]?.speed || 30;

    return {
      hitDice: `1d${hitDie}`,
      maxHp: hp,
      currentHp: hp,
      armorClass: 10 + dexMod,
      speed,
    };
  }, [selectedClass, selectedSpecies, abilityScores]);

  // Build character data for steps that need it
  const characterData = useMemo<Partial<CharacterCreate>>(
    () => ({
      name: characterName,
      race: selectedSpecies,
      class: selectedClass,
      level: 1,
      background: selectedBackground,
      alignment: selectedAlignment,
      experiencePoints: 0,
      ...derivedStats,
      skillProficiencies: [],
      savingThrowProficiencies: [],
      features: [],
      equipment: [],
    }),
    [
      characterName,
      selectedSpecies,
      selectedClass,
      selectedBackground,
      selectedAlignment,
      derivedStats,
    ],
  );

  const currentStepIndex = WIZARD_STEPS.findIndex((s) => s.id === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;

  const navigateToStep = useCallback((step: WizardStep) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStep(step);
      setIsTransitioning(false);
    }, 150);
  }, []);

  const handleNext = useCallback(() => {
    if (!isLastStep) {
      const nextStep = WIZARD_STEPS[currentStepIndex + 1];
      navigateToStep(nextStep.id);
    }
  }, [currentStepIndex, isLastStep, navigateToStep]);

  const handlePrevious = useCallback(() => {
    if (!isFirstStep) {
      const prevStep = WIZARD_STEPS[currentStepIndex - 1];
      navigateToStep(prevStep.id);
    }
  }, [currentStepIndex, isFirstStep, navigateToStep]);

  const updateCharacterData = useCallback(
    <K extends keyof CharacterCreate>(key: K, value: CharacterCreate[K]) => {
      switch (key) {
        case "name":
          setCharacterName(value as string);
          break;
        case "race":
          setSelectedSpecies(value as Species);
          break;
        case "class":
          setSelectedClass(value as ClassName);
          break;
        case "background":
          setSelectedBackground(value as BackgroundName);
          break;
        case "alignment":
          setSelectedAlignment(value as Alignment);
          break;
      }
    },
    [],
  );

  // Standard array logic
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
      setAbilityMethod(method);
      if (method === "standard") {
        setAbilityScores(applyStandardAssignments(standardArrayAssignments));
      }
    },
    [applyStandardAssignments, standardArrayAssignments],
  );

  // Roll ability scores
  const handleRollAll = useCallback(() => {
    const newRolls = ABILITIES.map(() => rollAbilityScore());
    setRolledScores(newRolls);
    const newScores = { ...defaultScores };
    ABILITIES.forEach((ability, index) => {
      newScores[ability] = newRolls[index].total;
    });
    setAbilityScores(newScores);
  }, []);

  // Point buy logic
  const pointBuyCost = Object.values(abilityScores).reduce(
    (total, score) => total + (POINT_BUY_COSTS[score] ?? 0),
    0,
  );
  const pointsRemaining = POINT_BUY_TOTAL - pointBuyCost;

  const adjustPointBuy = useCallback(
    (ability: Ability, delta: number) => {
      const current = abilityScores[ability];
      const newValue = current + delta;
      if (newValue < 8 || newValue > 15) return;

      const newCost = POINT_BUY_COSTS[newValue] - POINT_BUY_COSTS[current];
      if (pointsRemaining - newCost < 0) return;

      setAbilityScores((prev) => ({ ...prev, [ability]: newValue }));
    },
    [abilityScores, pointsRemaining],
  );

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CharacterCreate) => charactersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters"] });
      onSaved();
    },
  });

  const handleSubmit = useCallback(() => {
    const payload: CharacterCreate = {
      name: characterName || "New Character",
      race: selectedSpecies,
      class: selectedClass,
      level: 1,
      background: selectedBackground,
      alignment: selectedAlignment,
      experiencePoints: 0,
      ...abilityScores,
      ...derivedStats,
      tempHp: 0,
      skillProficiencies,
      savingThrowProficiencies,
      features: [],
      equipment: [],
    };

    createMutation.mutate(payload);
  }, [
    characterName,
    selectedSpecies,
    selectedClass,
    selectedBackground,
    selectedAlignment,
    abilityScores,
    derivedStats,
    skillProficiencies,
    savingThrowProficiencies,
    createMutation,
  ]);

  // Check if current step is complete
  const isStepComplete = useMemo(() => {
    switch (currentStep) {
      case "species":
        return !!selectedSpecies;
      case "class":
        return !!selectedClass;
      case "background":
        return !!selectedBackground;
      case "abilities":
        return Object.values(abilityScores).every((score) => score >= 8);
      case "details":
        return characterName.trim().length > 0;
      case "review":
        return true;
      default:
        return false;
    }
  }, [
    currentStep,
    selectedSpecies,
    selectedClass,
    selectedBackground,
    abilityScores,
    characterName,
  ]);

  const renderStepContent = () => {
    switch (currentStep) {
      case "species":
        return (
          <SpeciesStep
            selectedSpecies={selectedSpecies}
            onSelect={(species: Species) => setSelectedSpecies(species)}
          />
        );
      case "class":
        return (
          <ClassStep
            selectedClass={selectedClass}
            onSelect={(cls: ClassName) => setSelectedClass(cls)}
          />
        );
      case "background":
        return (
          <BackgroundStep
            selectedBackground={selectedBackground}
            onSelect={(bg: BackgroundName) => setSelectedBackground(bg)}
          />
        );
      case "abilities":
        return (
          <AbilitiesStep
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
        );
      case "details":
        return (
          <DetailsStep
            characterData={characterData}
            updateCharacterData={updateCharacterData}
            skillProficiencies={skillProficiencies}
            setSkillProficiencies={setSkillProficiencies}
            abilityScores={abilityScores}
          />
        );
      case "review":
        return (
          <ReviewStep
            characterData={characterData}
            abilityScores={abilityScores}
            skillProficiencies={skillProficiencies}
            savingThrowProficiencies={savingThrowProficiencies}
            onEditStep={navigateToStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <InfoPanelProvider>
      <div className="flex w-full gap-0">
        {/* Main Content */}
        <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={onBack}
              className="mb-4 flex items-center gap-2 text-slate-400 transition hover:text-white"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Characters
            </button>

            <div className="text-center">
              <h1 className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-3xl font-bold text-transparent">
                Create Your Character
              </h1>
              <p className="mt-2 text-slate-400">
                Follow the steps to bring your hero to life
              </p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2">
              {WIZARD_STEPS.map((step, index) => {
                const isActive = step.id === currentStep;
                const isPast = index < currentStepIndex;
                const isClickable =
                  isPast || (index === currentStepIndex + 1 && isStepComplete);

                return (
                  <button
                    key={step.id}
                    onClick={() => isClickable && navigateToStep(step.id)}
                    disabled={!isClickable && !isActive}
                    className={`group flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25"
                        : isPast
                          ? "bg-purple-600/20 text-purple-300 hover:bg-purple-600/30"
                          : "bg-slate-800/50 text-slate-500"
                    } ${isClickable && !isActive ? "cursor-pointer" : ""} ${
                      !isClickable && !isActive
                        ? "cursor-not-allowed opacity-50"
                        : ""
                    }`}
                  >
                    <span className="text-base">{step.icon}</span>
                    <span className="hidden sm:inline">{step.label}</span>
                    {isPast && (
                      <svg
                        className="h-4 w-4 text-green-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <div
            className={`min-h-[500px] transition-all duration-300 ${
              isTransitioning ? "scale-95 opacity-0" : "scale-100 opacity-100"
            }`}
          >
            {renderStepContent()}
          </div>

          {/* Navigation Buttons */}
          <div className="mt-8 flex items-center justify-between border-t border-slate-700/50 pt-6">
            <Button
              onClick={isFirstStep ? onBack : handlePrevious}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-slate-700 px-5 py-2.5 font-medium text-white transition hover:bg-slate-600"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              {isFirstStep ? "Cancel" : "Previous"}
            </Button>

            {isLastStep ? (
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || !characterName}
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-2.5 font-semibold text-white shadow-lg transition hover:from-purple-500 hover:to-pink-500 hover:shadow-purple-500/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    Create Character
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!isStepComplete}
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-2.5 font-semibold text-white shadow-lg transition hover:from-purple-500 hover:to-pink-500 hover:shadow-purple-500/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue
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
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Button>
            )}
          </div>

          {/* Error Display */}
          {createMutation.error && (
            <div className="mt-4 rounded-lg border border-red-500/50 bg-red-500/20 p-4 text-red-300">
              {createMutation.error instanceof Error
                ? createMutation.error.message
                : "An error occurred"}
            </div>
          )}
        </div>

        {/* Info Side Panel (desktop) / Modal (mobile) */}
        <InfoPanel />
      </div>
    </InfoPanelProvider>
  );
}
