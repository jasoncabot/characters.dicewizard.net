import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { campaignsApi } from "../api/client";
import { CampaignStatusBadge } from "./CampaignStatusBadge";
import { useAuth } from "../hooks/useAuth";

export function PlayerPortal({
  onBack,
  onOpenPlayerView,
}: {
  onBack?: () => void;
  onOpenPlayerView?: (campaignId: number) => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["campaigns", "details"],
    queryFn: campaignsApi.listDetails,
    staleTime: 20_000,
  });

  const acceptInvite = useMutation({
    mutationFn: (code: string) => campaignsApi.acceptInvite(code.trim()),
    onSuccess: () => {
      setInviteCode("");
      queryClient.invalidateQueries({ queryKey: ["campaigns", "details"] });
    },
  });

  const filtered = useMemo(() => {
    const list = data ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter((c) =>
      [c.name, c.description || ""].some((field) =>
        field.toLowerCase().includes(term),
      ),
    );
  }, [data, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm tracking-wide text-purple-200/80 uppercase">
            Player table
          </div>
          <h2 className="text-2xl font-bold text-white">Your campaigns</h2>
          <p className="text-sm text-slate-300">
            Jump straight into table view for campaigns you have joined or been
            invited to.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter campaigns"
            className="w-48 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white focus:border-purple-400 focus:outline-none"
          />
          {onBack && (
            <button
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-purple-500 hover:text-white"
              onClick={onBack}
            >
              Back to campaigns
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-300">
            Have an invite code? Paste it below to join a table.
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Invite code"
              className="w-40 rounded border border-slate-700 bg-slate-900 px-3 py-1 text-white focus:border-purple-400 focus:outline-none"
            />
            <button
              className="rounded bg-purple-600 px-3 py-1 font-semibold text-white hover:bg-purple-500 disabled:opacity-60"
              onClick={() =>
                inviteCode.trim() && acceptInvite.mutate(inviteCode)
              }
              disabled={acceptInvite.status === "pending" || !inviteCode.trim()}
            >
              {acceptInvite.status === "pending" ? "Joining..." : "Join"}
            </button>
            {acceptInvite.error && (
              <span className="text-xs text-red-300">
                Failed to join. Check the code and try again.
              </span>
            )}
          </div>
        </div>
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
          Failed to load campaigns.
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300">
          {search
            ? "No campaigns match that filter."
            : "You have not joined any campaigns yet."}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-xs tracking-wide text-slate-400 uppercase">
                  {c.visibility}
                </div>
                <div className="text-lg font-semibold text-white">{c.name}</div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <CampaignStatusBadge status={c.status} />
                  {user?.id === c.ownerId ? (
                    <span className="rounded bg-purple-900/40 px-2 py-[2px] text-xs text-purple-100">
                      You are DM
                    </span>
                  ) : (
                    <span className="rounded bg-slate-800 px-2 py-[2px] text-xs text-slate-200">
                      Player
                    </span>
                  )}
                </div>
              </div>
              <button
                className="rounded bg-purple-600 px-3 py-1 text-sm font-semibold text-white hover:bg-purple-500"
                onClick={() => onOpenPlayerView?.(c.id)}
              >
                Open table
              </button>
            </div>

            {c.description && (
              <p className="mt-2 text-sm text-slate-300">{c.description}</p>
            )}

            {c.characters.length > 0 && (
              <div className="mt-3 text-xs text-slate-300">
                <div className="mb-1 font-semibold text-slate-100">Party</div>
                <div className="flex flex-wrap gap-2">
                  {c.characters.slice(0, 4).map((ch) => (
                    <span
                      key={ch.linkId}
                      className="rounded border border-slate-800 bg-slate-950/60 px-2 py-1"
                    >
                      {ch.characterName} • L{ch.characterLevel}
                    </span>
                  ))}
                  {c.characters.length > 4 && (
                    <span className="text-slate-400">
                      +{c.characters.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}
