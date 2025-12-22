import { useState } from "react";
import { BACKGROUNDS } from "../../types/character";
import type { BackgroundName } from "../../types/character";
import { BACKGROUND_INFO } from "../../data/characterData";
import type { TraitDescription } from "../../data/traitDescriptions";
import { getTraitDescription } from "../../data/traitDescriptions";
import { TappableTrait } from "./TappableTrait";
import { useInfoPanel } from "./TraitInfoContext";

interface BackgroundStepProps {
  selectedBackground: BackgroundName;
  onSelect: (bg: BackgroundName) => void;
  isTransitioning?: boolean;
}

export function BackgroundStep({
  selectedBackground,
  onSelect,
}: BackgroundStepProps) {
  const [hoveredBackground, setHoveredBackground] =
    useState<BackgroundName | null>(null);
  const { showInfo } = useInfoPanel();
  const displayBackground = hoveredBackground || selectedBackground;
  const bgInfo = BACKGROUND_INFO[displayBackground];

  const handleTraitTap = (trait: TraitDescription) => {
    showInfo(trait);
  };

  const handleFeatTap = () => {
    const feat = getTraitDescription(bgInfo.feat);
    if (feat) {
      showInfo(feat);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Background Selection Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            Choose Your Background
          </h2>
          <span className="text-sm text-slate-400">
            {BACKGROUNDS.length} backgrounds
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {BACKGROUNDS.map((bg) => {
            const info = BACKGROUND_INFO[bg];
            const isSelected = bg === selectedBackground;
            const isHovered = bg === hoveredBackground;

            return (
              <button
                key={bg}
                onClick={() => onSelect(bg)}
                onMouseEnter={() => setHoveredBackground(bg)}
                onMouseLeave={() => setHoveredBackground(null)}
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

                <div className="flex items-center gap-2">
                  <span className="text-lg">{getBackgroundEmoji(bg)}</span>
                  <span className="font-semibold text-white">{bg}</span>
                </div>
                <div className="mt-1 truncate text-xs text-slate-400">
                  Feat: {info.feat}
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

      {/* Background Details Panel */}
      <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 backdrop-blur-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-2xl shadow-lg">
            {getBackgroundEmoji(displayBackground)}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">
              {displayBackground}
            </h3>
            <p className="text-sm text-slate-400">{bgInfo.description}</p>
          </div>
        </div>

        {/* Flavor Text */}
        <div className="mb-6 rounded-lg border border-purple-500/20 bg-purple-500/5 p-4">
          <p className="text-sm leading-relaxed text-slate-300 italic">
            "{bgInfo.flavorText}"
          </p>
        </div>

        {/* Background Benefits - 2024 Style */}
        <div className="space-y-4">
          {/* Ability Scores */}
          <div className="rounded-lg bg-slate-900/50 p-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <div className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Ability Score Increase
              </div>
            </div>
            <div className="mt-2 text-sm font-medium text-purple-300">
              {bgInfo.abilityScores}
            </div>
          </div>

          {/* Skill Proficiencies */}
          <div className="rounded-lg bg-slate-900/50 p-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <div className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Skill Proficiencies
                <span className="ml-2 text-xs font-normal">
                  (tap for details)
                </span>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {bgInfo.skillProficiencies.map((skill) => (
                <TappableTrait
                  key={skill}
                  name={skill}
                  onTap={handleTraitTap}
                  variant="skill"
                />
              ))}
            </div>
          </div>

          {/* Origin Feat */}
          <button
            onClick={handleFeatTap}
            className="w-full rounded-lg bg-gradient-to-r from-amber-900/30 to-orange-900/30 p-4 text-left ring-1 ring-amber-500/30 transition-all duration-200 hover:from-amber-900/40 hover:to-orange-900/40 hover:ring-amber-500/50 active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">⭐</span>
                <div className="text-xs font-medium tracking-wide text-amber-400 uppercase">
                  Origin Feat (1st Level)
                </div>
              </div>
              <svg
                className="h-4 w-4 text-amber-400/50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="mt-2 text-lg font-semibold text-amber-200">
              {bgInfo.feat}
            </div>
            <div className="mt-1 text-xs text-amber-300/60">
              Tap to see feat details
            </div>
          </button>

          {/* Starting Equipment */}
          <div className="rounded-lg bg-slate-900/50 p-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎒</span>
              <div className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Starting Equipment
              </div>
            </div>
            <div className="mt-2 text-sm text-slate-300">
              {bgInfo.equipment}
            </div>
          </div>
        </div>

        {/* 2024 Rules Note */}
        <div className="mt-6 flex items-start gap-3 rounded-lg bg-purple-500/10 p-3 ring-1 ring-purple-500/20">
          <span className="text-lg">📖</span>
          <p className="text-sm text-slate-400">
            <span className="font-medium text-purple-300">2024 Rules:</span>{" "}
            Backgrounds now grant your ability score increases and a free Origin
            feat at 1st level!
          </p>
        </div>
      </div>
    </div>
  );
}

function getBackgroundEmoji(bg: BackgroundName): string {
  const emojiMap: Record<BackgroundName, string> = {
    Acolyte: "🙏",
    Artisan: "🔨",
    Charlatan: "🎭",
    Criminal: "🦹",
    Entertainer: "🎪",
    Farmer: "🌾",
    Guard: "💂",
    Guide: "🧭",
    Hermit: "🏔️",
    Merchant: "💰",
    Noble: "👑",
    Sage: "📚",
    Sailor: "⚓",
    Scribe: "✒️",
    Soldier: "⚔️",
    Wayfarer: "🚶",
  };
  return emojiMap[bg] || "📜";
}
