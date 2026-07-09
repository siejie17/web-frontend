export type GreenElement = Record<string, unknown>;
export type Certification = Record<string, unknown>;

export interface ShowSelectedProjectResponse {
  success: boolean;
  projectData: ProjectData;
  green_elements: GreenElement[];
  certifications: Certification[];
}

export interface ProjectData {
  // Original Project fields (except removed ones)
  id: number;
  project_name: string;
  description?: string;
  has_management?: boolean;
  classification_id?: number | null;
  category_id?: number | null;
  location_id?: number | null;
  created_at: string;
  updated_at: string;

  // Replaced/derived fields
  building_type: string | null;
  building_type_name: string | null;
  classification: string | null;
  structure: string | null;
  category: string | null;
  location: string | null;

  // User Answers
  checked_items: number[];
  checked_subitems: Record<number, number[]>;
  checked_options: Record<number, number[]>;
  selected_items: Record<number, number>;
  custom_inputs: Record<number, string[]>;

  // Cost Breakdown
  cost_breakdown: Record<string, CostBreakdownNode>;

  // Actual User Answers
  actual_checked_items: number[];
  actual_checked_subitems: Record<number, number[]>;
  actual_checked_options: Record<number, number[]>;
  actual_selected_items: Record<number, number>;
  actual_custom_inputs: Record<number, string[]>;

  actual_answers_id: ActualAnswerIds;

  // Other project fields that exist in your Project model
  [key: string]: unknown;
}

export interface CostBreakdownNode {
  id: number;
  description: string;
  cost: number;
  actual_cost?: number;
  is_certification: boolean;
  children?: Record<string, CostBreakdownNode>;
}

export interface ActualAnswerIds {
  items: Record<number, number>;
  options: Record<number, Record<number, number>>;
  selections: Record<number, number>;
  subitems: Record<number, Record<number, number>>;
  customEntries: Record<number, Record<string, number>>;
}