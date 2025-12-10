import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { charactersApi } from '../api/client';
import type { Character } from '../types/character';
import { calculateModifier, formatModifier, calculateProficiencyBonus } from '../types/character';

interface CharacterListProps {
  onSelect: (character: Character) => void;
  onNew: () => void;
}

export function CharacterList({ onSelect, onNew }: CharacterListProps) {
  const queryClient = useQueryClient();

  const { data: characters, isLoading, error } = useQuery({
    queryKey: ['characters'],
    queryFn: charactersApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: charactersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">
        Failed to load characters
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Your Characters</h2>
        <button
          onClick={onNew}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-purple-500/25 transition flex items-center gap-2"
        >
          <span>+</span> New Character
        </button>
      </div>

      {characters?.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700/50">
          <div className="text-6xl mb-4">🎭</div>
          <h3 className="text-xl font-semibold text-white mb-2">No characters yet</h3>
          <p className="text-slate-400 mb-6">Create your first character to begin your adventure!</p>
          <button
            onClick={onNew}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg shadow-lg transition"
          >
            Create Character
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {characters?.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              onSelect={() => onSelect(character)}
              onDelete={() => {
                if (confirm('Are you sure you want to delete this character?')) {
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
      className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-5 cursor-pointer hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition group"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition">
            {character.name}
          </h3>
          <p className="text-slate-400 text-sm">
            Level {character.level} {character.race} {character.class}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-slate-500 hover:text-red-400 transition p-1"
          title="Delete character"
        >
          🗑️
        </button>
      </div>

      <div className="flex gap-4 mb-3">
        <div className="flex items-center gap-1">
          <span className="text-red-400">❤️</span>
          <span className="text-white font-medium">
            {character.currentHp}/{character.maxHp}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-blue-400">🛡️</span>
          <span className="text-white font-medium">{character.armorClass}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-yellow-400">⚡</span>
          <span className="text-white font-medium">{formatModifier(profBonus)}</span>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-1 text-center">
        {(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const).map((ability) => (
          <div key={ability} className="bg-slate-900/50 rounded p-1">
            <div className="text-[10px] text-slate-500 uppercase">{ability.slice(0, 3)}</div>
            <div className="text-sm font-bold text-white">{character[ability]}</div>
            <div className="text-xs text-purple-400">
              {formatModifier(calculateModifier(character[ability]))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
