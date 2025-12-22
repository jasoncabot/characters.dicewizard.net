import { Fragment, useEffect, useSyncExternalStore } from "react";
import { Dialog, Transition } from "@headlessui/react";
import type { TraitDescription } from "../../data/traitDescriptions";
import {
  getCategoryLabel,
  getCategoryColor,
} from "../../data/traitDescriptions";
import { useInfoPanel } from "./TraitInfoContext";

// Media query hook for detecting desktop (lg: 1024px+)
const mediaQuery = "(min-width: 1024px)";
function useIsDesktop() {
  return useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia(mediaQuery);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    () => window.matchMedia(mediaQuery).matches,
    () => false, // SSR fallback
  );
}

/**
 * InfoPanel - A responsive info display component for D&D reference content
 *
 * Displays detailed Player's Handbook-style information about:
 * - Racial traits
 * - Feats (origin feats, class feats, etc.)
 * - Skills
 * - Spells
 * - Class features
 * - And other D&D concepts
 *
 * On desktop (lg+): Shows as a persistent slide-in side panel on the right
 * On mobile: Shows as a modal dialog
 */
export function InfoPanel() {
  const { selectedInfo, isOpen, closeInfo } = useInfoPanel();
  const isDesktop = useIsDesktop();

  // Handle ESC key for desktop side panel
  useEffect(() => {
    if (!isDesktop || !isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeInfo();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDesktop, isOpen, closeInfo]);

  // Desktop: Side Panel as flex child
  if (isDesktop) {
    if (!selectedInfo || !isOpen) return null;

    return (
      <div className="w-96 shrink-0 overflow-y-auto border-l border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-6">
        <InfoContent info={selectedInfo} onClose={closeInfo} showClose />
      </div>
    );
  }

  if (!selectedInfo) return null;

  // Mobile: Modal Dialog
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={closeInfo}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-2xl transition-all">
                <InfoContent info={selectedInfo} onClose={closeInfo} />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// Legacy export for backward compatibility
export const TraitInfoPanel = InfoPanel;

interface InfoContentProps {
  info: TraitDescription;
  onClose: () => void;
  showClose?: boolean;
}

function InfoContent({ info, onClose, showClose = false }: InfoContentProps) {
  const colors = getCategoryColor(info.category);

  return (
    <>
      {/* Close button for desktop panel */}
      {showClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white"
          aria-label="Close panel"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}

      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white">{info.name}</h3>
            {info.subtitle && (
              <p className="mt-1 text-sm text-slate-400">{info.subtitle}</p>
            )}
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${colors.bg} ${colors.text} ring-1 ${colors.border}`}
          >
            {getCategoryLabel(info.category)}
          </span>
        </div>
      </div>

      {/* Spell-like stats grid */}
      {(info.castingTime || info.range || info.components || info.duration) && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          {info.castingTime && (
            <StatBlock label="Casting Time" value={info.castingTime} />
          )}
          {info.range && <StatBlock label="Range" value={info.range} />}
          {info.components && (
            <StatBlock label="Components" value={info.components} />
          )}
          {info.duration && (
            <StatBlock label="Duration" value={info.duration} />
          )}
          {info.target && (
            <StatBlock
              label="Target"
              value={info.target}
              className="col-span-2"
            />
          )}
        </div>
      )}

      {/* Skill ability */}
      {info.ability && (
        <div className="mb-4">
          <StatBlock label="Ability" value={info.ability} className="w-fit" />
        </div>
      )}

      {/* Description */}
      <div className="mb-4 rounded-lg bg-slate-900/50 p-4">
        <p className="text-sm leading-relaxed text-slate-300">
          {info.description}
        </p>
      </div>

      {/* Benefit section */}
      {info.benefit && (
        <div className="mb-4">
          <h4 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Benefits
          </h4>
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
            <p className="text-sm whitespace-pre-line text-green-300">
              {info.benefit}
            </p>
          </div>
        </div>
      )}

      {/* Examples (for skills) */}
      {info.examples && (
        <div className="mb-4">
          <h4 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Example Uses
          </h4>
          <p className="text-sm text-slate-400 italic">{info.examples}</p>
        </div>
      )}

      {/* Higher levels (for spells) */}
      {info.higherLevels && (
        <div className="mb-4">
          <h4 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            At Higher Levels
          </h4>
          <p className="text-sm text-slate-300">{info.higherLevels}</p>
        </div>
      )}

      {/* Prerequisite (for feats) */}
      {info.prerequisite && (
        <div className="mb-4">
          <h4 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Prerequisite
          </h4>
          <p className="text-sm text-slate-400">{info.prerequisite}</p>
        </div>
      )}

      {/* Close button - only on mobile modal */}
      {!showClose && (
        <button
          onClick={onClose}
          className="mt-2 w-full rounded-xl bg-slate-700/50 px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
        >
          Got it
        </button>
      )}
    </>
  );
}

// Small stat block component
function StatBlock({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-lg bg-slate-900/70 p-2.5 ${className}`}>
      <div className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium text-white">{value}</div>
    </div>
  );
}
