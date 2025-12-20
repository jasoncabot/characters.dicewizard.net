import {
  Field,
  Input,
  Label,
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from "@headlessui/react";
import type {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import {
  ALIGNMENTS,
  BACKGROUNDS,
  BACKGROUND_DETAILS,
  CLASSES,
  CLASS_HIT_DICE,
  CLASS_SAVING_THROWS,
  SPECIES,
  SPECIES_TRAITS,
  formatModifier,
} from "../../types/character";
import { useRef } from "react";
import type { CharacterCreate } from "../../types/character";
import {
  listboxButtonClasses,
  listboxOptionsClasses,
  listboxOptionClasses,
} from "./listboxStyles";

interface BasicInfoSectionProps {
  register: UseFormRegister<CharacterCreate>;
  errors: FieldErrors<CharacterCreate>;
  selectedRace: CharacterCreate["race"];
  selectedClass: CharacterCreate["class"];
  background: CharacterCreate["background"];
  alignment: CharacterCreate["alignment"];
  setValue: UseFormSetValue<CharacterCreate>;
  proficiencyBonus: number;
  onClassChange?: (value: CharacterCreate["class"]) => void;
  onRaceChange?: (value: CharacterCreate["race"]) => void;
  avatarUrl?: string;
  onAvatarUpload?: (file: File) => void;
  isUploadingAvatar?: boolean;
}

export function BasicInfoSection({
  register,
  errors,
  selectedRace,
  selectedClass,
  background,
  alignment,
  setValue,
  proficiencyBonus,
  onClassChange,
  onRaceChange,
  avatarUrl,
  onAvatarUpload,
  isUploadingAvatar,
}: BasicInfoSectionProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const portraitSrc =
    avatarUrl ||
    `/portraits/${selectedRace.toLowerCase()}-${selectedClass.toLowerCase()}.svg`;

  return (
    <section className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
      <h2 className="mb-4 text-xl font-bold text-white">Basic Information</h2>
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex flex-shrink-0 flex-col items-center">
          <div className="relative h-40 w-40 overflow-hidden rounded-xl border-2 border-slate-600 bg-slate-900/50 shadow-lg">
            <img
              src={portraitSrc}
              alt={`${selectedRace} ${selectedClass}`}
              className="h-full w-full object-cover transition-all duration-300"
            />
            {onAvatarUpload && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      onAvatarUpload(file);
                    }
                    if (event.target) {
                      event.target.value = "";
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute top-2 right-2 rounded-md bg-slate-900/80 px-2 py-1 text-xs font-semibold text-white shadow hover:bg-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:opacity-70"
                >
                  {isUploadingAvatar ? "Uploading..." : "Edit"}
                </button>
              </>
            )}
          </div>
          <p className="mt-2 text-center text-sm text-slate-400">
            {selectedRace} {selectedClass}
          </p>
        </div>

        <div className="grid flex-grow grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field>
            <Label className="mb-1 block cursor-default text-sm font-medium text-slate-300">
              Character Name *
            </Label>
            <Input
              {...register("name", { required: "Name is required" })}
              className="w-full cursor-text rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-sm text-white shadow-sm transition hover:border-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              placeholder="Enter name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
            )}
          </Field>

          <Field>
            <Label className="mb-1 block cursor-default text-sm font-medium text-slate-300">
              Species
            </Label>
            <Listbox
              value={selectedRace}
              onChange={(value) => {
                setValue("race", value);
                onRaceChange?.(value);
              }}
            >
              <div className="relative w-full max-w-xs">
                <ListboxButton className={listboxButtonClasses}>
                  <span>{selectedRace}</span>
                </ListboxButton>
                <ListboxOptions
                  portal
                  anchor="bottom start"
                  className={listboxOptionsClasses}
                >
                  {SPECIES.map((species) => (
                    <ListboxOption
                      key={species}
                      value={species}
                      className={listboxOptionClasses}
                    >
                      {species}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </div>
            </Listbox>
            {selectedRace && SPECIES_TRAITS[selectedRace] && (
              <p className="mt-1 text-xs text-slate-500">
                Speed: {SPECIES_TRAITS[selectedRace].speed} ft • Size:{" "}
                {SPECIES_TRAITS[selectedRace].size}
              </p>
            )}
          </Field>

          <Field>
            <Label className="mb-1 block cursor-default text-sm font-medium text-slate-300">
              Class
            </Label>
            <Listbox
              value={selectedClass}
              onChange={(value) => {
                setValue("class", value);
                onClassChange?.(value);
              }}
            >
              <div className="relative w-full max-w-xs">
                <ListboxButton className={listboxButtonClasses}>
                  <span>{selectedClass}</span>
                </ListboxButton>
                <ListboxOptions
                  portal
                  anchor="bottom start"
                  className={listboxOptionsClasses}
                >
                  {CLASSES.map((cls) => (
                    <ListboxOption
                      key={cls}
                      value={cls}
                      className={listboxOptionClasses}
                    >
                      {cls}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </div>
            </Listbox>
            {selectedClass && (
              <p className="mt-1 text-xs text-slate-500">
                Hit Die: d{CLASS_HIT_DICE[selectedClass]} • Saves:{" "}
                {CLASS_SAVING_THROWS[selectedClass]
                  ?.map((s) => s.slice(0, 3).toUpperCase())
                  .join(", ")}
              </p>
            )}
          </Field>

          <Field>
            <Label className="mb-1 block cursor-default text-sm font-medium text-slate-300">
              Background
            </Label>
            <Listbox
              value={background}
              onChange={(value) => setValue("background", value)}
            >
              <div className="relative w-full max-w-xs">
                <ListboxButton className={listboxButtonClasses}>
                  <span>{background}</span>
                </ListboxButton>
                <ListboxOptions
                  portal
                  anchor="bottom start"
                  className={listboxOptionsClasses}
                >
                  {BACKGROUNDS.map((bg) => (
                    <ListboxOption
                      key={bg}
                      value={bg}
                      className={listboxOptionClasses}
                    >
                      {bg}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </div>
            </Listbox>
            {background && BACKGROUND_DETAILS[background] && (
              <p className="mt-1 text-xs text-slate-500">
                Feat: {BACKGROUND_DETAILS[background].feat}
              </p>
            )}
          </Field>

          <Field>
            <Label className="mb-1 block cursor-default text-sm font-medium text-slate-300">
              Level
            </Label>
            <Input
              type="number"
              {...register("level", {
                valueAsNumber: true,
                min: 1,
                max: 20,
              })}
              className="w-full cursor-text rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-sm text-white shadow-sm transition hover:border-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              min={1}
              max={20}
            />
          </Field>

          <Field>
            <Label className="mb-1 block cursor-default text-sm font-medium text-slate-300">
              Alignment
            </Label>
            <Listbox
              value={alignment}
              onChange={(value) => setValue("alignment", value)}
            >
              <div className="relative w-full max-w-xs">
                <ListboxButton className={listboxButtonClasses}>
                  <span>{alignment}</span>
                </ListboxButton>
                <ListboxOptions
                  portal
                  anchor="bottom start"
                  className={listboxOptionsClasses}
                >
                  {ALIGNMENTS.map((option) => (
                    <ListboxOption
                      key={option}
                      value={option}
                      className={listboxOptionClasses}
                    >
                      {option}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </div>
            </Listbox>
          </Field>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 rounded-lg bg-slate-900/30 p-3">
        <div className="text-slate-400">Proficiency Bonus:</div>
        <div className="text-2xl font-bold text-purple-400">
          {formatModifier(proficiencyBonus)}
        </div>
      </div>
    </section>
  );
}
