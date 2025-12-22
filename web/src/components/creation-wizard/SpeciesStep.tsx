import { useState } from "react";
import { SPECIES } from "../../types/character";
import type { Species } from "../../types/character";
import { SPECIES_INFO } from "../../data/characterData";
import type { TraitDescription } from "../../data/traitDescriptions";
import { TappableTrait } from "./TappableTrait";
import { useInfoPanel } from "./TraitInfoContext";

interface SpeciesStepProps {
  selectedSpecies: Species;
  onSelect: (species: Species) => void;
  isTransitioning?: boolean;
}

export function SpeciesStep({ selectedSpecies, onSelect }: SpeciesStepProps) {
  const [hoveredSpecies, setHoveredSpecies] = useState<Species | null>(null);
  const { showInfo } = useInfoPanel();
  const displaySpecies = hoveredSpecies || selectedSpecies;
  const speciesInfo = SPECIES_INFO[displaySpecies];

  const handleTraitTap = (trait: TraitDescription) => {
    showInfo(trait);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Species Selection Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            Choose Your Species
          </h2>
          <span className="text-sm text-slate-400">
            {SPECIES.length} options available
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SPECIES.map((species) => {
            const info = SPECIES_INFO[species];
            const isSelected = species === selectedSpecies;
            const isHovered = species === hoveredSpecies;

            return (
              <button
                key={species}
                onClick={() => onSelect(species)}
                onMouseEnter={() => setHoveredSpecies(species)}
                onMouseLeave={() => setHoveredSpecies(null)}
                className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-purple-500 bg-purple-600/20 shadow-lg shadow-purple-500/20"
                    : "border-slate-700/50 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800"
                }`}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2">
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

                <div className="text-lg font-semibold text-white">
                  {species}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                  <span>{info.size}</span>
                  <span>•</span>
                  <span>{info.speed} ft</span>
                </div>

                {/* Hover glow effect */}
                <div
                  className={`absolute inset-0 -z-10 opacity-0 blur-xl transition-opacity duration-300 ${
                    isHovered || isSelected ? "opacity-20" : ""
                  }`}
                  style={{
                    background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Species Details Panel */}
      <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 backdrop-blur-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-2xl shadow-lg">
            {getSpeciesEmoji(displaySpecies)}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">{displaySpecies}</h3>
            <p className="text-sm text-slate-400">{speciesInfo.description}</p>
          </div>
        </div>

        {/* Flavor Text */}
        <div className="mb-6 rounded-lg border border-purple-500/20 bg-purple-500/5 p-4">
          <p className="text-sm leading-relaxed text-slate-300 italic">
            "{speciesInfo.flavorText}"
          </p>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-slate-900/50 p-3">
            <div className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              Size
            </div>
            <div className="mt-1 text-lg font-semibold text-white">
              {speciesInfo.size}
            </div>
          </div>
          <div className="rounded-lg bg-slate-900/50 p-3">
            <div className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              Speed
            </div>
            <div className="mt-1 text-lg font-semibold text-white">
              {speciesInfo.speed} ft
            </div>
          </div>
        </div>

        {/* Traits */}
        <div>
          <h4 className="mb-3 text-sm font-semibold tracking-wide text-slate-300 uppercase">
            Racial Traits
            <span className="ml-2 text-xs font-normal text-slate-500">
              (tap for details)
            </span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {speciesInfo.traits.map((trait) => (
              <TappableTrait key={trait} name={trait} onTap={handleTraitTap} />
            ))}
          </div>
        </div>

        {/* Quick tip */}
        <div className="mt-6 flex items-start gap-3 rounded-lg bg-slate-900/50 p-3">
          <span className="text-lg">💡</span>
          <p className="text-sm text-slate-400">
            <span className="font-medium text-slate-300">Tip:</span> Your
            species determines your base speed, size, and unique abilities.
            Hover over options to preview their details.
          </p>
        </div>
      </div>
    </div>
  );
}

function getSpeciesEmoji(species: Species): string {
  const emojiMap: Record<Species, string> = {
    Aasimar: "😇",
    Dragonborn: "🐉",
    Dwarf: "⛏️",
    Elf: "🧝",
    Gnome: "🔧",
    Goliath: "🗿",
    Halfling: "🍀",
    Human: "👤",
    Orc: "💪",
    Tiefling: "😈",
  };
  return emojiMap[species] || "👤";
}
