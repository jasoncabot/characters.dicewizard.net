import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@headlessui/react";
import { charactersApi } from "../api/client";
import type { Character } from "../types/character";
import {
  calculateModifier,
  formatModifier,
  calculateProficiencyBonus,
} from "../types/character";

interface CharacterListProps {
  onSelect: (character: Character) => void;
  onNew: () => void;
}

export function CharacterList({ onSelect, onNew }: CharacterListProps) {
  const queryClient = useQueryClient();

  const {
    data: characters,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["characters"],
    queryFn: charactersApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: charactersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/50 bg-red-500/20 p-4 text-red-300">
        Failed to load characters
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="cursor-default text-2xl font-bold text-white">
          Your Characters
        </h2>
        <Button
          onClick={onNew}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 font-semibold text-white shadow-lg transition hover:from-purple-500 hover:to-pink-500 hover:shadow-purple-500/25 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none active:scale-95"
        >
          <span>+</span> New Character
        </Button>
      </div>

      {characters?.length === 0 ? (
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 py-12 text-center">
          <div className="mb-4 text-6xl">🎭</div>
          <h3 className="mb-2 text-xl font-semibold text-white">
            No characters yet
          </h3>
          <p className="mb-6 text-slate-400">
            Create your first character to begin your adventure!
          </p>
          <Button
            onClick={onNew}
            className="cursor-pointer rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:from-purple-500 hover:to-pink-500 hover:shadow-purple-500/25 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none active:scale-95"
          >
            Create Character
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {characters?.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              onSelect={() => onSelect(character)}
              onDelete={() => {
                if (
                  confirm("Are you sure you want to delete this character?")
                ) {
                  deleteMutation.mutate(character.id);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CharacterCard({
  character,
  onSelect,
  onDelete,
}: {
  character: Character;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const profBonus = calculateProficiencyBonus(character.level);

  return (
    <div
      onClick={onSelect}
      className="group cursor-pointer rounded-xl border border-slate-700/50 bg-slate-800/50 p-5 backdrop-blur-sm transition hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10"
    >
      <div className="mb-3 flex gap-4">
        {/* Character Portrait */}
        <div className="flex-shrink-0">
          <div className="h-16 w-16 overflow-hidden rounded-lg border border-slate-600 bg-slate-900/50">
            <img
              src={`/portraits/${character.race.toLowerCase()}-${character.class.toLowerCase()}.svg`}
              alt={`${character.race} ${character.class}`}
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        {/* Character Info */}
        <div className="flex-grow">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-white transition group-hover:text-purple-300">
                {character.name}
              </h3>
              <p className="text-sm text-slate-400">
                Level {character.level} {character.race} {character.class}
              </p>
            </div>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="cursor-pointer rounded p-1 text-slate-500 transition hover:scale-110 hover:text-red-400 focus:ring-2 focus:ring-red-400 focus:outline-none active:scale-95"
              title="Delete character"
            >
              🗑️
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-3 flex gap-4">
        <div className="flex items-center gap-1">
          <span className="text-red-400">❤️</span>
          <span className="font-medium text-white">
            {character.currentHp}/{character.maxHp}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-blue-400">🛡️</span>
          <span className="font-medium text-white">{character.armorClass}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-yellow-400">⚡</span>
          <span className="font-medium text-white">
            {formatModifier(profBonus)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-1 text-center">
        {(
          [
            "strength",
            "dexterity",
            "constitution",
            "intelligence",
            "wisdom",
            "charisma",
          ] as const
        ).map((ability) => (
          <div key={ability} className="rounded bg-slate-900/50 p-1">
            <div className="text-[10px] text-slate-500 uppercase">
              {ability.slice(0, 3)}
            </div>
            <div className="text-sm font-bold text-white">
              {character[ability]}
            </div>
            <div className="text-xs text-purple-400">
              {formatModifier(calculateModifier(character[ability]))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
