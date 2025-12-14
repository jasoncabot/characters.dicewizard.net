import { Textarea } from "@headlessui/react";
import type { UseFormRegister } from "react-hook-form";
import type { CharacterCreate } from "../../types/character";

interface NotesSectionProps {
  register: UseFormRegister<CharacterCreate>;
}

export function NotesSection({ register }: NotesSectionProps) {
  return (
    <section className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
      <h2 className="mb-4 cursor-default text-xl font-bold text-white">
        Notes
      </h2>
      <Textarea
        {...register("notes")}
        className="min-h-32 w-full cursor-text rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white transition hover:border-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
        placeholder="Character backstory, equipment, features, etc."
      />
    </section>
  );
}
