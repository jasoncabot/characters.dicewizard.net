import { useState } from "react";
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

export function Campaigns() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CampaignCreate>({
    name: "",
    description: "",
    visibility: "private",
    status: "not_started",
  });

  const {
    data: campaigns,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["campaigns", "details"],
    queryFn: campaignsApi.listDetails,
  });

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Campaigns</h2>
        <div className="text-sm text-slate-400">
          Create and track campaigns, members, and attached characters.
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-4 shadow-lg lg:col-span-1">
          <h3 className="mb-3 text-lg font-semibold text-white">
            Create Campaign
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-300">Name</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Example: Lost Mine of Phandelver"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300">
                Description / Notes
              </label>
              <textarea
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
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
                <label className="text-sm text-slate-300">Status</label>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
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
                <label className="text-sm text-slate-300">Visibility</label>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
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
          {isLoading && (
            <div className="flex h-48 items-center justify-center text-slate-400">
              Loading campaigns...
            </div>
          )}
          {error && (
            <div className="rounded border border-red-500/50 bg-red-500/20 p-3 text-red-200">
              Failed to load campaigns
            </div>
          )}
          {!isLoading && !error && (campaigns?.length ?? 0) === 0 && (
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 text-slate-300">
              No campaigns yet. Create one to get started.
            </div>
          )}

          <div className="space-y-4">
            {campaigns?.map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: CampaignDetail }) {
  const queryClient = useQueryClient();
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
      className="rounded-xl border border-slate-700/60 bg-slate-800/60 p-5 shadow-md"
      role="button"
      tabIndex={0}
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
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white focus:border-purple-400 focus:outline-none"
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
              className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200 transition hover:border-purple-500 hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                setInviteOpen(true);
              }}
              disabled={inviteMutation.status === "pending"}
            >
              Invite
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
              className="rounded bg-purple-600 px-3 py-1 text-xs font-semibold text-white hover:bg-purple-500"
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
                className="rounded px-2 py-1 text-slate-300 hover:bg-slate-800"
                onClick={() => setInviteOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/70 p-3 text-sm text-white">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => inviteMutation.mutate()}
                  disabled={inviteMutation.status === "pending"}
                  className="cursor-pointer rounded bg-purple-600 px-3 py-1 text-xs font-semibold text-white hover:bg-purple-500"
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
