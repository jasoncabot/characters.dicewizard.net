import type { CampaignStatus } from "../types/campaign";

const STATUS_STYLES: Record<CampaignStatus, string> = {
  not_started: "bg-slate-700 text-slate-200",
  in_progress: "bg-green-600/80 text-white",
  paused: "bg-amber-500/80 text-white",
  completed: "bg-blue-600/80 text-white",
  archived: "bg-slate-600/80 text-white",
};

const STATUS_LABELS: Record<CampaignStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived",
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
