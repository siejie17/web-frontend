export type HistoryProjectStage = "Actual Review" | "Certified";

export function getHistoryProjectStage(
  certificate?: { status?: string | null } | null,
): HistoryProjectStage {
  return certificate?.status === "issued" ? "Certified" : "Actual Review";
}
