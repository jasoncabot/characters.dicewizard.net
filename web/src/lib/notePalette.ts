import type { NoteEntityType } from "../types/note";

export type OpenNotePaletteDetail = {
  mode?: "search" | "create";
  entityType?: NoteEntityType;
  entityId?: number;
  title?: string;
  body?: string;
};

export function openNotePalette(detail: OpenNotePaletteDetail = {}) {
  window.dispatchEvent(
    new CustomEvent<OpenNotePaletteDetail>("open-note-palette", { detail }),
  );
}
