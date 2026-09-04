/**
 * Types for the /be-api/analytics response.
 * This is the single source of truth for dashboard metrics, the
 * portfolio chart, and the recent assessments list.
 *
 * Keep this in sync with the backend contract. Do not add fields
 * here that the API does not actually return - add them once the
 * backend returns them.
 */

export interface AnalyticsProjectType {
  id: string;
  name: string;
}

export interface AnalyticsFilters {
  type: string | null;
}

export interface AnalyticsMetrics {
  total_projects: number;
  potential_cost_savings: number;
  average_predicted_gbi_score: number;
  certified_projects: number;
}

export interface CostTrend {
  month: string; // "YYYY-MM"
  budgeted_cost: number;
  projected_actual_cost: number;
}

export interface RecentProject {
  id: number;
  name: string;
  type: string;
  savings: number;
  predicted_score: number;
  created_at: string; // "YYYY-MM-DD HH:mm:ss"
}

export interface AnalyticsResponse {
  types: AnalyticsProjectType[];
  filters: AnalyticsFilters;
  metrics: AnalyticsMetrics;
  cost_trend: CostTrend[];
  recent_projects: RecentProject[];
}