"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import ActualGBIAssessment from "@/components/assessment/ActualGBIAssessment";

/* ════════════════════════════════════════════════════════════════════════════
   Mock Green Elements (criteria + items) — exercises every feature
   ════════════════════════════════════════════════════════════════════════════ */

const MOCK_GREEN_ELEMENTS = [
  {
    name: "Energy Efficiency",
    total_marks: 30,
    items: [
      {
        id: 101,
        description: "Energy-efficient lighting (LED)",
        marks: 5,
        is_compulsory: 0,
        esg: "Reduces operational carbon footprint and energy costs.",
      },
      {
        id: 102,
        description: "HVAC system with high SEER rating",
        marks: 4,
        is_compulsory: 0,
        suggestions: "Consider variable refrigerant flow (VRF) systems.",
      },
      {
        id: 103,
        description: "Building envelope insulation",
        marks: 3,
        is_compulsory: 1,
      },
      {
        id: 104,
        description: "Renewable energy source",
        marks: 8,
        is_compulsory: 0,
        option_groups: [
          {
            id: 201,
            label: "Renewable type",
            options: [
              { id: 2011, description: "Solar photovoltaic", marks: 4, sub_description: "Panel efficiency >20% recommended" },
              { id: 2012, description: "Wind turbine (small-scale)", marks: 3 },
              { id: 2013, description: "Geothermal heat pump", marks: 5 },
              { id: 2014, description: "Biomass system", marks: 2 },
            ],
          },
        ],
      },
      {
        id: 105,
        description: "Energy management system",
        is_compulsory: 0,
        subitems_exist: true,
        marks: 4,
        subitems: [
          { id: 1051, description: "Real-time energy monitoring" },
          { id: 1052, description: "Automated demand response" },
          { id: 1053, description: "Peak load shaving" },
        ],
      },
      {
        id: 106,
        description: "Glazing & fenestration",
        marks: 0,
        is_compulsory: 0,
        selection_groups: [
          {
            id: 301,
            label: "Glazing type",
            selections: [
              { id: 3011, description: "Single glazing", marks: 0 },
              { id: 3012, description: "Double glazing (Low-E)", marks: 3 },
              { id: 3013, description: "Triple glazing (argon-filled)", marks: 5 },
              { id: 3014, description: "None / Not applicable", marks: 0 },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "Water Conservation",
    total_marks: 25,
    items: [
      {
        id: 401,
        description: "Low-flow plumbing fixtures",
        marks: 4,
        is_compulsory: 0,
      },
      {
        id: 402,
        description: "Rainwater harvesting system",
        marks: 5,
        is_compulsory: 0,
      },
      {
        id: 403,
        description: "Greywater recycling",
        is_compulsory: 0,
        subitems_exist: true,
        marks: 6,
        subitems: [
          { id: 4031, description: "Greywater collection tank" },
          { id: 4032, description: "Filtration system" },
          { id: 4033, description: "Distribution pump" },
          { id: 4034, description: "UV treatment unit" },
        ],
      },
      {
        id: 404,
        description: "Water-efficient landscaping",
        marks: 0,
        is_compulsory: 0,
        selection_groups: [
          {
            id: 501,
            label: "Landscape irrigation",
            selections: [
              { id: 5011, description: "Drip irrigation system", marks: 3 },
              { id: 5012, description: "Smart sprinkler controller", marks: 2 },
              { id: 5013, description: "Xeriscaping (no irrigation)", marks: 4 },
              { id: 5014, description: "None / Not applicable", marks: 0 },
            ],
          },
        ],
      },
      {
        id: 405,
        description: "Cooling tower water treatment",
        marks: 0,
        is_compulsory: 0,
        selection_groups: [
          {
            id: 601,
            label: "Treatment method",
            selections: [
              { id: 6011, description: "Chemical treatment", marks: 2 },
              { id: 6012, description: "Non-chemical treatment", marks: 3 },
            ],
          },
          {
            id: 602,
            label: "Water source",
            exclusive: true,
            selections: [
              { id: 6021, description: "Municipal water", marks: 1 },
              { id: 6022, description: "Recycled water", marks: 3 },
              { id: 6023, description: "Captured rainwater", marks: 4 },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "Indoor Environmental Quality",
    total_marks: 20,
    items: [
      {
        id: 701,
        description: "Low-VOC paints & finishes",
        marks: 3,
        is_compulsory: 1,
      },
      {
        id: 702,
        description: "Daylight harvesting controls",
        marks: 4,
        is_compulsory: 0,
      },
      {
        id: 703,
        description: "Acoustic comfort design",
        marks: 3,
        is_compulsory: 0,
        info: "STC ratings for walls and ceiling assemblies must meet minimum thresholds.",
      },
      {
        id: 704,
        description: "Indoor air quality monitoring",
        is_compulsory: 0,
        subitems_exist: true,
        marks: 5,
        subitems: [
          { id: 7041, description: "CO2 sensor network" },
          { id: 7042, description: "PM2.5 monitoring" },
          { id: 7043, description: "VOC sensor" },
          { id: 7044, description: "Humidity & temperature sensors" },
          { id: 7045, description: "Fresh air intake monitoring" },
        ],
      },
      {
        id: 705,
        description: "Thermal comfort control",
        marks: 0,
        is_compulsory: 0,
        option_groups: [
          {
            id: 801,
            label: "Control type",
            options: [
              { id: 8011, description: "Individual zone control", marks: 3 },
              { id: 8012, description: "Occupancy-based control", marks: 4 },
              { id: 8013, description: "Programmable thermostat", marks: 2 },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "Sustainable Materials",
    total_marks: 15,
    items: [
      {
        id: 901,
        description: "Recycled content materials",
        marks: 3,
        is_compulsory: 0,
      },
      {
        id: 902,
        description: "FSC-certified timber",
        marks: 2,
        is_compulsory: 0,
      },
      {
        id: 903,
        description: "Local/regional materials",
        marks: 2,
        is_compulsory: 0,
      },
      {
        id: 904,
        description: "Low-carbon concrete mix",
        marks: 0,
        is_compulsory: 0,
        selection_groups: [
          {
            id: 1001,
            label: "Concrete type",
            selections: [
              { id: 10011, description: "Standard Portland cement", marks: 0 },
              { id: 10012, description: "Fly ash blended (30%)", marks: 2 },
              { id: 10013, description: "Slag cement (50%)", marks: 3 },
              { id: 10014, description: "Carbon-cured concrete", marks: 4 },
            ],
          },
        ],
      },
      {
        id: 905,
        description: "Construction waste management",
        marks: 4,
        is_compulsory: 0,
      },
      {
        id: 906,
        description: "Rapidly renewable materials",
        is_compulsory: 0,
        subitems_exist: true,
        marks: 3,
        subitems: [
          { id: 9061, description: "Bamboo flooring" },
          { id: 9062, description: "Cork wall panels" },
          { id: 9063, description: "Wheatboard cabinetry" },
        ],
      },
    ],
  },
  {
    name: "Site & Ecology",
    total_marks: 10,
    items: [
      {
        id: 1101,
        description: "Brownfield remediation",
        marks: 3,
        is_compulsory: 0,
      },
      {
        id: 1102,
        description: "Stormwater management",
        marks: 3,
        is_compulsory: 0,
      },
      {
        id: 1103,
        description: "Heat island reduction (roof)",
        marks: 0,
        is_compulsory: 0,
        selection_groups: [
          {
            id: 1201,
            label: "Roof type",
            selections: [
              { id: 12011, description: "Cool roof (reflective coating)", marks: 2 },
              { id: 12012, description: "Green roof (extensive)", marks: 4 },
              { id: 12013, description: "Green roof (intensive)", marks: 4 },
              { id: 12014, description: "None / Not applicable", marks: 0 },
            ],
          },
        ],
      },
      {
        id: 1104,
        description: "Native landscaping",
        marks: 2,
        is_compulsory: 0,
      },
    ],
  },
];

/* ════════════════════════════════════════════════════════════════════════════
   Mock selectedProject — predicted answers (checked items, options, etc.)
   ════════════════════════════════════════════════════════════════════════════ */

const MOCK_SELECTED_PROJECT = {
  id: 9999,
  name: "Green Tower KL — Mock Assessment",
  cost_breakdown: {
    "1": {
      id: 1,
      description: "Foundation",
      cost: 450000,
      children: {
        "1-1": { id: 11, description: "Excavation", cost: 120000 },
        "1-2": { id: 12, description: "Concrete works", cost: 180000 },
        "1-3": { id: 13, description: "Reinforcement", cost: 150000 },
      },
    },
    "2": {
      id: 2,
      description: "Structure",
      cost: 920000,
      children: {
        "2-1": { id: 21, description: "Steel frame", cost: 520000 },
        "2-2": { id: 22, description: "Floor slabs", cost: 250000 },
        "2-3": { id: 23, description: "Roof structure", cost: 150000 },
      },
    },
    "3": {
      id: 3,
      description: "MEP services",
      cost: 380000,
      children: {
        "3-1": { id: 31, description: "Electrical", cost: 140000 },
        "3-2": { id: 32, description: "Plumbing", cost: 110000 },
        "3-3": { id: 33, description: "HVAC", cost: 130000 },
      },
    },
    "4": {
      id: 4,
      description: "Finishes",
      cost: 210000,
    },
    "5": {
      id: 5,
      description: "Certification",
      is_certification: true,
      cost: 0,
    },
  },
  // Predicted checked items (baseline)
  checked_items: [101, 102, 103, 401, 403, 404, 701, 702, 703, 901, 902, 903, 1101, 1103],
  // Predicted checked options
  checked_options: {
    "201": [2011, 2013],
    "801": [8012],
  },
  // Predicted selected dropdowns (selections)
  selected_items: {
    "301": 3012,
    "501": 5013,
    "1001": 10013,
    "1201": 12012,
  },
  selectedItems: null,
  // Predicted checked subitems
  checked_subitems: {
    "105": [1051, 1052, 1053],
    "403": [4031, 4032],
    "704": [7041, 7042, 7043],
    "906": [9061, 9062],
  },
  // Predicted custom inputs
  custom_inputs: {
    "105": ["Custom energy audit report", "Tenant sub-metering"],
    "403": ["Backwash filter media"],
  },

  // ── ACTUAL audit data (what was actually observed on site) ──
  actual_checked_items: [101, 102, 103, 401, 404, 701, 702, 703, 901, 903, 1101],
  actual_checked_options: {
    "201": [2011],
    "801": [8011, 8012],
  },
  actual_selected_items: {
    "301": 3013,
    "501": 5013,
    "1001": 10014,
    "1201": 12012,
  },
  actualSelectedItems: null,
  actual_checked_subitems: {
    "105": [1051, 1052],
    "403": [4031, 4032, 4033],
    "704": [7041, 7042],
    "906": [9061, 9063],
  },
  actual_custom_inputs: {
    "105": ["Custom energy audit report"],
    "403": ["Backwash filter media", "UV lamp replacement log"],
  },
};

/* ════════════════════════════════════════════════════════════════════════════
   Mock certification data
   ════════════════════════════════════════════════════════════════════════════ */

const MOCK_CERTIFIED_SCALE_RANGE: Record<string, [number, number]> = {
  "Not Certified": [0, 39],
  Certified: [40, 54],
  Silver: [55, 69],
  Gold: [70, 84],
  Platinum: [85, 100],
};

const MOCK_CERTIFICATION_MULTIPLIERS: Record<string, number> = {
  "Not Certified": 0,
  Certified: 3,
  Silver: 6,
  Gold: 10,
  Platinum: 15,
};

/* ════════════════════════════════════════════════════════════════════════════
   Mock page
   ════════════════════════════════════════════════════════════════════════════ */

export default function ActualGBIMockPage() {
  const [selectedProject, setSelectedProject] = useState<any>(MOCK_SELECTED_PROJECT);
  const [marksData, setMarksData] = useState<any>(null);
  const [showCostUpdatedToast, setShowCostUpdatedToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const auditSubmitRef = useRef<(() => Promise<boolean>) | null>(null);

  const predictedTotal = marksData?.predicted ?? 0;
  const actualTotal = marksData?.actual ?? 0;
  const totalAvailable = marksData?.total ?? 0;

  const predictedPct = totalAvailable > 0
    ? Math.min(Math.round((predictedTotal / totalAvailable) * 100), 100)
    : 0;
  const actualPct = totalAvailable > 0
    ? Math.min(Math.round((actualTotal / totalAvailable) * 100), 100)
    : 0;

  const handleApplyMultiplier = useCallback(
    (payload: any, options?: { suppressToast?: boolean }) => {
      if (!options?.suppressToast) {
        setToastMessage(
          `Cost updated: ${payload.certLevel} (${payload.multiplierPercent}%) = RM ${payload.multiplierCost.toLocaleString()}`,
        );
        setShowCostUpdatedToast(true);
        setTimeout(() => setShowCostUpdatedToast(false), 4000);
      }
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    if (!auditSubmitRef.current) return;
    const success = await auditSubmitRef.current();
    if (success) {
      setToastMessage("Audit changes submitted successfully");
      setShowCostUpdatedToast(true);
      setUnsavedChanges(false);
      setTimeout(() => setShowCostUpdatedToast(false), 4000);
    } else {
      setToastMessage("Failed to submit audit changes");
      setShowCostUpdatedToast(true);
      setTimeout(() => setShowCostUpdatedToast(false), 4000);
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#F6F6F2]">
      {/* ── Header ── */}
      <div className="border-b border-[#E4E1D8] bg-white px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#8A938C]">
              Mock — Actual GBI Assessment
            </p>
            <h1 className="font-display text-xl font-bold tracking-[-0.01em] text-[#1C1F1D]">
              {selectedProject?.name ?? "Unknown Project"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#8A938C]">
                Predicted
              </p>
              <p className="font-mono text-lg font-bold text-[#1C1F1D]/70">
                {predictedTotal} / {totalAvailable}
                <span className="ml-1 text-sm font-normal text-[#8A938C]">
                  ({predictedPct}%)
                </span>
              </p>
            </div>
            <div className="h-8 w-px bg-[#E4E1D8]" />
            <div className="text-right">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#3E6B52]">
                Actual
              </p>
              <p className="font-mono text-lg font-bold text-[#3E6B52]">
                {actualTotal} / {totalAvailable}
                <span className="ml-1 text-sm font-normal text-[#8A938C]">
                  ({actualPct}%)
                </span>
              </p>
            </div>
            <div className="h-8 w-px bg-[#E4E1D8]" />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!unsavedChanges}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-150 ${
                unsavedChanges
                  ? "bg-[#3E6B52] shadow-[0_2px_8px_rgba(62,107,82,0.25)] hover:bg-[#2D5A42]"
                  : "bg-[#B7BEB8] cursor-not-allowed"
              }`}
            >
              {unsavedChanges ? "Submit Audit Changes" : "No Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Score comparison cards ── */}
      <div className="grid grid-cols-3 gap-4 px-8 pt-6">
        <div className="rounded-2xl border border-[#E4E1D8] bg-white p-5 shadow-[0_1px_2px_rgba(30,38,33,0.04)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8A938C]">
            Certification Level
          </p>
          <p className="mt-1 font-serif text-2xl font-semibold text-[#1C1F1D]">
            {marksData?.predictedPct !== undefined
              ? predictedPct >= 85
                ? "Platinum"
                : predictedPct >= 70
                  ? "Gold"
                  : predictedPct >= 55
                    ? "Silver"
                    : predictedPct >= 40
                      ? "Certified"
                      : "Not Certified"
              : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-[#E4E1D8] bg-white p-5 shadow-[0_1px_2px_rgba(30,38,33,0.04)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8A938C]">
            Predicted Score
          </p>
          <p className="mt-1 font-serif text-2xl font-semibold text-[#1C1F1D]/70">
            {predictedTotal}
            <span className="ml-1.5 font-mono text-sm font-medium text-[#8A938C]">
              / {totalAvailable}
            </span>
          </p>
        </div>
        <div className="rounded-2xl border border-[#E4E1D8] bg-[#F0F7F3] p-5 shadow-[0_1px_2px_rgba(30,38,33,0.04)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#3E6B52]">
            Actual Score
          </p>
          <p className="mt-1 font-serif text-2xl font-semibold text-[#3E6B52]">
            {actualTotal}
            <span className="ml-1.5 font-mono text-sm font-medium text-[#8A938C]">
              / {totalAvailable}
            </span>
          </p>
        </div>
      </div>

      {/* ── Main component ── */}
      <div className="flex-1 px-8 py-6">
        <ActualGBIAssessment
          greenElements={MOCK_GREEN_ELEMENTS}
          selectedProject={selectedProject}
          setSelectedProject={setSelectedProject}
          setMarksData={setMarksData}
          showCostUpdatedToast={showCostUpdatedToast}
          onAuditSubmitRef={auditSubmitRef}
          hideSubmitButton={true}
          certifiedScaleRange={MOCK_CERTIFIED_SCALE_RANGE}
          certificationMultipliers={MOCK_CERTIFICATION_MULTIPLIERS}
          onApplyMultiplier={handleApplyMultiplier}
          onAuditUnsavedChange={setUnsavedChanges}
        />
      </div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {showCostUpdatedToast && (
          <motion.div
            className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center gap-2.5 rounded-full bg-[#1E2621] px-5 py-3 text-[13px] font-medium text-white shadow-lg">
              <Check size={14} className="text-[#C08A3E]" />
              {toastMessage}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
