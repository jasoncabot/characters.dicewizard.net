import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@headlessui/react";
import { campaignsApi } from "../api/client";
import type {
  CampaignCreate,
  CampaignDetail,
  CampaignStatus,
} from "../types/campaign";
import { CampaignStatusBadge } from "./CampaignStatusBadge";
import { openNotePalette } from "../lib/notePalette";

const STATUS_OPTIONS: { value: CampaignStatus; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Private" },
  { value: "invite", label: "Invite-only" },
];

export function Campaigns({
  onOpenPlayerPortal,
  onOpenPlayerView,
}: {
  onOpenPlayerPortal?: () => void;
  onOpenPlayerView?: (campaignId: number) => void;
} = {}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CampaignCreate>({
    name: "",
    description: "",
    visibility: "private",
    status: "not_started",
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const {
    data: campaigns,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["campaigns", "details"],
    queryFn: campaignsApi.listDetails,
  });

  const filteredCampaigns = useMemo(() => {
    if (!campaigns) return [] as CampaignDetail[];
    const term = search.trim().toLowerCase();
    if (!term) return campaigns;
    return campaigns.filter((c) =>
      [c.name, c.description || ""].some((field) =>
        field.toLowerCase().includes(term),
      ),
    );
  }, [campaigns, search]);

  const activeSelectedId = useMemo(() => {
    if (selectedId && filteredCampaigns.some((c) => c.id === selectedId)) {
      return selectedId;
    }
    return filteredCampaigns[0]?.id ?? null;
  }, [filteredCampaigns, selectedId]);

  useEffect(() => {
    if (!activeSelectedId || filteredCampaigns.length === 0) return;
    const handleKeys = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        setSelectedId(null);
        return;
      }
      const idx = filteredCampaigns.findIndex((c) => c.id === activeSelectedId);
      if (idx === -1) return;
      if (e.key === "ArrowRight" || e.key === "]") {
        const next = filteredCampaigns[(idx + 1) % filteredCampaigns.length];
        if (next) setSelectedId(next.id);
      }
      if (e.key === "ArrowLeft" || e.key === "[") {
        const prev =
          filteredCampaigns[
            (idx - 1 + filteredCampaigns.length) % filteredCampaigns.length
          ];
        if (prev) setSelectedId(prev.id);
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [activeSelectedId, filteredCampaigns]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ campaignId: number }>).detail;
      if (detail?.campaignId) {
        onOpenPlayerView?.(detail.campaignId);
      }
    };
    window.addEventListener("open-player-view", handler as EventListener);
    return () =>
      window.removeEventListener("open-player-view", handler as EventListener);
  }, [onOpenPlayerView]);

  const createMutation = useMutation({
    mutationFn: (data: CampaignCreate) => campaignsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", "details"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setForm({
        name: "",
        description: "",
        visibility: "private",
        status: "not_started",
      });
    },
  });

  // reuse createMutation only; per-card mutation handles updates

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Campaigns</h2>
          <div className="text-sm text-slate-200">
            Create and track campaigns, members, and attached characters.
          </div>
        </div>
        {onOpenPlayerPortal && (
          <button
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:border-purple-500 hover:text-white"
            onClick={onOpenPlayerPortal}
          >
            Open player portal
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-4 shadow-lg lg:col-span-1">
          <h3 className="mb-3 text-lg font-semibold text-white">
            Create Campaign
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-200">Name</label>
              <input
                className="mt-1 w-full cursor-text rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Example: Lost Mine of Phandelver"
              />
            </div>
            <div>
              <label className="text-sm text-slate-200">
                Description / Notes
              </label>
              <textarea
                className="mt-1 w-full cursor-text rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Short pitch for players"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-sm text-slate-200">Status</label>
                <select
                  className="mt-1 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status: e.target.value as CampaignStatus,
                    })
                  }
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-sm text-slate-200">Visibility</label>
                <select
                  className="mt-1 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
                  value={form.visibility}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      visibility: e.target
                        .value as CampaignCreate["visibility"],
                    })
                  }
                >
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button
              onClick={() => {
                if (!form.name.trim()) return;
                createMutation.mutate(form);
              }}
              disabled={createMutation.status === "pending"}
              className="mt-2 w-full cursor-pointer rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 font-semibold text-white shadow-lg transition hover:from-purple-500 hover:to-pink-500 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none disabled:opacity-60"
            >
              {createMutation.status === "pending" ? "Creating..." : "Create"}
            </Button>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Notes: future versions will support rich notes and invitations. For
            now, use the description to brief players and attach characters via
            character cards.
          </p>
        </div>

        <div className="lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <span className="rounded bg-slate-800 px-2 py-1 text-xs tracking-wide text-slate-200 uppercase">
                {campaigns?.length ?? 0} campaigns
              </span>
              {activeSelectedId && (
                <span className="rounded bg-purple-600/20 px-2 py-1 text-xs text-purple-100">
                  ← / → to switch • Esc to close detail
                </span>
              )}
            </div>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name or note"
              className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white focus:border-purple-400 focus:outline-none"
            />
          </div>

          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-xl border border-slate-800/80 bg-slate-800/50"
                />
              ))}
            </div>
          )}
          {error && (
            <div className="rounded border border-red-500/50 bg-red-500/20 p-3 text-red-200">
              Failed to load campaigns
            </div>
          )}
          {!isLoading && !error && filteredCampaigns.length === 0 && (
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 text-slate-300">
              {search.trim()
                ? "No campaigns match that filter."
                : "No campaigns yet. Create one to get started."}
            </div>
          )}

          <div className="space-y-4">
            {filteredCampaigns.map((c) => (
              <CampaignCard
                key={c.id}
                campaign={c}
                onSelect={() => setSelectedId(c.id)}
                selected={activeSelectedId === c.id}
                onOpenPlayer={() => onOpenPlayerView?.(c.id)}
              />
            ))}
          </div>

          {activeSelectedId && (
            <div className="mt-6">
              <CampaignDetailPanel
                campaignId={activeSelectedId}
                onClose={() => setSelectedId(null)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CampaignCard({
  campaign,
  onSelect,
  selected = false,
  onOpenPlayer,
}: {
  campaign: CampaignDetail;
  onSelect?: () => void;
  selected?: boolean;
  onOpenPlayer?: () => void;
}) {
  const queryClient = useQueryClient();
  const prefetchDetail = () =>
    queryClient.prefetchQuery({
      queryKey: ["campaigns", "full", campaign.id],
      queryFn: () => campaignsApi.getFull(campaign.id),
      staleTime: 60_000,
    });
  const updateMutation = useMutation({
    mutationFn: ({ status }: { status: CampaignStatus }) =>
      campaignsApi.updateStatus(campaign.id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", "details"] });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: () => campaignsApi.createInvite(campaign.id, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", "details"] });
    },
  });

  const [inviteOpen, setInviteOpen] = useState(false);
  const membersQuery = useQuery({
    queryKey: ["campaigns", campaign.id, "members"],
    queryFn: () => campaignsApi.listMembers(campaign.id),
    enabled: inviteOpen,
  });

  const roleMutation = useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: number;
      role: "viewer" | "editor" | "owner";
    }) => campaignsApi.updateMemberRole(campaign.id, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaign.id, "members"],
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: ({ userId }: { userId: number }) =>
      campaignsApi.revokeMember(campaign.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaign.id, "members"],
      });
    },
  });

  return (
    <div
      className={`cursor-pointer rounded-xl border p-5 shadow-md transition ${selected ? "border-purple-400/70 bg-slate-800" : "border-slate-700/60 bg-slate-800/60 hover:border-purple-500/60"}`}
      role="button"
      tabIndex={0}
      onMouseEnter={prefetchDetail}
      onClick={() => onSelect?.()}
      onKeyDown={(e) => {
        if (
          e.key.toLowerCase() === "n" &&
          !e.metaKey &&
          !e.ctrlKey &&
          !e.altKey
        ) {
          e.preventDefault();
          e.stopPropagation();
          openNotePalette({
            mode: "create",
            entityType: "campaign",
            entityId: campaign.id,
            title: campaign.name,
          });
        }
        if (
          e.key.toLowerCase() === "i" &&
          !e.metaKey &&
          !e.ctrlKey &&
          !e.altKey
        ) {
          e.preventDefault();
          e.stopPropagation();
          setInviteOpen(true);
        }
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm tracking-wide text-slate-400 uppercase">
            {campaign.visibility}
          </div>
          <h3 className="text-xl font-bold text-white">{campaign.name}</h3>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-300">
            <CampaignStatusBadge status={campaign.status} />
            <select
              className="cursor-pointer rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white focus:border-purple-400 focus:outline-none"
              value={campaign.status}
              onChange={(e) =>
                updateMutation.mutate({
                  status: e.target.value as CampaignStatus,
                })
              }
              disabled={updateMutation.status === "pending"}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              className="cursor-pointer rounded border border-slate-700 px-2 py-1 text-xs text-slate-200 transition hover:border-purple-500 hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                setInviteOpen(true);
              }}
              disabled={inviteMutation.status === "pending"}
            >
              Invite
            </button>
            <button
              className="cursor-pointer rounded border border-slate-700 px-2 py-1 text-xs text-slate-200 transition hover:border-purple-500 hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                onOpenPlayer?.();
              }}
            >
              Table view
            </button>
          </div>
        </div>
        <div className="text-sm text-slate-400">
          Created {new Date(campaign.createdAt).toLocaleDateString()}
        </div>
      </div>

      {campaign.description && (
        <p className="mt-3 text-slate-200">{campaign.description}</p>
      )}

      <div className="mt-4">
        <h4 className="text-sm font-semibold text-slate-200">Characters</h4>
        {campaign.characters.length === 0 ? (
          <p className="text-sm text-slate-400">No characters attached yet.</p>
        ) : (
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {campaign.characters.map((char) => (
              <div
                key={char.linkId}
                className="rounded border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-sm text-slate-200"
              >
                <div className="font-semibold text-white">
                  {char.characterName}
                </div>
                <div className="text-slate-400">
                  {char.characterClass} • L{char.characterLevel}
                </div>
                <div className="text-slate-400">
                  Owner: {char.ownerUsername}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 rounded border border-slate-700/60 bg-slate-900/40 p-3 text-xs text-slate-400">
        {campaign.status === "not_started" &&
        Array.isArray(membersQuery.data) &&
        membersQuery.data.length > 1 ? (
          <div className="flex items-center justify-between text-sm text-white">
            <span>Party assembled. Ready to start?</span>
            <button
              className="cursor-pointer rounded bg-purple-600 px-3 py-1 text-xs font-semibold text-white hover:bg-purple-500"
              onClick={(e) => {
                e.stopPropagation();
                updateMutation.mutate({ status: "in_progress" });
              }}
              disabled={updateMutation.status === "pending"}
            >
              Start campaign
            </button>
          </div>
        ) : (
          <span>
            Notes: future UX will add shared and private notes, invitations, and
            map previews. For now, use description and attach characters from
            the Characters tab.
          </span>
        )}
      </div>

      {inviteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setInviteOpen(false)}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              setInviteOpen(false);
            }
          }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-white">
                Invite to {campaign.name}
              </div>
              <button
                className="cursor-pointer rounded p-1 text-slate-200 transition hover:bg-slate-800"
                onClick={() => setInviteOpen(false)}
                aria-label="Close dialog"
              >
                ×
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/70 p-3 text-sm text-white">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => inviteMutation.mutate()}
                  disabled={inviteMutation.status === "pending"}
                  className="cursor-pointer rounded bg-purple-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-purple-500"
                >
                  {inviteMutation.status === "pending"
                    ? "Generating..."
                    : "Generate code"}
                </Button>
                {inviteMutation.data && (
                  <>
                    <code className="rounded bg-slate-900 px-2 py-1 text-xs text-purple-200">
                      {inviteMutation.data.code}
                    </code>
                    <button
                      className="rounded bg-slate-900 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                      onClick={() =>
                        navigator.clipboard.writeText(inviteMutation.data!.code)
                      }
                    >
                      Copy
                    </button>
                    <span className="text-xs text-slate-400">
                      Expires{" "}
                      {new Date(
                        inviteMutation.data.expiresAt || new Date(),
                      ).toLocaleString()}{" "}
                      • Role {inviteMutation.data.roleDefault ?? "viewer"}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 text-sm font-semibold text-white">
                Members
              </div>
              {membersQuery.isLoading && (
                <div className="text-sm text-slate-400">Loading members...</div>
              )}
              {membersQuery.error && (
                <div className="text-sm text-red-300">
                  Failed to load members
                </div>
              )}
              {Array.isArray(membersQuery.data) &&
                membersQuery.data.length === 0 && (
                  <div className="text-sm text-slate-400">No members yet.</div>
                )}
              {Array.isArray(membersQuery.data) &&
                membersQuery.data.length > 0 && (
                  <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900/60">
                    {membersQuery.data.map((m) => (
                      <div
                        key={m.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-3 py-2"
                      >
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {m.username}
                          </div>
                          <div className="text-xs text-slate-400">
                            Joined {new Date(m.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                            value={m.role}
                            onChange={(e) =>
                              roleMutation.mutate({
                                userId: m.userId,
                                role: e.target.value as
                                  | "viewer"
                                  | "editor"
                                  | "owner",
                              })
                            }
                            disabled={
                              roleMutation.status === "pending" ||
                              m.role === "owner"
                            }
                          >
                            <option value="owner">owner</option>
                            <option value="editor">editor</option>
                            <option value="viewer">viewer</option>
                          </select>
                          {m.role !== "owner" && (
                            <button
                              className="rounded bg-slate-800 px-2 py-1 text-xs text-red-300 hover:bg-slate-700"
                              onClick={() =>
                                revokeMutation.mutate({ userId: m.userId })
                              }
                              disabled={revokeMutation.status === "pending"}
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CampaignDetailPanel({
  campaignId,
  onClose,
}: {
  campaignId: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const mapFileRef = useRef<HTMLInputElement | null>(null);
  const handoutFileRef = useRef<HTMLInputElement | null>(null);
  const [mapName, setMapName] = useState("");
  const [mapError, setMapError] = useState<string | null>(null);
  const [handoutTitle, setHandoutTitle] = useState("");
  const [handoutDescription, setHandoutDescription] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["campaigns", "full", campaignId],
    queryFn: () => campaignsApi.getFull(campaignId),
  });

  const uploadMap = useMutation({
    mutationFn: (file: File) =>
      campaignsApi.uploadMap(campaignId, file, mapName),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaigns", "full", campaignId],
      });
      setMapName("");
      setMapError(null);
      if (mapFileRef.current) mapFileRef.current.value = "";
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Failed to upload map";
      setMapError(message);
    },
  });

  const uploadHandout = useMutation({
    mutationFn: (file: File) =>
      campaignsApi.uploadHandout(
        campaignId,
        file,
        handoutTitle,
        handoutDescription,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaigns", "full", campaignId],
      });
      setHandoutTitle("");
      setHandoutDescription("");
      if (handoutFileRef.current) handoutFileRef.current.value = "";
    },
  });

  const canEdit = data?.role === "owner" || data?.role === "editor";

  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-6 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-400">Campaign detail</div>
          <div className="text-xl font-semibold text-white">{data?.name}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded bg-slate-800 px-3 py-1 text-sm text-slate-200 hover:bg-slate-700"
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="rounded bg-purple-600 px-3 py-1 text-sm font-semibold text-white transition hover:bg-purple-500"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("open-player-view", { detail: { campaignId } }),
              )
            }
          >
            Open player view
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <div className="h-8 animate-pulse rounded bg-slate-800/60" />
          <div className="h-48 animate-pulse rounded bg-slate-800/40" />
        </div>
      )}
      {error && (
        <div className="rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-red-200">
          Failed to load campaign
        </div>
      )}
      {data && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <span className="rounded bg-slate-800 px-2 py-1 text-xs tracking-wide text-slate-200 uppercase">
              Role: {data.role}
            </span>
            <span>Status: {data.status}</span>
            <span>{data.members.length} members</span>
          </div>

          {/* Maps */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-lg font-semibold text-white">Maps</div>
              {canEdit && (
                <div className="flex items-center gap-2 text-sm">
                  <input
                    type="text"
                    className="w-40 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-white"
                    placeholder="Map name"
                    value={mapName}
                    onChange={(e) => setMapName(e.target.value)}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    ref={mapFileRef}
                    className="text-sm text-slate-200"
                  />
                  <Button
                    onClick={() => {
                      const file = mapFileRef.current?.files?.[0];
                      if (!file) {
                        setMapError("Select an image first");
                        return;
                      }
                      setMapError(null);
                      uploadMap.mutate(file);
                    }}
                    disabled={uploadMap.status === "pending"}
                    className="cursor-pointer rounded bg-purple-600 px-3 py-1 text-xs font-semibold text-white hover:bg-purple-500"
                  >
                    {uploadMap.status === "pending" ? "Uploading..." : "Upload"}
                  </Button>
                  {mapError && (
                    <span className="text-xs text-red-300">{mapError}</span>
                  )}
                </div>
              )}
            </div>
            {data.scenes.length === 0 && (
              <div className="text-sm text-slate-400">No maps yet.</div>
            )}
            {data.scenes.map((scene) => (
              <div
                key={scene.id}
                className="mb-3 rounded border border-slate-800 bg-slate-900/80 p-3"
              >
                <div className="mb-2 text-sm font-semibold text-white">
                  {scene.name}
                </div>
                {scene.maps.length === 0 && (
                  <div className="text-sm text-slate-400">
                    No maps in this scene.
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-2">
                  {scene.maps.map((map) => (
                    <div
                      key={map.id}
                      className="rounded border border-slate-800 bg-slate-950/60 p-3"
                    >
                      {(() => {
                        // Guard against missing tokens payloads from the backend.
                        const tokens = map.tokens ?? [];
                        return (
                          <>
                            <div className="flex items-center justify-between text-sm text-white">
                              <span className="font-semibold">{map.name}</span>
                              <span className="text-xs text-slate-400">
                                {tokens.length} tokens
                              </span>
                            </div>
                            {map.baseImageUrl && (
                              <img
                                src={map.baseImageUrl}
                                alt={map.name}
                                loading="lazy"
                                className="mt-2 h-40 w-full rounded object-cover"
                              />
                            )}
                            <div className="mt-3 space-y-2 text-sm text-slate-200">
                              {tokens.map((t) => (
                                <div
                                  key={t.id}
                                  className="rounded border border-slate-800 bg-slate-900/60 px-2 py-1"
                                >
                                  <div className="font-semibold text-white">
                                    {t.label}
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    ({t.positionX}, {t.positionY}) •{" "}
                                    {t.sizeSquares} sq
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        );
                      })()}
                      {canEdit && (
                        <div className="mt-3 rounded border border-slate-800 bg-slate-900/60 p-2">
                          <div className="mb-1 text-xs font-semibold text-white">
                            Add token
                          </div>
                          <TokenForm
                            mapId={map.id}
                            onCreated={() =>
                              queryClient.invalidateQueries({
                                queryKey: ["campaigns", "full", campaignId],
                              })
                            }
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Handouts */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-lg font-semibold text-white">Handouts</div>
              {canEdit && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <input
                    type="text"
                    className="w-36 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-white"
                    placeholder="Title"
                    value={handoutTitle}
                    onChange={(e) => setHandoutTitle(e.target.value)}
                  />
                  <input
                    type="text"
                    className="w-48 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-white"
                    placeholder="Description"
                    value={handoutDescription}
                    onChange={(e) => setHandoutDescription(e.target.value)}
                  />
                  <input
                    type="file"
                    ref={handoutFileRef}
                    className="text-sm text-slate-200"
                  />
                  <Button
                    onClick={() => {
                      const file = handoutFileRef.current?.files?.[0];
                      if (!file) return;
                      uploadHandout.mutate(file);
                    }}
                    disabled={uploadHandout.status === "pending"}
                    className="cursor-pointer rounded bg-purple-600 px-3 py-1 text-xs font-semibold text-white hover:bg-purple-500"
                  >
                    {uploadHandout.status === "pending"
                      ? "Uploading..."
                      : "Upload"}
                  </Button>
                </div>
              )}
            </div>
            {data.handouts.length === 0 && (
              <div className="text-sm text-slate-400">No handouts yet.</div>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              {data.handouts.map((h) => (
                <a
                  key={h.id}
                  href={h.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 hover:border-purple-500/60"
                >
                  <div className="font-semibold text-white">{h.title}</div>
                  <div className="text-xs text-slate-400">
                    {h.description || "Handout"}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TokenForm({
  mapId,
  onCreated,
}: {
  mapId: number;
  onCreated: () => void;
}) {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sizeSquares, setSizeSquares] = useState(1);
  const createToken = useMutation({
    mutationFn: () =>
      campaignsApi.createToken(mapId, {
        label,
        imageUrl,
        sizeSquares,
      }),
    onSuccess: () => {
      setLabel("");
      setImageUrl("");
      setSizeSquares(1);
      onCreated();
      queryClient.invalidateQueries({ queryKey: ["campaigns", "details"] });
    },
  });

  return (
    <div className="space-y-2 text-sm text-slate-200">
      <input
        type="text"
        className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1 text-white"
        placeholder="Label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <input
        type="text"
        className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1 text-white"
        placeholder="Image URL (optional)"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-400">Size</label>
        <input
          type="number"
          min={1}
          className="w-16 rounded border border-slate-800 bg-slate-900 px-2 py-1 text-white"
          value={sizeSquares}
          onChange={(e) => setSizeSquares(Number(e.target.value) || 1)}
        />
        <Button
          onClick={() => {
            if (!label.trim()) return;
            createToken.mutate();
          }}
          disabled={createToken.status === "pending"}
          className="cursor-pointer rounded bg-purple-600 px-3 py-1 text-xs font-semibold text-white hover:bg-purple-500"
        >
          {createToken.status === "pending" ? "Adding..." : "Add"}
        </Button>
      </div>
    </div>
  );
}
