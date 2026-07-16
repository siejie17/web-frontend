// ────────────────────────────────────────────────────────────────────────
// lib/mock-data.ts
// Placeholder content shaped like real GBI (Green Building Index) criteria
// so the UI has something believable to render. Swap this for the ported
// data-fetching logic from the RN screen (`greenElements`, `selectedProject`).
// ────────────────────────────────────────────────────────────────────────

import type { Criterion, ProjectMeta } from "@/types/project";

export const projectMeta: ProjectMeta = {
  projectName: "Riverine Business Park — Tower B",
  buildingType: "Commercial Office (New Construction)",
  assessmentTitle: "GBI Predicted vs. Actual Assessment",
  status: "In Review",
  lastUpdated: "Jul 14, 2026 · 4:32 PM",
  location: "Kuching, Sarawak",
  assessor: "N. Bujang, GBI Facilitator",
};

export const criteria: Criterion[] = [
  {
    id: 1,
    name: "Energy Efficiency",
    icon: "bolt",
    totalMarks: 39,
    predictedMarks: 27,
    actualMarks: 24,
    subcriteria: [],
    items: [
      {
        id: 101,
        kind: "checkbox",
        description:
          "Building envelope achieves an OTTV of 35 W/m² or lower, verified by simulation.",
        info:
          "OTTV (Overall Thermal Transfer Value) measures heat gain through the envelope. Lower is better.",
        marks: 6,
        predictedChecked: true,
        actualChecked: true,
        predictedMarks: 6,
        actualMarks: 6,
      },
      {
        id: 102,
        kind: "options",
        description: "Renewable energy contribution to total building demand.",
        marks: 8,
        predictedMarks: 5,
        actualMarks: 3,
        optionGroups: [
            {
            id: 1,
            label: "Renewable sources installed",
            options: [
              { id: 1, description: "Rooftop photovoltaic array ≥ 5% of demand", marks: 3, predictedChecked: true, actualChecked: true },
              { id: 2, description: "Solar hot water for common areas", marks: 2, predictedChecked: true, actualChecked: false },
              { id: 3, description: "On-site energy storage integration", marks: 3, predictedChecked: false, actualChecked: false },
            ],
          },
        ],
      },
      {
        id: 103,
        kind: "selection",
        description: "Chiller plant efficiency band (kW/RT).",
        marks: 10,
        predictedMarks: 10,
        actualMarks: 6,
        selectionGroups: [
          {
            id: 1,
            label: "Measured plant efficiency",
            exclusive: true,
            predictedChoiceId: 3,
            actualChoiceId: 2,
            selections: [
              { id: 1, description: "0.55 – 0.60 kW/RT", marks: 6 },
              { id: 2, description: "0.50 – 0.55 kW/RT", marks: 8 },
              { id: 3, description: "Below 0.50 kW/RT", marks: 10 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 2,
    name: "Indoor Environmental Quality",
    icon: "wind",
    totalMarks: 21,
    predictedMarks: 16,
    actualMarks: 12,
    subcriteria: [
      {
        id: 21,
        name: "Air Quality",
        items: [
          {
            id: 201,
            kind: "subitems",
            description: "Low-VOC materials used across finishing works.",
            marks: 6,
            predictedMarks: 4,
            actualMarks: 3,
            subitems: [
              { id: 1, description: "Paints & coatings", predictedChecked: true, actualChecked: true },
              { id: 2, description: "Adhesives & sealants", predictedChecked: true, actualChecked: true },
              { id: 3, description: "Carpet & flooring", predictedChecked: true, actualChecked: false },
              { id: 4, description: "Composite wood products", predictedChecked: false, actualChecked: false },
            ],
            customEntries: [
              { id: "c1", description: "Acoustic ceiling panels — supplier COA verified on site", actualChecked: true },
            ],
          },
          {
            id: 202,
            kind: "checkbox",
            description: "CO₂ sensors installed in densely occupied zones with demand-control ventilation.",
            marks: 4,
            predictedChecked: true,
            actualChecked: false,
            predictedMarks: 4,
            actualMarks: 0,
          },
        ],
      },
      {
        id: 22,
        name: "Thermal Comfort",
        items: [
          {
            id: 203,
            kind: "checkbox",
            description: "Independent thermal comfort survey completed post-occupancy.",
            marks: 3,
            isCompulsory: true,
            predictedChecked: true,
            actualChecked: true,
            predictedMarks: 3,
            actualMarks: 3,
          },
        ],
      },
    ],
  },
  {
    id: 3,
    name: "Sustainable Site Planning",
    icon: "map-pin",
    totalMarks: 16,
    predictedMarks: 11,
    actualMarks: 11,
    subcriteria: [],
    items: [
      {
        id: 301,
        kind: "checkbox",
        description: "Site within 400m walking distance of public transit.",
        marks: 4,
        predictedChecked: true,
        actualChecked: true,
        predictedMarks: 4,
        actualMarks: 4,
      },
      {
        id: 302,
        kind: "checkbox",
        description: "Stormwater management plan limits peak discharge to pre-development rate.",
        marks: 3,
        predictedChecked: true,
        actualChecked: true,
        predictedMarks: 3,
        actualMarks: 3,
      },
      {
        id: 303,
        kind: "options",
        description: "Reduction of heat island effect.",
        marks: 4,
        predictedMarks: 4,
        actualMarks: 4,
        optionGroups: [
          {
            id: 1,
            options: [
              { id: 1, description: "Roof SRI ≥ 78 across 75% of roof area", marks: 2, predictedChecked: true, actualChecked: true },
              { id: 2, description: "50% of parking under shade or cover", marks: 2, predictedChecked: true, actualChecked: true },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 4,
    name: "Materials & Resources",
    icon: "layers",
    totalMarks: 10,
    predictedMarks: 5,
    actualMarks: 2,
    subcriteria: [],
    items: [
      {
        id: 401,
        kind: "checkbox",
        description: "Construction waste diverted from landfill exceeds 50% by weight.",
        marks: 3,
        predictedChecked: true,
        actualChecked: false,
        predictedMarks: 3,
        actualMarks: 0,
      },
      {
        id: 402,
        kind: "checkbox",
        description: "Minimum 20% of materials sourced within 500km of site.",
        marks: 2,
        predictedChecked: true,
        actualChecked: true,
        predictedMarks: 2,
        actualMarks: 2,
      },
    ],
  },
  {
    id: 5,
    name: "Water Efficiency",
    icon: "droplet",
    totalMarks: 10,
    predictedMarks: 7,
    actualMarks: 7,
    subcriteria: [],
    items: [
      {
        id: 501,
        kind: "checkbox",
        description: "Rainwater harvesting system sized for landscape irrigation demand.",
        marks: 4,
        predictedChecked: true,
        actualChecked: true,
        predictedMarks: 4,
        actualMarks: 4,
      },
      {
        id: 502,
        kind: "checkbox",
        description: "Low-flow fixtures reduce potable water use by 30% over baseline.",
        marks: 3,
        predictedChecked: true,
        actualChecked: true,
        predictedMarks: 3,
        actualMarks: 3,
      },
    ],
  },
  {
    id: 6,
    name: "Innovation",
    icon: "sparkles",
    totalMarks: 4,
    predictedMarks: 2,
    actualMarks: 2,
    subcriteria: [],
    items: [
      {
        id: 601,
        kind: "checkbox",
        description: "GBI Facilitator engaged from schematic design through handover.",
        marks: 2,
        predictedChecked: true,
        actualChecked: true,
        predictedMarks: 2,
        actualMarks: 2,
      },
    ],
  },
];