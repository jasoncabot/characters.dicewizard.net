import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import type { TraitDescription } from "../../data/traitDescriptions";
import {
  getCategoryLabel,
  getCategoryColor,
} from "../../data/traitDescriptions";

interface TraitInfoModalProps {
  trait: TraitDescription | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TraitInfoModal({
  trait,
  isOpen,
  onClose,
}: TraitInfoModalProps) {
  if (!trait) return null;

  const colors = getCategoryColor(trait.category);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                {/* Header */}
                <div className="mb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <Dialog.Title className="text-xl font-bold text-white">
                        {trait.name}
                      </Dialog.Title>
                      {trait.subtitle && (
                        <p className="mt-1 text-sm text-slate-400">
                          {trait.subtitle}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${colors.bg} ${colors.text} ring-1 ${colors.border}`}
                    >
                      {getCategoryLabel(trait.category)}
                    </span>
                  </div>
                </div>

                {/* Spell-like stats grid */}
                {(trait.castingTime ||
                  trait.range ||
                  trait.components ||
                  trait.duration) && (
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    {trait.castingTime && (
                      <StatBlock
                        label="Casting Time"
                        value={trait.castingTime}
                      />
                    )}
                    {trait.range && (
                      <StatBlock label="Range" value={trait.range} />
                    )}
                    {trait.components && (
                      <StatBlock label="Components" value={trait.components} />
                    )}
                    {trait.duration && (
                      <StatBlock label="Duration" value={trait.duration} />
                    )}
                    {trait.target && (
                      <StatBlock
                        label="Target"
                        value={trait.target}
                        className="col-span-2"
                      />
                    )}
                  </div>
                )}

                {/* Skill ability */}
                {trait.ability && (
                  <div className="mb-4">
                    <StatBlock
                      label="Ability"
                      value={trait.ability}
                      className="w-fit"
                    />
                  </div>
                )}

                {/* Description */}
                <div className="mb-4 rounded-lg bg-slate-900/50 p-4">
                  <p className="text-sm leading-relaxed text-slate-300">
                    {trait.description}
                  </p>
                </div>

                {/* Benefit section */}
                {trait.benefit && (
                  <div className="mb-4">
                    <h4 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                      Benefits
                    </h4>
                    <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                      <p className="text-sm whitespace-pre-line text-green-300">
                        {trait.benefit}
                      </p>
                    </div>
                  </div>
                )}

                {/* Examples (for skills) */}
                {trait.examples && (
                  <div className="mb-4">
                    <h4 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                      Example Uses
                    </h4>
                    <p className="text-sm text-slate-400 italic">
                      {trait.examples}
                    </p>
                  </div>
                )}

                {/* Higher levels (for spells) */}
                {trait.higherLevels && (
                  <div className="mb-4">
                    <h4 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                      At Higher Levels
                    </h4>
                    <p className="text-sm text-slate-300">
                      {trait.higherLevels}
                    </p>
                  </div>
                )}

                {/* Prerequisite (for feats) */}
                {trait.prerequisite && (
                  <div className="mb-4">
                    <h4 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                      Prerequisite
                    </h4>
                    <p className="text-sm text-slate-400">
                      {trait.prerequisite}
                    </p>
                  </div>
                )}

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="mt-2 w-full rounded-xl bg-slate-700/50 px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                >
                  Got it
                </button>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
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
