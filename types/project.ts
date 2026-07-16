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

export type CertificationLevel =
  | "Platinum"
  | "Gold"
  | "Silver"
  | "Certified"
  | "Not Certified";
 
export type ItemKind = "checkbox" | "options" | "selection" | "subitems";
 
export interface AssessmentOption {
  id: number;
  description: string;
  subDescription?: string;
  marks: number;
  predictedChecked: boolean;
  actualChecked: boolean;
}

export interface OptionGroup {
  id: number;
  label?: string | null;
  options: AssessmentOption[];
}
 
export interface AssessmentOptionGroup {
  id: number;
  label?: string;
  options: AssessmentOption[];
}
 
export interface SelectionChoice {
  id: number;
  description: string;
  marks: number;
}
 
export interface SelectionGroup {
  id: number;
  label: string;
  exclusive: boolean;
  selections: SelectionChoice[];
  predictedChoiceId: number | null;
  actualChoiceId: number | null;
}
 
export interface Subitem {
  id: number;
  description: string;
  predictedChecked: boolean;
  actualChecked: boolean;
}
 
export interface CustomEntry {
  id: string;
  description: string;
  /** Custom entries only ever exist on the "actual" side. */
  actualChecked: boolean;
}
 
export interface AssessmentItem {
  id: number;
  kind: ItemKind;
  description: string;
  info?: string;
  esg?: string;
  suggestions?: string;
  marks: number;
  isCompulsory?: boolean;
 
  // checkbox kind
  predictedChecked?: boolean;
  actualChecked?: boolean;
 
  // options kind
  optionGroups?: AssessmentOptionGroup[];
 
  // selection kind
  selectionGroups?: SelectionGroup[];
 
  // subitems kind
  subitems?: Subitem[];
  subitemsExist?: boolean;
  customEntries?: CustomEntry[];
 
  predictedMarks: number;
  actualMarks: number;
}
 
export interface Subcriterion {
  id: number;
  name: string;
  items?: AssessmentItem[] | null;
}
 
export interface Criterion {
  id: number;
  name: string;
  icon?: string;
  totalMarks: number;
  predictedMarks: number;
  actualMarks: number;
  items?: AssessmentItem[] | null;
  subcriteria?: Subcriterion[] | null;
}
 
export interface EvidenceFile {
  id: string;
  name: string;
  sizeLabel: string;
  uploadedAt: string;
}
 
export interface ProjectMeta {
  projectName: string;
  buildingType: string;
  assessmentTitle: string;
  status: "Draft" | "In Review" | "Submitted" | "Certified";
  lastUpdated: string;
  location: string;
  assessor: string;
}
 
export interface ScoreSummary {
  predicted: number;
  actual: number;
  total: number;
  predictedPct: number;
  actualPct: number;
  predictedLevel: CertificationLevel;
  actualLevel: CertificationLevel;
  completedCriteria: number;
  remainingCriteria: number;
}