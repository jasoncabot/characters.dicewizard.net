import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { charactersApi } from '../api/client';
import type { Character, CharacterCreate, Ability } from '../types/character';
import {
  ABILITIES,
  ABILITY_LABELS,
  ABILITY_DESCRIPTIONS,
  SKILLS,
  SPECIES,
  SPECIES_TRAITS,
  CLASSES,
  BACKGROUNDS,
  BACKGROUND_DETAILS,
  ALIGNMENTS,
  CLASS_HIT_DICE,
  CLASS_SAVING_THROWS,
  STANDARD_ARRAY,
  POINT_BUY_COSTS,
  POINT_BUY_TOTAL,
  calculateModifier,
  formatModifier,
  calculateProficiencyBonus,
  rollAbilityScore,
} from '../types/character';
import { useState, useEffect, useCallback } from 'react';

interface CharacterSheetProps {
  character?: Character | null;
  onBack: () => void;
  onSaved: () => void;
}

type AbilityMethod = 'standard' | 'pointbuy' | 'roll';

const defaultScores: Record<Ability, number> = {
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
};

export function CharacterSheet({ character, onBack, onSaved }: CharacterSheetProps) {
  const queryClient = useQueryClient();
  const isEditing = !!character;

  // Ability score generation state
  const [abilityMethod, setAbilityMethod] = useState<AbilityMethod>('standard');
  const [abilityScores, setAbilityScores] = useState<Record<Ability, number>>(
    character ? {
      strength: character.strength,
      dexterity: character.dexterity,
      constitution: character.constitution,
      intelligence: character.intelligence,
      wisdom: character.wisdom,
      charisma: character.charisma,
    } : defaultScores
  );
  const [standardArrayAssignments, setStandardArrayAssignments] = useState<Record<Ability, number | null>>({
    strength: null,
    dexterity: null,
    constitution: null,
    intelligence: null,
    wisdom: null,
    charisma: null,
  });
  const [rolledScores, setRolledScores] = useState<{ rolls: number[]; total: number }[]>([]);

  // Proficiency state
  const [skillProficiencies, setSkillProficiencies] = useState<string[]>(
    character?.skillProficiencies ?? []
  );
  const [savingThrowProficiencies, setSavingThrowProficiencies] = useState<string[]>(
    character?.savingThrowProficiencies ?? []
  );

  // Form state
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CharacterCreate>({
    defaultValues: character ? {
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
    } : {
      name: '',
      race: 'Human',
      class: 'Fighter',
      level: 1,
      background: 'Soldier',
      alignment: 'True Neutral',
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
      hitDice: '1d10',
      skillProficiencies: [],
      savingThrowProficiencies: [],
      features: [],
      equipment: [],
      notes: '',
    },
  });

  const watchedValues = watch();
  const selectedClass = watchedValues.class;
  const selectedRace = watchedValues.race;
  const level = watchedValues.level || 1;
  const proficiencyBonus = calculateProficiencyBonus(level);

  // Update saving throws when class changes
  useEffect(() => {
    if (!isEditing && selectedClass) {
      const classSaves = CLASS_SAVING_THROWS[selectedClass] || [];
      setSavingThrowProficiencies(classSaves);
    }
  }, [selectedClass, isEditing]);

  // Update speed when species changes
  useEffect(() => {
    if (!isEditing && selectedRace) {
      const traits = SPECIES_TRAITS[selectedRace];
      if (traits) {
        setValue('speed', traits.speed);
      }
    }
  }, [selectedRace, isEditing, setValue]);

  // Update hit dice when class changes
  useEffect(() => {
    if (!isEditing && selectedClass) {
      const hitDie = CLASS_HIT_DICE[selectedClass] || 8;
      setValue('hitDice', `1d${hitDie}`);
    }
  }, [selectedClass, isEditing, setValue]);

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
      setValue('maxHp', hp);
      setValue('currentHp', hp);
    }
  }, [selectedClass, abilityScores.constitution, isEditing, setValue]);

  // Calculate AC based on dexterity
  useEffect(() => {
    if (!isEditing) {
      const dexMod = calculateModifier(abilityScores.dexterity);
      setValue('armorClass', 10 + dexMod);
    }
  }, [abilityScores.dexterity, isEditing, setValue]);

  // Point buy calculation
  const pointBuyCost = Object.values(abilityScores).reduce((total, score) => {
    return total + (POINT_BUY_COSTS[score] ?? 0);
  }, 0);
  const pointsRemaining = POINT_BUY_TOTAL - pointBuyCost;

  // Standard array helpers
  const getUsedArrayValues = () => {
    return Object.values(standardArrayAssignments).filter((v): v is number => v !== null);
  };

  const getAvailableArrayValues = () => {
    const used = getUsedArrayValues();
    return STANDARD_ARRAY.filter((v) => {
      const usedCount = used.filter((u) => u === v).length;
      const totalCount = STANDARD_ARRAY.filter((s) => s === v).length;
      return usedCount < totalCount;
    });
  };

  // Apply standard array assignments to ability scores
  useEffect(() => {
    if (abilityMethod === 'standard') {
      const newScores = { ...defaultScores };
      (Object.entries(standardArrayAssignments) as [Ability, number | null][]).forEach(([ability, value]) => {
        if (value !== null) {
          newScores[ability] = value;
        }
      });
      setAbilityScores(newScores);
    }
  }, [standardArrayAssignments, abilityMethod]);

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
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      onSaved();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CharacterCreate) => charactersApi.update(character!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters'] });
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
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition"
        >
          ← Back to Characters
        </button>
        <h1 className="text-2xl font-bold text-white">
          {isEditing ? `Edit ${character.name}` : 'Create New Character'}
        </h1>
        <div className="w-32"></div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <section className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Basic Information</h2>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Character Portrait */}
            <div className="flex-shrink-0 flex flex-col items-center">
              <div className="w-40 h-40 rounded-xl overflow-hidden border-2 border-slate-600 bg-slate-900/50 shadow-lg">
                <img
                  src={`/portraits/${selectedRace.toLowerCase()}-${selectedClass.toLowerCase()}.svg`}
                  alt={`${selectedRace} ${selectedClass}`}
                  className="w-full h-full object-cover transition-all duration-300"
                />
              </div>
              <p className="mt-2 text-sm text-slate-400 text-center">
                {selectedRace} {selectedClass}
              </p>
            </div>

            {/* Form Fields */}
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Character Name *</label>
                <input
                  {...register('name', { required: 'Name is required' })}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter name"
                />
                {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Species</label>
                <select
                  {...register('race')}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {SPECIES.map((species) => (
                    <option key={species} value={species}>{species}</option>
                  ))}
                </select>
                {selectedRace && SPECIES_TRAITS[selectedRace] && (
                  <p className="text-xs text-slate-500 mt-1">
                    Speed: {SPECIES_TRAITS[selectedRace].speed} ft • Size: {SPECIES_TRAITS[selectedRace].size}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Class</label>
                <select
                  {...register('class')}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {CLASSES.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
                {selectedClass && (
                  <p className="text-xs text-slate-500 mt-1">
                    Hit Die: d{CLASS_HIT_DICE[selectedClass]} • Saves: {CLASS_SAVING_THROWS[selectedClass]?.map(s => s.slice(0,3).toUpperCase()).join(', ')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Background</label>
                <select
                  {...register('background')}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {BACKGROUNDS.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
                {watchedValues.background && BACKGROUND_DETAILS[watchedValues.background] && (
                  <p className="text-xs text-slate-500 mt-1">
                    Feat: {BACKGROUND_DETAILS[watchedValues.background].feat}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Level</label>
                <input
                  type="number"
                  {...register('level', { valueAsNumber: true, min: 1, max: 20 })}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  min={1}
                  max={20}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Alignment</label>
                <select
                  {...register('alignment')}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {ALIGNMENTS.map((alignment) => (
                    <option key={alignment} value={alignment}>{alignment}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4 p-3 bg-slate-900/30 rounded-lg">
            <div className="text-slate-400">Proficiency Bonus:</div>
            <div className="text-2xl font-bold text-purple-400">{formatModifier(proficiencyBonus)}</div>
          </div>
        </section>

        {/* Ability Scores */}
        <section className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Ability Scores</h2>
            {!isEditing && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAbilityMethod('standard')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition ${
                    abilityMethod === 'standard'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Standard Array
                </button>
                <button
                  type="button"
                  onClick={() => setAbilityMethod('pointbuy')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition ${
                    abilityMethod === 'pointbuy'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Point Buy
                </button>
                <button
                  type="button"
                  onClick={() => setAbilityMethod('roll')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition ${
                    abilityMethod === 'roll'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Roll
                </button>
              </div>
            )}
          </div>

          {/* Method-specific instructions */}
          {!isEditing && (
            <div className="mb-4 p-3 bg-slate-900/30 rounded-lg text-sm text-slate-400">
              {abilityMethod === 'standard' && (
                <p>Assign the standard array values (15, 14, 13, 12, 10, 8) to your abilities. Each value can only be used once.</p>
              )}
              {abilityMethod === 'pointbuy' && (
                <div className="flex items-center justify-between">
                  <p>Spend 27 points to set your ability scores (8-15 range).</p>
                  <div className={`text-lg font-bold ${pointsRemaining < 0 ? 'text-red-400' : pointsRemaining === 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                    Points: {pointsRemaining} / {POINT_BUY_TOTAL}
                  </div>
                </div>
              )}
              {abilityMethod === 'roll' && (
                <div className="flex items-center justify-between">
                  <p>Roll 4d6, drop the lowest die, for each ability score.</p>
                  <button
                    type="button"
                    onClick={handleRollAll}
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition"
                  >
                    🎲 Roll All
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {ABILITIES.map((ability, index) => {
              const score = abilityScores[ability];
              const modifier = calculateModifier(score);

              return (
                <div key={ability} className="bg-slate-900/50 rounded-xl p-4 text-center border border-slate-700/50">
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                    {ABILITY_LABELS[ability]}
                  </label>
                  <div className="text-2xl font-bold text-purple-400 mb-2">
                    {formatModifier(modifier)}
                  </div>

                  {isEditing ? (
                    <input
                      type="number"
                      value={score}
                      onChange={(e) => setAbilityScores((prev) => ({ ...prev, [ability]: parseInt(e.target.value) || 8 }))}
                      className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
                      min={1}
                      max={30}
                    />
                  ) : abilityMethod === 'standard' ? (
                    <select
                      value={standardArrayAssignments[ability] ?? ''}
                      onChange={(e) => {
                        const value = e.target.value ? parseInt(e.target.value) : null;
                        setStandardArrayAssignments((prev) => ({ ...prev, [ability]: value }));
                      }}
                      className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">--</option>
                      {getAvailableArrayValues().map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                      {standardArrayAssignments[ability] !== null && (
                        <option value={standardArrayAssignments[ability]!}>{standardArrayAssignments[ability]}</option>
                      )}
                    </select>
                  ) : abilityMethod === 'pointbuy' ? (
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => adjustPointBuy(ability, -1)}
                        disabled={score <= 8}
                        className="w-8 h-8 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white transition"
                      >
                        -
                      </button>
                      <span className="w-10 text-center text-white font-bold">{score}</span>
                      <button
                        type="button"
                        onClick={() => adjustPointBuy(ability, 1)}
                        disabled={score >= 15 || pointsRemaining <= 0}
                        className="w-8 h-8 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white transition"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="text-lg font-bold text-white">{score}</div>
                      {rolledScores[index] && (
                        <div className="text-xs text-slate-500">
                          [{rolledScores[index].rolls.join(', ')}]
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-slate-500 mt-2">{ABILITY_DESCRIPTIONS[ability]}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Combat Stats */}
        <section className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Combat Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-slate-900/50 rounded-xl p-4 text-center border border-slate-700/50">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Current HP
              </label>
              <input
                type="number"
                {...register('currentHp', { valueAsNumber: true, min: 0 })}
                className="w-full px-2 py-2 bg-slate-800 border border-slate-600 rounded text-white text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                min={0}
              />
            </div>

            <div className="bg-slate-900/50 rounded-xl p-4 text-center border border-slate-700/50">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Max HP
              </label>
              <input
                type="number"
                {...register('maxHp', { valueAsNumber: true, min: 1 })}
                className="w-full px-2 py-2 bg-slate-800 border border-slate-600 rounded text-white text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                min={1}
              />
            </div>

            <div className="bg-slate-900/50 rounded-xl p-4 text-center border border-slate-700/50">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Temp HP
              </label>
              <input
                type="number"
                {...register('tempHp', { valueAsNumber: true, min: 0 })}
                className="w-full px-2 py-2 bg-slate-800 border border-slate-600 rounded text-white text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={0}
              />
            </div>

            <div className="bg-slate-900/50 rounded-xl p-4 text-center border border-slate-700/50">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Armor Class
              </label>
              <input
                type="number"
                {...register('armorClass', { valueAsNumber: true, min: 0 })}
                className="w-full px-2 py-2 bg-slate-800 border border-slate-600 rounded text-white text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={0}
              />
            </div>

            <div className="bg-slate-900/50 rounded-xl p-4 text-center border border-slate-700/50">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Speed
              </label>
              <div className="flex items-center justify-center">
                <input
                  type="number"
                  {...register('speed', { valueAsNumber: true, min: 0 })}
                  className="w-20 px-2 py-2 bg-slate-800 border border-slate-600 rounded text-white text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  min={0}
                />
                <span className="text-slate-400 ml-1">ft.</span>
              </div>
            </div>
          </div>

          {/* Initiative and Passive Perception */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-slate-900/30 rounded-lg p-3 flex items-center justify-between">
              <span className="text-slate-400">Initiative</span>
              <span className="text-xl font-bold text-white">
                {formatModifier(calculateModifier(abilityScores.dexterity))}
              </span>
            </div>
            <div className="bg-slate-900/30 rounded-lg p-3 flex items-center justify-between">
              <span className="text-slate-400">Passive Perception</span>
              <span className="text-xl font-bold text-white">
                {10 + calculateModifier(abilityScores.wisdom) + (skillProficiencies.includes('Perception') ? proficiencyBonus : 0)}
              </span>
            </div>
          </div>
        </section>

        {/* Saving Throws */}
        <section className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Saving Throws</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {ABILITIES.map((ability) => {
              const isProficient = savingThrowProficiencies.includes(ability);
              const modifier = calculateModifier(abilityScores[ability]);
              const total = modifier + (isProficient ? proficiencyBonus : 0);

              return (
                <label
                  key={ability}
                  className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition ${
                    isProficient
                      ? 'bg-purple-600/20 border border-purple-500/50'
                      : 'bg-slate-900/30 border border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isProficient}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSavingThrowProficiencies([...savingThrowProficiencies, ability]);
                      } else {
                        setSavingThrowProficiencies(savingThrowProficiencies.filter((s) => s !== ability));
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-slate-300 uppercase">{ability.slice(0, 3)}</span>
                  <span className={`ml-auto font-bold ${isProficient ? 'text-purple-400' : 'text-white'}`}>
                    {formatModifier(total)}
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        {/* Skills */}
        <section className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Skills</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.entries(SKILLS).map(([skill, ability]) => {
              const isProficient = skillProficiencies.includes(skill);
              const modifier = calculateModifier(abilityScores[ability]);
              const total = modifier + (isProficient ? proficiencyBonus : 0);

              return (
                <label
                  key={skill}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition ${
                    isProficient
                      ? 'bg-purple-600/20 border border-purple-500/50'
                      : 'bg-slate-900/30 border border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isProficient}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSkillProficiencies([...skillProficiencies, skill]);
                      } else {
                        setSkillProficiencies(skillProficiencies.filter((s) => s !== skill));
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-slate-300">{skill}</span>
                  <span className="text-xs text-slate-500 uppercase">({ability.slice(0, 3)})</span>
                  <span className={`ml-auto font-bold ${isProficient ? 'text-purple-400' : 'text-white'}`}>
                    {formatModifier(total)}
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        {/* Notes */}
        <section className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Notes</h2>
          <textarea
            {...register('notes')}
            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-32"
            placeholder="Character backstory, equipment, features, etc."
          />
        </section>

        {/* Error and Submit */}
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">
            {error instanceof Error ? error.message : 'An error occurred'}
          </div>
        )}

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-purple-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Character'}
          </button>
        </div>
      </form>
    </div>
  );
}
