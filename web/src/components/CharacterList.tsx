import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import { charactersApi, campaignsApi } from "../api/client";
import type { Character } from "../types/character";
import {
  calculateModifier,
  formatModifier,
  calculateProficiencyBonus,
} from "../types/character";
import { openNotePalette } from "../lib/notePalette";

interface CharacterListProps {
  onSelect: (character: Character) => void;
  onNew: () => void;
}

export function CharacterList({ onSelect, onNew }: CharacterListProps) {
  const queryClient = useQueryClient();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(
    null,
  );
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(
    null,
  );
  const [newCampaignName, setNewCampaignName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

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

  const { data: campaigns } = useQuery({
    queryKey: ["campaigns"],
    queryFn: campaignsApi.list,
  });

  const addToCampaignMutation = useMutation({
    mutationFn: async ({
      character,
      campaignId,
      createName,
    }: {
      character: Character;
      campaignId?: number;
      createName?: string;
    }) => {
      let targetId = campaignId;
      if (!targetId && createName) {
        const existing = (campaigns ?? []).find(
          (c) => c.name.toLowerCase() === createName.toLowerCase(),
        );
        if (existing) {
          targetId = existing.id;
        } else {
          const created = await campaignsApi.create({
            name: createName,
            description: "",
            visibility: "private",
          });
          targetId = created.id;
        }
      }

      if (!targetId) {
        throw new Error("No campaign selected");
      }

      return campaignsApi.addCharacter(targetId, character.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns", "details"] });
      setFeedback("Added to campaign");
      setAddModalOpen(false);
      setSelectedCampaignId(null);
      setNewCampaignName("");
      setSelectedCharacter(null);
    },
    onError: (err: unknown) => {
      console.error("Failed to add to campaign", err);
      setFeedback("Could not add character. Try again.");
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
    <>
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
              onAddToCampaign={() => {
                setSelectedCharacter(character);
                setAddModalOpen(true);
                setFeedback(null);
                if (campaigns && campaigns.length > 0) {
                  setSelectedCampaignId(campaigns[0].id);
                }
              }}
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

      <AddToCampaignModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        campaigns={campaigns ?? []}
        selectedCampaignId={selectedCampaignId}
        onSelectCampaign={(id) => setSelectedCampaignId(id)}
        newCampaignName={newCampaignName}
        onChangeNewCampaignName={setNewCampaignName}
        onSubmit={() => {
          if (!selectedCharacter) return;
          addToCampaignMutation.mutate({
            character: selectedCharacter,
            campaignId: selectedCampaignId ?? undefined,
            createName: newCampaignName.trim() || undefined,
          });
        }}
        submitting={addToCampaignMutation.status === "pending"}
        feedback={feedback}
        character={selectedCharacter}
      />
    </>
  );
}

function CharacterCard({
  character,
  onSelect,
  onAddToCampaign,
  onDelete,
}: {
  character: Character;
  onSelect: () => void;
  onAddToCampaign: () => void;
  onDelete: () => void;
}) {
  const profBonus = calculateProficiencyBonus(character.level);

  return (
    <div
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          e.stopPropagation();
          openNotePalette({
            mode: "create",
            entityType: "character",
            entityId: character.id,
            title: character.name,
          });
        }
      }}
      role="button"
      tabIndex={0}
      className="group cursor-pointer rounded-xl border border-slate-700/50 bg-slate-800/50 p-5 backdrop-blur-sm transition hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10"
    >
      <div className="mb-3 flex gap-4">
        {/* Character Portrait */}
        <div className="flex-shrink-0">
          <div className="h-16 w-16 overflow-hidden rounded-lg border border-slate-600 bg-slate-900/50">
            <img
        src={
          character.avatarUrl ||
          `/portraits/${character.race.toLowerCase()}-${character.class.toLowerCase()}.svg`
        }
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
            <Menu as="div" className="relative inline-block text-left">
              <MenuButton
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                className="cursor-pointer rounded p-1 text-slate-500 transition hover:scale-110 hover:text-white focus:ring-2 focus:ring-purple-400 focus:outline-none active:scale-95"
                aria-label="Character actions"
              >
                ☰
              </MenuButton>
              <MenuItems className="absolute right-0 mt-2 w-44 origin-top-right rounded-md border border-slate-700/70 bg-slate-800/95 p-1 shadow-lg focus:outline-none">
                <MenuItem>
                  {({ active }) => (
                    <button
                      className={`flex w-full cursor-pointer items-center gap-2 rounded px-3 py-2 text-left text-sm font-medium ${active ? "bg-slate-700 text-white" : "text-slate-200"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCampaign();
                      }}
                    >
                      ➕ Add to campaign
                    </button>
                  )}
                </MenuItem>
                <MenuItem>
                  {({ active }) => (
                    <button
                      className={`flex w-full cursor-pointer items-center gap-2 rounded px-3 py-2 text-left text-sm font-medium ${active ? "bg-slate-700 text-red-200" : "text-red-300"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                      }}
                    >
                      🗑️ Delete
                    </button>
                  )}
                </MenuItem>
              </MenuItems>
            </Menu>
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

function AddToCampaignModal({
  open,
  onClose,
  campaigns,
  selectedCampaignId,
  onSelectCampaign,
  newCampaignName,
  onChangeNewCampaignName,
  onSubmit,
  submitting,
  feedback,
  character,
}: {
  open: boolean;
  onClose: () => void;
  campaigns: { id: number; name: string; status?: string }[];
  selectedCampaignId: number | null;
  onSelectCampaign: (id: number | null) => void;
  newCampaignName: string;
  onChangeNewCampaignName: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  feedback: string | null;
  character: Character | null;
}) {
  return (
    <div
      className={`${open ? "fixed" : "hidden"} inset-0 z-50 flex items-center justify-center bg-black/60 p-4`}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-700/70 bg-slate-900/90 p-5 shadow-2xl backdrop-blur">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Add to campaign</h3>
            {character && (
              <p className="text-sm text-slate-300">{character.name}</p>
            )}
          </div>
          <button
            className="text-slate-400 hover:text-white"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-sm text-slate-300">Existing campaign</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
              value={selectedCampaignId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                onSelectCampaign(v ? Number(v) : null);
              }}
            >
              <option value="">Select...</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.status ? ` • ${c.status}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-300">Or create new</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
              placeholder="New campaign name"
              value={newCampaignName}
              onChange={(e) => onChangeNewCampaignName(e.target.value)}
            />
          </div>

          <p className="text-xs text-slate-500">
            Tip: leave "create new" empty to use the selected campaign. If you enter a new name, we'll create it as private and attach this character.
          </p>

          {feedback && (
            <div className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200">
              {feedback}
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button
            onClick={onClose}
            className="cursor-pointer rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={submitting}
            className="cursor-pointer rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:from-purple-500 hover:to-pink-500 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none disabled:opacity-60"
          >
            {submitting ? "Adding..." : "Add to campaign"}
          </Button>
        </div>
      </div>
    </div>
  );
}
