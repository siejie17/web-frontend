/**
 * Reusable helpers for the analytics dashboard.
 *
 * These are pure functions so both the Certification Overview card and
 * the Recent Assessments table can share the exact same certification
 * logic, and so currency formatting stays consistent everywhere a
 * ringgit value from /be-api/analytics is displayed.
 */

export interface CertificationLevel {
  label: string;
  min: number;
  /** Dot / segment color used in the legend and donut chart. */
  color: string;
}

/**
 * Predicted certification thresholds, applied to a GBI score (0-100).
 * Ordered from highest to lowest so `getCertificationLevel` can walk
 * the list and return the first match.
 */
export const CERTIFICATION_THRESHOLDS: CertificationLevel[] = [
  { label: "Platinum", min: 85, color: "#64748B" },
  { label: "Gold", min: 75, color: "#C59D3A" },
  { label: "Silver", min: 65, color: "#9CA3AF" },
  { label: "Certified", min: 50, color: "#3E6B52" },
  { label: "Not certified", min: 0, color: "#C4574A" },
];

/**
 * Resolves a predicted GBI score into its certification level.
 * Used by both the Certification Overview card and each row in
 * Recent Assessments - do not duplicate this logic elsewhere.
 */
export function getCertificationLevel(score: number | null | undefined): CertificationLevel {
  const safeScore = typeof score === "number" && Number.isFinite(score) ? score : 0;

  for (const level of CERTIFICATION_THRESHOLDS) {
    if (safeScore >= level.min) return level;
  }

  return CERTIFICATION_THRESHOLDS[CERTIFICATION_THRESHOLDS.length - 1];
}

/**
 * Formats a number as Malaysian Ringgit, e.g. 144780 -> "RM 144,780.00".
 * Negative values keep their sign - the caller's data may legitimately
 * be negative (e.g. cost overrun) and that must stay visible.
 */
export function formatCurrencyMYR(value: number | null | undefined): string {
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const isNegative = safeValue < 0;
  const formatted = Math.abs(safeValue).toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${isNegative ? "-" : ""}RM ${formatted}`;
}

/**
 * Formats a "YYYY-MM" cost_trend month into a short label, e.g. "2026-04" -> "Apr".
 */
export function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split("-");
  if (!year || !monthNum) return month;

  const date = new Date(Number(year), Number(monthNum) - 1, 1);
  if (Number.isNaN(date.getTime())) return month;

  return date.toLocaleDateString("en-US", { month: "short" });
}

/** Rounds a GBI score for display, e.g. 52.69 -> 53, while keeping the raw value for calculations. */
export function roundScore(score: number | null | undefined): number {
  return Math.round(typeof score === "number" && Number.isFinite(score) ? score : 0);
}

/** Safely computes certified/total as a whole-number percentage without dividing by zero. */
export function certifiedPercentage(certified: number, total: number): number {
  if (!total) return 0;
  return Math.round((certified / total) * 100);
}