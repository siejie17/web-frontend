export type BuildingType = string;
export type State = string;
export type Region = string;
export type StructureGroup = string; // ALL, SMSIA, SABAH, SARAWAK, etc.

export interface Classification {
  name: string;
  description: string;
}

export interface FormInputs {
  buildingTypes: BuildingType[];

  categories: Record<BuildingType, string[]>;

  classifications: Record<BuildingType, Classification[]>;

  structures: Record<
    BuildingType,
    Record<StructureGroup, string[]>
  >;

  states: State[];

  regions: Record<State, Region[]>;

  ratingScales: Record<
    BuildingType,
    Record<string, string>
  >;
}