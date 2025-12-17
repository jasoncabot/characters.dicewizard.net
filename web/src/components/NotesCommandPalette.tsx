import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notesApi } from "../api/client";
import type { Note, NoteEntityType } from "../types/note";
import type { OpenNotePaletteDetail } from "../lib/notePalette";

const ENTITY_OPTIONS: { value: NoteEntityType; label: string }[] = [
  { value: "general", label: "General" },
  { value: "campaign", label: "Campaign" },
  { value: "character", label: "Character" },
  { value: "npc", label: "NPC" },
  { value: "map", label: "Map" },
  { value: "handout", label: "Handout" },
  { value: "other", label: "Other" },
];

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || el.getAttribute("contenteditable") === "true";
}

export function NotesCommandPalette() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"search" | "create">("search");
  const [query, setQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState<NoteEntityType>("general");
  const [entityId, setEntityId] = useState("");
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [createEntityType, setCreateEntityType] = useState<NoteEntityType>("general");
  const [createEntityId, setCreateEntityId] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Allow other components to open the palette with pre-filled entity context
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<OpenNotePaletteDetail>).detail || {};
      setMode(detail.mode ?? "create");
      setOpen(true);

      if (detail.entityType) {
        setCreateEntityType(detail.entityType);
      }
      if (detail.entityId !== undefined) {
        setCreateEntityId(String(detail.entityId));
      }
      if (detail.title !== undefined) {
        setTitle(detail.title);
      }
      if (detail.body !== undefined) {
        setBody(detail.body);
      }

      // Focus after state updates
      setTimeout(() => {
        if ((detail.mode ?? "create") === "search") {
          searchInputRef.current?.focus();
        } else {
          bodyRef.current?.focus();
        }
      }, 10);
    };

    window.addEventListener("open-note-palette", handler as EventListener);
    return () => window.removeEventListener("open-note-palette", handler as EventListener);
  }, []);

  // Hotkeys to open/close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setMode("search");
        setOpen(true);
        return;
      }

      if ((e.key === "n" || e.key === "N") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setMode("create");
        setOpen(true);
        return;
      }

      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Focus the relevant field when palette opens
  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => {
      if (mode === "search") {
        searchInputRef.current?.focus();
      } else {
        bodyRef.current?.focus();
      }
    }, 10);
    return () => clearTimeout(timeout);
  }, [open, mode]);

  // Debounce search input for snappy UX
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(id);
  }, [query]);

  const parsedEntityId = useMemo(() => {
    const trimmed = entityId.trim();
    if (!trimmed) return undefined;
    const asNumber = Number(trimmed);
    return Number.isNaN(asNumber) ? undefined : asNumber;
  }, [entityId]);

  const {
    data: searchResults = [],
    isFetching,
    error: searchError,
  } = useQuery<Note[]>({
    queryKey: ["notes", "search", debouncedQuery, entityFilter, parsedEntityId],
    queryFn: () =>
      notesApi.search({
        q: debouncedQuery,
        entityType: entityFilter !== "general" ? entityFilter : undefined,
        entityId: parsedEntityId,
        limit: 20,
      }),
    enabled: open && mode === "search",
    staleTime: 5_000,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const trimmed = createEntityId.trim();
      const numericId = trimmed ? Number(trimmed) : undefined;
      const safeId = numericId !== undefined && Number.isNaN(numericId) ? undefined : numericId;

      return notesApi.create({
        body,
        title,
        entityType: createEntityType,
        entityId: safeId,
      });
    },
    onSuccess: (note) => {
      setBody("");
      setTitle("");
      setCreateEntityId("");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["notes", "search"] });
      // Seed the search cache so the new note shows up instantly
      queryClient.setQueryData<Note[]>(
        ["notes", "search", "", "general", undefined],
        (existing) => (existing ? [note, ...existing] : [note]),
      );
    },
  });

  const overlayVisible = open;

  const entityLabel = (value: string) =>
    ENTITY_OPTIONS.find((opt) => opt.value === value)?.label ?? value;

  if (!overlayVisible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          setOpen(false);
        }
      }}
    >
      <div className="mt-16 w-full max-w-3xl rounded-2xl border border-slate-700/60 bg-slate-900/90 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex gap-2 rounded-full bg-slate-800/80 p-1 text-sm font-semibold">
            <button
              className={`rounded-full px-3 py-1 transition ${mode === "search" ? "bg-purple-600 text-white" : "text-slate-300 hover:bg-slate-700"}`}
              onClick={() => setMode("search")}
            >
              Search ( / )
            </button>
            <button
              className={`rounded-full px-3 py-1 transition ${mode === "create" ? "bg-purple-600 text-white" : "text-slate-300 hover:bg-slate-700"}`}
              onClick={() => setMode("create")}
            >
              New Note ( n )
            </button>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-1 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            Esc
          </button>
        </div>

        {mode === "search" && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search notes by text..."
                className="h-12 flex-1 rounded-xl border border-slate-700 bg-slate-800/80 px-4 text-lg text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
              />
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value as NoteEntityType)}
                className="h-12 rounded-xl border border-slate-700 bg-slate-800/80 px-3 text-sm text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="general">Any type</option>
                {ENTITY_OPTIONS.filter((o) => o.value !== "general").map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <input
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                placeholder="Entity id (optional)"
                className="h-12 w-40 rounded-xl border border-slate-700 bg-slate-800/80 px-3 text-sm text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-700/60 bg-slate-900/70">
              {isFetching && (
                <div className="p-4 text-sm text-slate-400">Searching...</div>
              )}
              {searchError && (
                <div className="p-4 text-sm text-red-300">Search failed. Try another query.</div>
              )}
              {!isFetching && !searchError && searchResults.length === 0 && (
                <div className="p-6 text-center text-sm text-slate-400">
                  No notes yet. Press "n" to create one instantly.
                </div>
              )}
              {searchResults.map((note) => (
                <div
                  key={note.id}
                  className="border-b border-slate-800/70 px-4 py-3 last:border-b-0 hover:bg-slate-800/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-purple-700/40 px-2 py-0.5 text-xs font-semibold text-purple-200">
                          {entityLabel(note.entityType)}
                        </span>
                        {note.entityId && (
                          <span className="text-xs text-slate-400">ID #{note.entityId}</span>
                        )}
                      </div>
                      <div className="mt-1 text-base font-semibold text-white">
                        {note.title || "Untitled note"}
                      </div>
                      <div className="mt-1 max-h-12 overflow-hidden text-sm text-slate-300">
                        {note.body}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(note.updatedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === "create" && (
          <div className="mt-5 space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="text-sm text-slate-300">Title (optional)</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  placeholder="Quick session note"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300">Entity type</label>
                <select
                  value={createEntityType}
                  onChange={(e) => setCreateEntityType(e.target.value as NoteEntityType)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                >
                  {ENTITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="text-sm text-slate-300">Body</label>
                <textarea
                  ref={bodyRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  placeholder="Type a note and press Cmd+Enter to save"
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                      e.preventDefault();
                      if (!body.trim()) return;
                      createMutation.mutate();
                    }
                  }}
                />
              </div>
              <div>
                <label className="text-sm text-slate-300">Entity id (optional)</label>
                <input
                  value={createEntityId}
                  onChange={(e) => setCreateEntityId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  placeholder="e.g. character id"
                />
                <div className="mt-2 rounded-lg border border-slate-700/70 bg-slate-800/60 p-2 text-xs text-slate-400">
                  Hotkeys: Cmd/Ctrl + Enter to save, Esc to close. Attach to characters, NPCs, maps, or handouts.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              {createMutation.status === "error" && (
                <span className="text-sm text-red-300">Could not save note.</span>
              )}
              {createMutation.status === "success" && (
                <span className="text-sm text-green-300">Saved!</span>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={!body.trim() || createMutation.status === "pending"}
                  className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition disabled:opacity-60"
                >
                  {createMutation.status === "pending" ? "Saving..." : "Save note"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
