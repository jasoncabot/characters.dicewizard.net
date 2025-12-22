import { useMemo, useRef, useState } from "react";
import type React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { campaignsApi } from "../api/client";
import type { CampaignFull, MapWithTokens, Token } from "../types/campaign";

function randomDieRoll(sides: number) {
  const max = Math.max(1, sides);
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return (buffer[0] % max) + 1;
}

export function PlayerViewModal({
  campaignId,
  onClose,
  variant = "modal",
}: {
  campaignId: number;
  onClose?: () => void;
  variant?: "modal" | "page";
}) {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [mapIndex, setMapIndex] = useState(0);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "dice" | "characters" | "handouts"
  >("dice");
  const [diceLog, setDiceLog] = useState<
    { id: number; sides: number; result: number }[]
  >([]);
  const [selectionMode, setSelectionMode] = useState<"single" | "multi">(
    "single",
  );
  const [selectedTokenIds, setSelectedTokenIds] = useState<number[]>([]);
  const [tokenPositions, setTokenPositions] = useState<
    Record<number, { x: number; y: number }>
  >({});

  const saveQueueRef = useRef<Set<number>>(new Set());
  const saveTimerRef = useRef<number | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, refetch } = useQuery<CampaignFull>({
    queryKey: ["campaigns", "full", campaignId, "play"],
    queryFn: () => campaignsApi.getFull(campaignId),
    refetchInterval: autoRefresh ? 3000 : false,
    staleTime: 2000,
  });

  const scenes = data?.scenes ?? [];
  const activeScene = scenes.find((s) => s.isActive) ?? scenes[0];
  const maps = activeScene?.maps ?? [];

  const safeMapIndex = useMemo(() => {
    if (!maps.length) return 0;
    return Math.min(mapIndex, maps.length - 1);
  }, [mapIndex, maps.length]);

  const map: MapWithTokens | null = maps[safeMapIndex] ?? null;
  const isDM = data?.role === "owner" || data?.role === "editor";
  const visibleTokens = useMemo(() => {
    if (!map) return [] as Token[];
    const tokens = map.tokens ?? [];
    if (isDM) return tokens;
    return tokens.filter((t) => !t.audience?.includes("gm-only"));
  }, [isDM, map]);

  const [prevVisibleTokens, setPrevVisibleTokens] = useState(visibleTokens);
  const [prevMapId, setPrevMapId] = useState(map?.id);

  if (visibleTokens !== prevVisibleTokens || map?.id !== prevMapId) {
    setPrevVisibleTokens(visibleTokens);
    setPrevMapId(map?.id);

    const nextPositions: Record<number, { x: number; y: number }> = {};
    visibleTokens.forEach((t) => {
      nextPositions[t.id] = { x: t.positionX, y: t.positionY };
    });
    setTokenPositions(nextPositions);
    setSelectedTokenIds([]);
  }

  const gridSizePx = 48;

  const isPage = variant === "page";
  const outerClass = isPage
    ? "flex min-h-screen w-full bg-slate-950 text-slate-100"
    : "fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4";
  const cardClass = isPage
    ? "flex w-full flex-col"
    : "relative w-full max-w-6xl rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-2xl";

  const recordRoll = (sides: number) => {
    const result = randomDieRoll(sides);
    setDiceLog((prev) =>
      [{ id: Date.now(), sides, result }, ...prev].slice(0, 12),
    );
  };

  const tokensWithPosition = useMemo(() => {
    return visibleTokens.map((t) => {
      const pos = tokenPositions[t.id];
      return pos ? { ...t, positionX: pos.x, positionY: pos.y } : t;
    });
  }, [tokenPositions, visibleTokens]);

  const updateTokenPosition = useMutation({
    mutationFn: ({
      tokenId,
      positionX,
      positionY,
    }: {
      tokenId: number;
      positionX: number;
      positionY: number;
    }) => campaignsApi.updateTokenPosition(tokenId, { positionX, positionY }),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaigns", "full", campaignId, "play"],
      });
      queryClient.invalidateQueries({ queryKey: ["campaigns", "details"] });
    },
  });

  const scheduleSave = (ids: number[]) => {
    ids.forEach((id) => saveQueueRef.current.add(id));
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      const payloads = Array.from(saveQueueRef.current)
        .map((id) => ({ id, pos: tokenPositions[id] }))
        .filter((p): p is { id: number; pos: { x: number; y: number } } =>
          Boolean(p.pos),
        );
      saveQueueRef.current.clear();
      for (const p of payloads) {
        try {
          await updateTokenPosition.mutateAsync({
            tokenId: p.id,
            positionX: p.pos.x,
            positionY: p.pos.y,
          });
        } catch (err) {
          // swallow; UI will refetch on next poll or manual refresh
          console.error("Failed to update token position", err);
        }
      }
    }, 600);
  };

  const applyTokenDelta = (ids: number[], deltaX: number, deltaY: number) => {
    if (!ids.length) return;
    setTokenPositions((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        const fallback = visibleTokens.find((t) => t.id === id);
        const baseX = next[id]?.x ?? fallback?.positionX ?? 0;
        const baseY = next[id]?.y ?? fallback?.positionY ?? 0;
        next[id] = {
          x: Math.max(0, baseX + deltaX),
          y: Math.max(0, baseY + deltaY),
        };
      });
      return next;
    });
    scheduleSave(ids);
  };

  const toggleSelect = (id: number) => {
    if (selectionMode === "single") {
      setSelectedTokenIds([id]);
      return;
    }
    setSelectedTokenIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  };

  const renderTabContent = () => {
    if (!data) {
      return (
        <div className="rounded border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-300">
          Loading campaign...
        </div>
      );
    }

    if (activeTab === "dice") {
      return <DiceTab diceLog={diceLog} onRoll={recordRoll} />;
    }

    if (activeTab === "characters") {
      return <CharactersTab characters={data.characters} />;
    }

    return <HandoutsTab handouts={data.handouts} />;
  };

  if (isPage) {
    return (
      <div className={outerClass}>
        <aside className="flex w-72 shrink-0 flex-col border-r border-slate-800/70 bg-slate-950/80">
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 px-4 py-4">
            <div className="space-y-1">
              <div className="text-[11px] tracking-wide text-slate-400 uppercase">
                Player table
              </div>
              <div className="text-lg font-semibold text-white">
                {data?.name ?? "Loading..."}
              </div>
              {activeScene && (
                <div className="text-xs text-slate-400">
                  Scene: {activeScene.name} • {maps.length} map
                  {maps.length === 1 ? "" : "s"}
                </div>
              )}
            </div>
            <div className="relative">
              <button
                className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:border-purple-500"
                onClick={() => setControlsOpen((v) => !v)}
                aria-label="Open player view menu"
              >
                ⋮
              </button>
              {controlsOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-800 bg-slate-900/90 p-2 text-xs shadow-xl">
                  <button
                    className="flex w-full items-center justify-between rounded px-2 py-2 text-left hover:bg-slate-800"
                    onClick={() => {
                      setAutoRefresh((v) => !v);
                      setControlsOpen(false);
                    }}
                  >
                    <span>Auto-refresh</span>
                    <span className="font-semibold text-purple-200">
                      {autoRefresh ? "On" : "Off"}
                    </span>
                  </button>
                  <button
                    className="w-full rounded px-2 py-2 text-left hover:bg-slate-800"
                    onClick={() => {
                      refetch();
                      setControlsOpen(false);
                    }}
                    disabled={isFetching}
                  >
                    {isFetching ? "Refreshing..." : "Refresh now"}
                  </button>
                  {maps.length > 1 && (
                    <>
                      <button
                        className="w-full rounded px-2 py-2 text-left hover:bg-slate-800"
                        onClick={() => {
                          setMapIndex(
                            (i) => (i - 1 + maps.length) % maps.length,
                          );
                          setControlsOpen(false);
                        }}
                      >
                        Previous map
                      </button>
                      <button
                        className="w-full rounded px-2 py-2 text-left hover:bg-slate-800"
                        onClick={() => {
                          setMapIndex((i) => (i + 1) % maps.length);
                          setControlsOpen(false);
                        }}
                      >
                        Next map
                      </button>
                    </>
                  )}
                  {onClose && (
                    <button
                      className="w-full rounded px-2 py-2 text-left text-red-200 hover:bg-slate-800"
                      onClick={() => {
                        setControlsOpen(false);
                        onClose();
                      }}
                    >
                      Exit table
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 border-b border-slate-800 px-3 py-3 text-sm">
            {["dice", "characters", "handouts"].map((tab) => (
              <button
                key={tab}
                className={`w-full rounded-lg px-3 py-2 text-left font-semibold capitalize transition ${activeTab === tab ? "bg-purple-600 text-white" : "bg-slate-900 text-slate-200 hover:bg-slate-800"}`}
                onClick={() => setActiveTab(tab as typeof activeTab)}
              >
                {tab} view
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {renderTabContent()}
          </div>

          {data?.role && (
            <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-400">
              Viewing as {data.role}. Updated every 3s while auto-refresh is on.
            </div>
          )}
        </aside>

        <div className="flex flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-6 py-4">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-white">
                {map?.name ?? "Awaiting map"}
              </div>
              <div className="text-xs text-slate-400">
                {map
                  ? `${visibleTokens.length} token${visibleTokens.length === 1 ? "" : "s"}`
                  : "No active maps yet"}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              {isDM && (
                <div className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-2 py-1">
                  <span className="text-[11px] tracking-wide text-slate-400 uppercase">
                    Select
                  </span>
                  <button
                    className={`rounded px-2 py-0.5 ${selectionMode === "single" ? "bg-purple-600 text-white" : "text-slate-200"}`}
                    onClick={() => setSelectionMode("single")}
                  >
                    Single
                  </button>
                  <button
                    className={`rounded px-2 py-0.5 ${selectionMode === "multi" ? "bg-purple-600 text-white" : "text-slate-200"}`}
                    onClick={() => setSelectionMode("multi")}
                  >
                    Multi
                  </button>
                </div>
              )}
              <div className="rounded-full bg-slate-900 px-3 py-1 text-xs text-slate-400">
                {autoRefresh ? "Auto-refresh on" : "Auto-refresh off"}
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
            </div>
          )}

          {!isLoading && !map && (
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-6 py-4 text-slate-300">
                No active maps yet. Waiting for the DM to share one.
              </div>
            </div>
          )}

          {map && (
            <div className="grid flex-1 grid-rows-1 gap-4 overflow-hidden p-4 lg:grid-cols-[minmax(0,_2fr)_minmax(320px,_1fr)]">
              <MapCanvas
                map={map}
                tokens={tokensWithPosition}
                gridSizePx={gridSizePx}
                isDM={isDM}
                selectionMode={selectionMode}
                selectedIds={selectedTokenIds}
                onSelectToken={toggleSelect}
                onDragTokens={applyTokenDelta}
              />

              <div className="flex h-full flex-col space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-200">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-white">
                    Tokens ({visibleTokens.length})
                  </div>
                  {data?.role && (
                    <span className="rounded bg-slate-800 px-2 py-1 text-[11px] tracking-wide text-slate-300 uppercase">
                      {data.role}
                    </span>
                  )}
                </div>
                <TokenList tokens={visibleTokens} />
                <DmTools
                  campaignId={campaignId}
                  isDM={isDM}
                  mapId={map?.id ?? null}
                  onUpdated={() =>
                    queryClient.invalidateQueries({
                      queryKey: ["campaigns", "full", campaignId, "play"],
                    })
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={outerClass}>
      <div className={cardClass}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="space-y-1">
            <div className="text-xs tracking-wide text-slate-400 uppercase">
              Player view
            </div>
            <div className="text-lg font-semibold text-white">
              {data?.name ?? "Loading..."}
            </div>
            {activeScene && (
              <div className="text-sm text-slate-400">
                Scene: {activeScene.name} • {maps.length} map
                {maps.length === 1 ? "" : "s"}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
            <button
              className="rounded border border-slate-700 px-3 py-1 hover:border-purple-500 hover:text-white"
              onClick={() => setAutoRefresh((v) => !v)}
            >
              Auto-refresh: {autoRefresh ? "On" : "Off"}
            </button>
            <button
              className="rounded border border-slate-700 px-3 py-1 hover:border-purple-500 hover:text-white"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? "Refreshing..." : "Refresh"}
            </button>
            {onClose && (
              <button
                className="rounded bg-slate-800 px-3 py-1 text-slate-200 hover:bg-slate-700"
                onClick={() => onClose()}
              >
                {isPage ? "Back" : "Close"}
              </button>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="mt-6 space-y-3">
            <div className="h-72 animate-pulse rounded-xl bg-slate-800/60" />
          </div>
        )}

        {!isLoading && !map && (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-slate-300">
            No active maps yet. Waiting for the DM to share one.
          </div>
        )}

        {map && (
          <div className="mt-4 grid gap-4 lg:grid-cols-[2fr,1fr]">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-300">
                <div className="font-semibold text-white">{map.name}</div>
                <div className="flex items-center gap-2">
                  {isDM && (
                    <div className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs">
                      <span className="text-[11px] tracking-wide text-slate-400 uppercase">
                        Select
                      </span>
                      <button
                        className={`rounded px-2 py-0.5 ${selectionMode === "single" ? "bg-purple-600 text-white" : "text-slate-200"}`}
                        onClick={() => setSelectionMode("single")}
                      >
                        Single
                      </button>
                      <button
                        className={`rounded px-2 py-0.5 ${selectionMode === "multi" ? "bg-purple-600 text-white" : "text-slate-200"}`}
                        onClick={() => setSelectionMode("multi")}
                      >
                        Multi
                      </button>
                    </div>
                  )}
                  <button
                    className="rounded border border-slate-700 px-2 py-1 hover:border-purple-500 hover:text-white"
                    onClick={() =>
                      setMapIndex((i) => (i - 1 + maps.length) % maps.length)
                    }
                    disabled={maps.length <= 1}
                  >
                    Prev map
                  </button>
                  <button
                    className="rounded border border-slate-700 px-2 py-1 hover:border-purple-500 hover:text-white"
                    onClick={() => setMapIndex((i) => (i + 1) % maps.length)}
                    disabled={maps.length <= 1}
                  >
                    Next map
                  </button>
                </div>
              </div>

              <MapCanvas
                map={map}
                tokens={tokensWithPosition}
                gridSizePx={gridSizePx}
                compact
                isDM={isDM}
                selectionMode={selectionMode}
                selectedIds={selectedTokenIds}
                onSelectToken={toggleSelect}
                onDragTokens={applyTokenDelta}
              />
            </div>

            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-200">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-white">
                  Tokens ({tokensWithPosition.length})
                </div>
                {data?.role && (
                  <span className="rounded bg-slate-800 px-2 py-1 text-[11px] tracking-wide text-slate-300 uppercase">
                    Viewing as {data.role}
                  </span>
                )}
              </div>
              <TokenList tokens={tokensWithPosition} />
              <DmTools
                campaignId={campaignId}
                isDM={isDM}
                mapId={map?.id ?? null}
                onUpdated={() =>
                  queryClient.invalidateQueries({
                    queryKey: ["campaigns", "full", campaignId, "play"],
                  })
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DiceTab({
  diceLog,
  onRoll,
}: {
  diceLog: { id: number; sides: number; result: number }[];
  onRoll: (sides: number) => void;
}) {
  return (
    <div className="space-y-3 text-sm">
      <div className="text-xs tracking-wide text-slate-400 uppercase">Dice</div>
      <div className="flex flex-wrap gap-2">
        {[4, 6, 8, 10, 12, 20].map((sides) => (
          <button
            key={sides}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-semibold hover:border-purple-500 hover:text-white"
            onClick={() => onRoll(sides)}
          >
            Roll d{sides}
          </button>
        ))}
      </div>
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        {diceLog.length === 0 ? (
          <div className="text-slate-400">No rolls yet.</div>
        ) : (
          <div className="space-y-2">
            {diceLog.map((roll) => (
              <div
                key={roll.id}
                className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/60 px-3 py-2"
              >
                <span className="font-semibold text-white">d{roll.sides}</span>
                <span className="text-lg font-bold text-purple-300">
                  {roll.result}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CharactersTab({
  characters,
}: {
  characters: CampaignFull["characters"];
}) {
  return (
    <div className="space-y-3 text-sm">
      <div className="text-xs tracking-wide text-slate-400 uppercase">
        Your characters
      </div>
      {characters.length === 0 ? (
        <div className="rounded border border-slate-800 bg-slate-900/60 p-3 text-slate-400">
          No characters attached yet.
        </div>
      ) : (
        <div className="space-y-2">
          {characters.map((c) => (
            <div
              key={c.linkId}
              className="rounded border border-slate-800 bg-slate-900/60 px-3 py-2"
            >
              <div className="font-semibold text-white">{c.characterName}</div>
              <div className="text-xs text-slate-400">
                {c.characterClass} • L{c.characterLevel}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <button
                  className="rounded bg-purple-600 px-3 py-1 font-semibold text-white transition hover:bg-purple-500"
                  type="button"
                >
                  Attack
                </button>
                <button
                  className="rounded bg-slate-800 px-3 py-1 font-semibold text-slate-200 transition hover:bg-slate-700"
                  type="button"
                >
                  Magic
                </button>
                <button
                  className="rounded bg-slate-800 px-3 py-1 font-semibold text-slate-200 transition hover:bg-slate-700"
                  type="button"
                >
                  Ability
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HandoutsTab({ handouts }: { handouts: CampaignFull["handouts"] }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="text-xs tracking-wide text-slate-400 uppercase">
        Handouts
      </div>
      {handouts.length === 0 ? (
        <div className="rounded border border-slate-800 bg-slate-900/60 p-3 text-slate-400">
          No handouts yet.
        </div>
      ) : (
        <div className="space-y-2">
          {handouts.map((h) => (
            <a
              key={h.id}
              href={h.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="block rounded border border-slate-800 bg-slate-950/60 px-3 py-2 hover:border-purple-500/70"
            >
              <div className="font-semibold text-white">{h.title}</div>
              <div className="text-xs text-slate-400">
                {h.description || "Handout"}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function MapCanvas({
  map,
  tokens,
  gridSizePx,
  compact = false,
  isDM = false,
  selectionMode = "single",
  selectedIds = [],
  onSelectToken,
  onDragTokens,
}: {
  map: MapWithTokens;
  tokens: Token[];
  gridSizePx: number;
  compact?: boolean;
  isDM?: boolean;
  selectionMode?: "single" | "multi";
  selectedIds?: number[];
  onSelectToken?: (id: number) => void;
  onDragTokens?: (ids: number[], deltaX: number, deltaY: number) => void;
}) {
  const aspect =
    map.widthPx && map.heightPx ? `${map.widthPx}/${map.heightPx}` : "16/9";
  const wrapperClass = compact
    ? "relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 select-none touch-none"
    : "relative flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 select-none touch-none";
  const dragRef = useRef<{
    ids: number[];
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    tokenId: number,
  ) => {
    if (!isDM) return;
    const alreadySelected = selectedIds?.includes(tokenId) ?? false;
    const ids =
      selectionMode === "multi"
        ? alreadySelected
          ? selectedIds || []
          : [...(selectedIds || []), tokenId]
        : [tokenId];

    onSelectToken?.(tokenId);

    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    dragRef.current = {
      ids,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const { ids, startX, startY } = dragRef.current;
    const dxPx = e.clientX - startX;
    const dyPx = e.clientY - startY;
    const dxSquares = Math.round(dxPx / gridSizePx);
    const dySquares = Math.round(dyPx / gridSizePx);
    if (dxSquares === 0 && dySquares === 0) return;
    dragRef.current = {
      ...dragRef.current,
      startX: startX + dxSquares * gridSizePx,
      startY: startY + dySquares * gridSizePx,
      moved: true,
    };
    onDragTokens?.(ids, dxSquares, dySquares);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  };

  return (
    <div className={wrapperClass}>
      <div
        className="relative h-full w-full touch-none select-none"
        style={{ aspectRatio: aspect }}
      >
        <img
          src={map.baseImageUrl}
          alt={map.name}
          loading="lazy"
          className={
            compact
              ? "block h-full w-full touch-none rounded-xl object-contain select-none"
              : "h-full w-full touch-none rounded-2xl object-contain select-none"
          }
          draggable={false}
        />
        <div className="pointer-events-none absolute inset-0 touch-none select-none">
          {tokens.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto absolute touch-none rounded border px-2 py-1 text-xs font-semibold shadow-lg backdrop-blur select-none ${isDM ? "cursor-move" : "cursor-default"} ${selectedIds?.includes(t.id) ? "border-purple-300 bg-purple-600/90 text-white" : "border-slate-900/60 bg-purple-600/80 text-white"}`}
              style={{
                left: `${t.positionX * gridSizePx}px`,
                top: `${t.positionY * gridSizePx}px`,
                width: `${Math.max(1, t.sizeSquares) * gridSizePx}px`,
                height: `${Math.max(1, t.sizeSquares) * gridSizePx}px`,
              }}
              onPointerDown={(e) => handlePointerDown(e, t.id)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onClick={(e) => {
                if (!isDM) return;
                e.stopPropagation();
                onSelectToken?.(t.id);
              }}
            >
              <div className="truncate">{t.label}</div>
              {t.tags?.length ? (
                <div className="mt-1 flex flex-wrap gap-1 text-[10px] font-normal tracking-wide text-purple-100/80 uppercase">
                  {t.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-purple-900/60 px-1 py-[1px]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TokenList({ tokens }: { tokens: Token[] }) {
  if (tokens.length === 0) {
    return <div className="text-slate-400">No tokens visible right now.</div>;
  }

  return (
    <div className="space-y-2 overflow-y-auto">
      {tokens.map((t) => (
        <div
          key={t.id}
          className="rounded border border-slate-800 bg-slate-950/60 px-3 py-2"
        >
          <div className="flex items-center justify-between">
            <div className="font-semibold text-white">{t.label}</div>
            <div className="text-xs text-slate-400">
              ({t.positionX}, {t.positionY}) • {t.sizeSquares} sq
            </div>
          </div>
          {t.tags?.length ? (
            <div className="mt-1 flex flex-wrap gap-1 text-[11px] tracking-wide text-slate-300 uppercase">
              {t.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="rounded bg-slate-800 px-1 py-[1px]">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function DmTools({
  campaignId,
  isDM,
  mapId,
  onUpdated,
}: {
  campaignId: number;
  isDM: boolean;
  mapId: number | null;
  onUpdated: () => void;
}) {
  const queryClient = useQueryClient();
  const [mapName, setMapName] = useState("");
  const mapFileRef = useRef<HTMLInputElement | null>(null);
  const handoutFileRef = useRef<HTMLInputElement | null>(null);
  const [handoutTitle, setHandoutTitle] = useState("");
  const [tokenLabel, setTokenLabel] = useState("");
  const [tokenSize, setTokenSize] = useState(1);

  const uploadMap = useMutation({
    mutationFn: (file: File) =>
      campaignsApi.uploadMap(campaignId, file, mapName.trim()),
    onSuccess: () => {
      setMapName("");
      if (mapFileRef.current) mapFileRef.current.value = "";
      onUpdated();
    },
  });

  const uploadHandout = useMutation({
    mutationFn: (file: File) =>
      campaignsApi.uploadHandout(campaignId, file, handoutTitle.trim(), ""),
    onSuccess: () => {
      setHandoutTitle("");
      if (handoutFileRef.current) handoutFileRef.current.value = "";
      onUpdated();
    },
  });

  const createToken = useMutation({
    mutationFn: () => {
      if (!mapId) throw new Error("No active map");
      return campaignsApi.createToken(mapId, {
        label: tokenLabel || "Token",
        sizeSquares: tokenSize,
        positionX: 0,
        positionY: 0,
      });
    },
    onSuccess: () => {
      setTokenLabel("");
      setTokenSize(1);
      queryClient.invalidateQueries({
        queryKey: ["campaigns", "full", campaignId, "play"],
      });
      onUpdated();
    },
  });

  if (!isDM) return null;

  return (
    <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-white">DM tools</span>
        <span className="text-[11px] tracking-wide text-purple-200 uppercase">
          Owner/Editor
        </span>
      </div>

      <div className="space-y-2">
        <div className="text-[11px] tracking-wide text-slate-400 uppercase">
          Map
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="w-36 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white"
            placeholder="Map name"
            value={mapName}
            onChange={(e) => setMapName(e.target.value)}
          />
          <input
            type="file"
            accept="image/*"
            ref={(el) => {
              mapFileRef.current = el;
            }}
            className="text-slate-300"
          />
          <button
            className="rounded bg-purple-600 px-3 py-1 font-semibold text-white hover:bg-purple-500 disabled:opacity-60"
            onClick={() => {
              const file = mapFileRef.current?.files?.[0];
              if (!file) return;
              uploadMap.mutate(file);
            }}
            disabled={uploadMap.status === "pending"}
          >
            {uploadMap.status === "pending" ? "Uploading..." : "Upload map"}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[11px] tracking-wide text-slate-400 uppercase">
          Handout
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="w-40 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white"
            placeholder="Title"
            value={handoutTitle}
            onChange={(e) => setHandoutTitle(e.target.value)}
          />
          <input
            type="file"
            ref={(el) => {
              handoutFileRef.current = el;
            }}
            className="text-slate-300"
          />
          <button
            className="rounded bg-slate-800 px-3 py-1 font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-60"
            onClick={() => {
              const file = handoutFileRef.current?.files?.[0];
              if (!file) return;
              uploadHandout.mutate(file);
            }}
            disabled={uploadHandout.status === "pending"}
          >
            {uploadHandout.status === "pending"
              ? "Uploading..."
              : "Upload handout"}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[11px] tracking-wide text-slate-400 uppercase">
          Quick token
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="w-32 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white"
            placeholder="Label"
            value={tokenLabel}
            onChange={(e) => setTokenLabel(e.target.value)}
          />
          <input
            type="number"
            min={1}
            className="w-16 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white"
            value={tokenSize}
            onChange={(e) => setTokenSize(Number(e.target.value) || 1)}
          />
          <button
            className="rounded bg-slate-800 px-3 py-1 font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-60"
            onClick={() => mapId && createToken.mutate()}
            disabled={createToken.status === "pending" || !mapId}
          >
            {createToken.status === "pending" ? "Adding..." : "Add token"}
          </button>
        </div>
        {!mapId && (
          <div className="text-[11px] text-slate-500">
            Add a map first to place tokens.
          </div>
        )}
      </div>
    </div>
  );
}
