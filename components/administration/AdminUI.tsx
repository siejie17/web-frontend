import { AlertCircle, LoaderCircle } from "lucide-react";

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="mb-6 flex flex-col justify-between gap-5 sm:mb-8 sm:flex-row sm:items-end">
    <div className="min-w-0 flex-1"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#789083]">{eyebrow}</p><h1 className="text-2xl font-bold tracking-[-0.035em] text-[#173b2a] sm:text-4xl">{title}</h1><p className="mt-2 max-w-5xl text-sm leading-6 text-[#65736a] sm:text-base sm:leading-7">{description}</p></div>{action && <div className="w-full shrink-0 [&>*]:w-full sm:w-auto sm:[&>*]:w-auto">{action}</div>}
  </div>;
}

export function LoadingState() { return <div className="flex min-h-60 items-center justify-center rounded-3xl border border-[#e1e5de] bg-white"><LoaderCircle className="animate-spin text-[#3e6b52]" /><span className="ml-3 text-sm text-[#65736a]">Loading workspace…</span></div>; }
export function ErrorState({ message }: { message: string }) { return <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"><AlertCircle size={18} />{message}</div>; }

export function StatusBadge({ value, variant = "default" }: { value: string; variant?: "default" | "stage" }) {
  const actualReviewStatuses = ["submitted", "pending_verification", "awaiting_verification", "requires_changes", "changes_requested", "verified", "actual_review"];
  const styles = variant === "stage"
    ? "bg-sage-100 text-sage-dark"
    : value === "certified" || value === "active"
    ? "bg-emerald-50 text-emerald-700"
    : actualReviewStatuses.includes(value)
      ? "bg-blue-50 text-blue-700"
      : value.includes("reject") || value.includes("changes")
        ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-700";
  const labels: Record<string, string> = {
    submitted: "Actual Review",
    pending_verification: "Actual Review",
    awaiting_verification: "Actual Review",
    requires_changes: "Actual Review",
    changes_requested: "Actual Review",
    verified: "Actual Review",
    actual_review: "Actual Review",
  };
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${styles}`}>{labels[value] || value.replaceAll("_", " ")}</span>;
}

export const inputClass = "w-full rounded-xl border border-[#dfe4dc] bg-white px-3.5 py-2.5 text-sm text-[#1e2621] outline-none transition focus:border-[#3e6b52] focus:ring-3 focus:ring-[#3e6b52]/10";
export const primaryButton = "inline-flex items-center justify-center rounded-xl bg-[#3e6b52] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#315b45] disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryButton = "inline-flex items-center justify-center rounded-xl border border-[#dfe4dc] bg-white px-4 py-2.5 text-sm font-semibold text-[#3e6b52] transition hover:border-[#3e6b52]";
