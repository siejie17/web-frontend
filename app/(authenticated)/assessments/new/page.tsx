"use client";

/**
 * ProFormaX — New Assessment
 * ---------------------------------------------------------------
 * Next.js App Router page: app/(authenticated)/assessments/new/page.tsx
 *
 * This page now renders under app/(authenticated)/layout.tsx, which
 * owns the header, page background, font variables, and outer <main>
 * landmark. Accordingly this file:
 *   - has no <main> of its own (avoids two <main> landmarks per page)
 *   - has no min-h-screen / bg / font-variable wrapper (layout owns it)
 *   - keeps its own vertical rhythm (pt/pb) but not horizontal padding,
 *     since the layout's <main> already applies px-10
 *   - replaces the standalone "back" icon button with a breadcrumb,
 *     since a lone back-arrow duplicates browser/header navigation
 *     once there's a persistent header above it
 *   - bumps the AI assistant modal to z-50 so it reliably sits above
 *     the layout's sticky (z-40) header
 * ---------------------------------------------------------------
 */

import { useEffect, useRef, useState, useId } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Check,
  ChevronLeft,
  AlertTriangle,
  ArrowRight,
  X,
} from "lucide-react";
import { FormInputs } from "@/types/form";
import { BackButton } from "@/components/ui/BackButton";

const currentYear = new Date().getFullYear();
const YEAR_LIST = Array.from({ length: 6 }, (_, i) => String(currentYear + i));

const CERT_TIERS = ["Not Certified", "Certified", "Silver", "Gold", "Platinum"] as const;

type Errors = Record<string, string>;

/* ---------------- Page ---------------- */

export default function NewAssessmentPage() {
  const router = useRouter();

  const [formInputs, setFormInputs] = useState<FormInputs>();

  const [loading, setLoading] = useState(true);

  const [projectName, setProjectName] = useState("");

  const [buildingType, setBuildingType] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [classification, setClassification] = useState<string | null>(null);
  const [managementOption, setManagementOption] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [structure, setStructure] = useState<string | null>(null);
  const [ratingScale, setRatingScale] = useState<string | null>(null);

  const [buildingSizeDisplay, setBuildingSizeDisplay] = useState("");
  const [budgetDisplay, setBudgetDisplay] = useState("");

  const [openField, setOpenField] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [hint, setHint] = useState<{ field: string; message: string } | null>(
    null,
  );
  const [submitted, setSubmitted] = useState(false);
  const [showNotCertModal, setShowNotCertModal] = useState(false);
  const pendingSubmitRef = useRef<(() => Promise<void>) | null>(null);
  const successRef = useRef<HTMLDivElement>(null);

  // close any open dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-field-name]")) setOpenField(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const fetchFormInputs = async () => {
      try {
        const res = await fetch("/api/assessment/form-inputs");

        const data = await res.json().catch(() => null);

        setFormInputs(data);
      } catch (error) {
        console.error("Error fetching form inputs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFormInputs();
  }, []);

  const clearError = (field: string) =>
    setErrors((prev) => ({ ...prev, [field]: "" }));

  const flashHint = (field: string, message: string) => {
    setHint({ field, message });
  };
  const dismissHint = (field: string) => {
    setHint((h) => (h?.field === field ? null : h));
  };

  /* ---- derived / conditional data ---- */

  const classificationOptions = buildingType
    ? formInputs?.classifications[buildingType].map((c) => c.name) || []
    : [];
  const hasClassifications = classificationOptions.length > 0;

  const filteredClassifications =
    category === "Apartments"
      ? classificationOptions.filter((c) => c !== "Landed")
      : category
        ? classificationOptions.filter((c) => c === "Landed")
        : classificationOptions;

  const managementOptions =
    classification === "Landed" ? ["No"] : classification ? ["Yes", "No"] : [];

  const showRegion = state === "Sabah" || state === "Sarawak";
  const regionOptions = showRegion
    ? formInputs?.regions[state as string] || []
    : [];

  const regionKey =
    buildingType === "Residential New Construction (RNC)"
      ? "ALL"
      : state === "Sabah" || state === "Sarawak"
        ? state.toUpperCase()
        : "SMSIA";

  const structureOptions =
    buildingType && state
      ? formInputs?.structures[buildingType]?.[regionKey] || []
      : [];

  const ratingScaleOptions = buildingType
    ? Object.keys(formInputs?.ratingScales[buildingType] || [])
    : [];

  /* ---- progress ---- */

  const requiredTotal = 9 + (hasClassifications ? 2 : 0) + (showRegion ? 1 : 0);
  const requiredDone =
    [
      projectName.trim() !== "",
      !!buildingType,
      !!category,
      !!year,
      buildingSizeDisplay !== "" && parseFloat(buildingSizeDisplay) > 0,
      parseFloat(budgetDisplay) > 0,
      !!state,
      !!structure,
      !!ratingScale,
    ].filter(Boolean).length +
    (hasClassifications
      ? [!!classification, !!managementOption].filter(Boolean).length
      : 0) +
    (showRegion ? (region ? 1 : 0) : 0);

  const isComplete = requiredDone === requiredTotal;
  const progressPct =
    requiredTotal > 0 ? Math.round((requiredDone / requiredTotal) * 100) : 0;

  /* ---- input formatting helpers ---- */

  const formatThousands = (v: string) => {
    if (!v) return "";
    const [int, dec] = v.split(".");
    const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return dec !== undefined ? `${withCommas}.${dec}` : withCommas;
  };

  const handleSizeChange = (text: string) => {
    clearError("buildingSize");
    let sanitized = text.replace(/[^0-9.]/g, "");
    const parts = sanitized.split(".");
    if (parts.length > 2) sanitized = `${parts[0]}.${parts[1]}`;
    setBuildingSizeDisplay(sanitized);
  };

  const handleSizeBlur = () => {
    if (!buildingSizeDisplay || parseFloat(buildingSizeDisplay) <= 0) {
      setErrors((prev) => ({
        ...prev,
        buildingSize: "Please enter a valid building size",
      }));
    }
  };

  const formatCurrency = (digits: string) => {
    const d = digits.replace(/^0+/, "");
    if (d.length === 0) return "";
    if (d.length === 1) return `0.0${d}`;
    if (d.length === 2) return `0.${d}`;
    const int = d.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${int}.${d.slice(-2)}`;
  };

  const handleBudgetChange = (text: string) => {
    clearError("projectBudget");
    setBudgetDisplay(formatCurrency(text.replace(/[^0-9]/g, "")));
  };

  const handleProjectNameBlur = () => {
    if (!projectName.trim()) {
      setErrors((prev) => ({
        ...prev,
        projectName: "Please enter a project name",
      }));
    }
  };

  /* ---- submit ---- */

  const runAssessment = async () => {
    const data = {
      projectName: projectName.trim(),
      buildingType,
      category,
      buildingClassification: classification || null,
      has_management: managementOption || null,
      year,
      buildingSize: parseFloat(buildingSizeDisplay),
      projectBudget: budgetDisplay
        ? parseFloat(budgetDisplay.replace(/,/g, ""))
        : null,
      state,
      region: region || null,
      structure,
      certifiedRatingScale: ratingScale,
      costPreviewWay: "Detailed"
    };

    const res = await fetch("/api/assessment/results", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await res.json().catch(() => null);

    if (result) {
      localStorage.setItem("assessment_result", JSON.stringify(result));
      router.push("/assessments/new/results");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const next: Errors = {};
    if (!projectName.trim()) next.projectName = "Please enter a project name";
    if (!buildingType) next.buildingType = "Please select a building type";
    if (!category) next.category = "Please select a building category";
    if (hasClassifications) {
      if (!classification)
        next.classification = "Please select a building classification";
      if (!managementOption)
        next.managementOption = "Please select a management option";
    }
    if (!year) next.year = "Please select a year";
    if (!buildingSizeDisplay || parseFloat(buildingSizeDisplay) <= 0)
      next.buildingSize = "Please enter a valid building size";
    if (!state) next.state = "Please select a state";
    if (showRegion && !region) next.region = "Please select a region";
    if (!structure) next.structure = "Please select a structure";
    if (!ratingScale) next.ratingScale = "Please select a rating scale";

    setErrors(next);
    const ok = Object.values(next).every((v) => !v);
    setSubmitted(ok);

    if (ok) {
      const isNotCert = ratingScale?.toLowerCase().includes("not certified");
      if (isNotCert) {
        setShowNotCertModal(true);
        return;
      }
      await runAssessment();
    } else {
      const firstErrorField = Object.keys(next).find((k) => next[k]);
      if (firstErrorField) {
        const el = document.querySelector(
          `[data-field-name="${firstErrorField}"], [data-error-anchor="${firstErrorField}"]`,
        );
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  const handleNotCertConfirm = async () => {
    setShowNotCertModal(false);
    await runAssessment();
  };

  return (
    <>
    <div className="mx-auto max-w-275 pb-10 pt-6">
      <BackButton
        text="Dashboard"
        redirect="/dashboard"
      />

      {/* ---------------- Intro ---------------- */}
      <section className="mb-8 rounded-3xl border border-[#E4E1D8] bg-[#FCFCF8] p-6 shadow-[0_8px_24px_rgba(30,38,33,0.04)] sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p
              className="mb-3 text-[12px] uppercase tracking-[0.08em] text-[#7C8880]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              New assessment
            </p>
            <h1
              className="text-[30px] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[32px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Green Building Scores Calculator
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-[#5B655F]">
              Estimate your project&apos;s performance against the standards for
              its green building and cost optimisation compliance.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- Form shell ---------------- */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="relative mb-5 rounded-3xl border border-[#E4E1D8] bg-white shadow-[0_8px_24px_rgba(30,38,33,0.05)]"
      >
        <div className="overflow-hidden rounded-t-3xl">
          {/* Progress header */}
          <div className="border-b border-[#EFEDE6] bg-[#FBFAF7] px-7 py-4 sm:px-9">
            <div className="flex items-center justify-between">
              <span
                className="text-[12px] uppercase tracking-[0.08em] text-[#7C8880]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Project details
              </span>
              {!loading && (
                <span
                  className="text-[12px] text-[#8A938C]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {requiredDone}/{requiredTotal} Completed
                </span>
              )}
            </div>
            {!loading && (
              <div
                className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-[#EFEDE6]"
                role="progressbar"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Form completion"
              >
                <div
                  className="h-full rounded-full bg-[#3E6B52] transition-all duration-300 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="px-7 py-8 sm:px-9 sm:py-9">
          {loading ? (
            <FormSkeleton />
          ) : (
            <>
              <FormSection
                title="The Basics"
                description="Name the project and tell us what you're building."
              >
                <TextField
                  name="projectName"
                  label="Project Name"
                  placeholder="Enter project name"
                  value={projectName}
                  onChange={(v) => {
                    setProjectName(v);
                    clearError("projectName");
                  }}
                  onBlur={handleProjectNameBlur}
                  error={errors.projectName}
                />

                <SelectField
                  name="buildingType"
                  label="Building Type"
                  placeholder="Select building type"
                  value={buildingType}
                  options={formInputs?.buildingTypes}
                  openField={openField}
                  setOpenField={setOpenField}
                  error={errors.buildingType}
                  onSelect={(v) => {
                    setBuildingType(v);
                    setCategory(null);
                    setClassification(null);
                    setManagementOption(null);
                    setStructure(null);
                    setRatingScale(null);
                    clearError("buildingType");
                  }}
                />

                <SelectField
                  name="category"
                  label="Building Category"
                  placeholder={
                    buildingType
                      ? "Select building category"
                      : "Please select building type first"
                  }
                  value={category}
                  options={
                    buildingType
                      ? formInputs?.categories[buildingType] || []
                      : []
                  }
                  disabled={!buildingType}
                  onDisabledPress={() =>
                    !buildingType &&
                    flashHint("category", "Please select a building type first")
                  }
                  openField={openField}
                  setOpenField={setOpenField}
                  error={errors.category}
                  hint={hint?.field === "category" ? hint.message : undefined}
                  onDismissHint={() => dismissHint("category")}
                  onSelect={(v) => {
                    setCategory(v);
                    clearError("category");
                  }}
                />

                {hasClassifications && (
                  <>
                    <SelectField
                      name="classification"
                      label="Building Classification"
                      placeholder={
                        filteredClassifications.length > 0
                          ? "Select building classification"
                          : "No classification available for this category"
                      }
                      value={classification}
                      options={filteredClassifications}
                      disabled={filteredClassifications.length === 0}
                      openField={openField}
                      setOpenField={setOpenField}
                      error={errors.classification}
                      onSelect={(v) => {
                        setClassification(v);
                        setManagementOption(null);
                        clearError("classification");
                        clearError("managementOption");
                      }}
                    />

                    <SelectField
                      name="managementOption"
                      label="Existence of Common Management"
                      placeholder="Select management option"
                      value={managementOption}
                      options={managementOptions}
                      disabled={!classification}
                      onDisabledPress={() =>
                        !classification &&
                        flashHint(
                          "managementOption",
                          "Please select a building classification first",
                        )
                      }
                      openField={openField}
                      setOpenField={setOpenField}
                      error={errors.managementOption}
                      hint={
                        hint?.field === "managementOption"
                          ? hint.message
                          : undefined
                      }
                      onDismissHint={() => dismissHint("managementOption")}
                      onSelect={(v) => {
                        setManagementOption(v);
                        clearError("managementOption");
                      }}
                      isLastInSection
                    />
                  </>
                )}
              </FormSection>

              <FormSection
                title="Scale & Timing"
                description="Size, budget, and when the project breaks ground."
              >
                <TextField
                  name="buildingSize"
                  label="Project/Building Size (m²)"
                  placeholder="Enter project/building size"
                  value={formatThousands(buildingSizeDisplay)}
                  onChange={handleSizeChange}
                  onBlur={handleSizeBlur}
                  error={errors.buildingSize}
                  inputMode="decimal"
                />

                <TextField
                  name="projectBudget"
                  label="Project/Building Budget"
                  placeholder="Enter budget or leave empty"
                  value={budgetDisplay}
                  onChange={handleBudgetChange}
                  error={errors.projectBudget}
                  inputMode="numeric"
                  required={false}
                  prefix="RM"
                />

                <SelectField
                  name="year"
                  label="Year of Proposed Project/Building"
                  placeholder="Select year of proposed project"
                  value={year}
                  options={YEAR_LIST}
                  openField={openField}
                  setOpenField={setOpenField}
                  error={errors.year}
                  onSelect={(v) => {
                    setYear(v);
                    clearError("year");
                  }}
                  isLastInSection
                />
              </FormSection>

              <FormSection
                title="Location & Structure"
                description="Where the site sits and how it's built."
              >
                <SelectField
                  name="state"
                  label="State"
                  placeholder="Select state"
                  value={state}
                  options={formInputs?.states || []}
                  openField={openField}
                  setOpenField={setOpenField}
                  error={errors.state}
                  onSelect={(v) => {
                    setState(v);
                    setRegion(null);
                    setStructure(null);
                    clearError("state");
                  }}
                />

                {showRegion && (
                  <SelectField
                    name="region"
                    label="Region"
                    placeholder="Select region"
                    value={region}
                    options={regionOptions}
                    openField={openField}
                    setOpenField={setOpenField}
                    error={errors.region}
                    onSelect={(v) => {
                      setRegion(v);
                      clearError("region");
                    }}
                  />
                )}

                <SelectField
                  name="structure"
                  label="Structure"
                  placeholder={
                    !buildingType || !state
                      ? "Please select building type and state first"
                      : "Select structure"
                  }
                  value={structure}
                  options={structureOptions}
                  disabled={!buildingType || !state}
                  onDisabledPress={() => {
                    if (!buildingType && !state)
                      flashHint(
                        "structure",
                        "Please select building type and state first",
                      );
                    else if (!buildingType)
                      flashHint(
                        "structure",
                        "Please select building type first",
                      );
                    else if (!state)
                      flashHint("structure", "Please select state first");
                  }}
                  openField={openField}
                  setOpenField={setOpenField}
                  error={errors.structure}
                  hint={hint?.field === "structure" ? hint.message : undefined}
                  onDismissHint={() => dismissHint("structure")}
                  onSelect={(v) => {
                    setStructure(v);
                    clearError("structure");
                  }}
                  isLastInSection
                />
              </FormSection>

              <FormSection
                title="Certification Target"
                description="The rating scale you're aiming to be assessed against."
                noBorder
              >
                <SelectField
                  name="ratingScale"
                  label="Target Certified Rating Scale"
                  placeholder={
                    buildingType
                      ? "Select target certified rating scale"
                      : "Please select building type first"
                  }
                  value={ratingScale}
                  options={ratingScaleOptions}
                  disabled={!buildingType}
                  onDisabledPress={() =>
                    !buildingType &&
                    flashHint(
                      "ratingScale",
                      "Please select a building type first",
                    )
                  }
                  openField={openField}
                  setOpenField={setOpenField}
                  error={errors.ratingScale}
                  hint={
                    hint?.field === "ratingScale" ? hint.message : undefined
                  }
                  onDismissHint={() => dismissHint("ratingScale")}
                  onSelect={(v) => {
                    setRatingScale(v);
                    clearError("ratingScale");
                  }}
                  isLastInSection
                />
              </FormSection>

              <div className="mt-6 flex flex-col items-center gap-3 border-t border-[#EFEDE6] pt-7 sm:flex-row sm:justify-between">
                <p className="text-[12.5px] text-[#8A938C]" />
                <button
                  type="submit"
                  className={`w-full rounded-full py-3.5 text-[14.5px] font-semibold shadow-[0_12px_28px_rgba(62,107,82,0.24)] transition-all focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52] sm:w-auto sm:px-10 ${
                    isComplete
                      ? "bg-[#3E6B52] text-[#F6F6F2] hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(62,107,82,0.30)]"
                      : "bg-[#3E6B52]/90 text-[#F6F6F2]/90 hover:-translate-y-0.5"
                  }`}
                >
                  Run assessment
                </button>
              </div>
            </>
          )}
        </div>
      </form>
    </div>

    {/* ── Not Certified confirmation modal ── */}
    {showNotCertModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E2621]/50 p-4 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
        onClick={() => setShowNotCertModal(false)}
      >
        <div
          className="relative w-full max-w-sm overflow-hidden rounded-[28px] border border-[#EDEAE1] bg-white shadow-[0_32px_64px_-12px_rgba(30,38,33,0.28)] animate-[riseIn_0.28s_cubic-bezier(0.16,1,0.3,1)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Ambient top glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[120%] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
            style={{
              background: "radial-gradient(closest-side, rgba(192,138,62,0.20), transparent)",
            }}
          />

          <button
            type="button"
            onClick={() => setShowNotCertModal(false)}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-[#9BA39C] transition-colors hover:bg-[#F6F6F2] hover:text-[#5B655F]"
          >
            <X size={16} />
          </button>

          <div className="relative px-7 pb-7 pt-8">
            {/* Icon badge */}
            <div className="mb-5 flex justify-center">
              <div className="relative flex h-14 w-14 items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-[#FFF1E0]" />
                <span className="absolute inset-0 animate-[pulseRing_2.4s_ease-out_infinite] rounded-full ring-2 ring-[#EFC98A]" />
                <AlertTriangle size={22} className="relative text-[#C08A3E]" strokeWidth={2} />
              </div>
            </div>

            {/* Header */}
            <div className="text-center">
              <h3
                id="not-cert-modal-title"
                className="text-[17px] font-semibold tracking-tight text-[#1E2621]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Not Certified option selected
              </h3>
              <p className="mx-auto mt-2 max-w-[280px] text-[13.5px] leading-relaxed text-[#5B655F]">
                Your project will skip Green Building Index assessment and won&apos;t
                carry a verified green credential.
              </p>
            </div>

            {/* Tier ladder */}
            <div className="mt-6 rounded-2xl border border-[#EDEAE1] bg-[#FAFAF7] px-4 py-4">
              <div className="flex items-center justify-between gap-1.5">
                {CERT_TIERS.map((tier, i) => {
                  const active = tier === "Not Certified";
                  return (
                    <div key={tier} className="flex flex-1 items-center gap-1.5">
                      <div className="flex flex-1 flex-col items-center gap-1.5">
                        <span
                          className={`h-2 w-full rounded-full transition-colors ${
                            active ? "bg-[#C08A3E]" : "bg-[#E4E1D8]"
                          }`}
                        />
                        <span
                          className={`text-center text-[9.5px] font-medium leading-tight ${
                            active ? "text-[#B8935B]" : "text-[#9BA39C]"
                          }`}
                        >
                          {tier}
                        </span>
                      </div>
                      {i < CERT_TIERS.length - 1 && (
                        <ArrowRight
                          size={10}
                          strokeWidth={2.5}
                          className="mb-4 shrink-0 text-[#D8D4C8]"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-center text-[12px] leading-relaxed text-[#5B655F]">
                Consider targeting at least{" "}
                <span className="font-semibold text-[#B8935B]">Certified</span> {" "}to
                showcase your project&apos;s green credentials.
              </p>
            </div>

            <p className="mt-5 text-center text-[13px] leading-relaxed text-[#5B655F]">
              Proceed with{" "}
              <span className="font-semibold text-[#1E2621]">Not Certified</span>{" "}
              anyway?
            </p>

            {/* Actions */}
            <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowNotCertModal(false)}
                className="flex-1 rounded-full border border-[#E4E1D8] bg-white px-4 py-3 text-[13px] font-semibold text-[#5B655F] transition-all hover:border-[#D8D4C8] hover:bg-[#F6F6F2] active:scale-[0.98]"
              >
                Let me change it
              </button>
              <button
                type="button"
                onClick={handleNotCertConfirm}
                className="flex-1 rounded-full bg-gradient-to-b from-[#CC9752] to-[#B8823A] px-4 py-3 text-[13px] font-semibold text-white shadow-[0_10px_24px_rgba(192,138,62,0.32)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(192,138,62,0.40)] active:translate-y-0 active:scale-[0.98]"
              >
                Yes, proceed
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

/* ---------------- Form section wrapper ---------------- */

function FormSection({
  title,
  description,
  children,
  noBorder,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  noBorder?: boolean;
}) {
  return (
    <div className={`mb-8 pb-8 ${noBorder ? "" : "border-b border-[#EFEDE6]"}`}>
      <div className="mb-4">
        <h2
          className="text-[15px] font-semibold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#8A938C]">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

/* ---------------- Required marker ---------------- */

function RequiredMark() {
  return (
    <span className="text-[#B4483C]" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

/* ---------------- Text field ---------------- */

function TextField({
  name,
  label,
  value,
  placeholder,
  onChange,
  onBlur,
  error,
  inputMode,
  required = true,
  prefix,
}: {
  name: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  inputMode?: "text" | "decimal" | "numeric";
  required?: boolean;
  prefix?: string;
}) {
  const errorId = useId();

  return (
    <div data-field-name={label} className="space-y-0">
      <label
        htmlFor={name}
        className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-medium text-[#5B655F]"
      >
        {label}
        {required && <RequiredMark />}
        {!required && (
          <span
            className="rounded-full bg-[#F6F6F2] px-1.5 py-0.5 text-[10.5px] font-normal text-[#8A938C]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            optional
          </span>
        )}
      </label>
      <div className="relative">
        {prefix && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[14px] text-[#8A938C]"
          >
            {prefix}
          </span>
        )}
        <input
          id={name}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          inputMode={inputMode}
          required={required}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`w-full rounded-[14px] border bg-white py-2.75 text-[14px] text-[#1E2621] placeholder:text-[#B7BEB8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#3E6B52]/25 ${
            prefix ? "pl-12 pr-4" : "px-4"
          } ${
            error
              ? "border-[#E7B7AF] focus:ring-[#B4483C]/20"
              : "border-[#E4E1D8] hover:border-[#C9D3CC]"
          }`}
        />
      </div>
      {error && <FieldError id={errorId} message={error} />}
    </div>
  );
}

/* ---------------- Select field (accessible listbox) ---------------- */

function SelectField({
  name,
  label,
  value,
  placeholder,
  options,
  disabled,
  onDisabledPress,
  openField,
  setOpenField,
  onSelect,
  error,
  hint,
  onDismissHint,
  required = true,
  isLastInSection = false,
}: {
  name: string;
  label: string;
  value: string | null;
  placeholder: string;
  options: string[] | undefined;
  disabled?: boolean;
  onDisabledPress?: () => void;
  openField: string | null;
  setOpenField: (v: string | null) => void;
  onSelect: (v: string) => void;
  error?: string;
  hint?: string;
  onDismissHint?: () => void;
  required?: boolean;
  isLastInSection?: boolean;
}) {
  const safeOptions = options || [];

  const isOpen = openField === name;
  const [activeIndex, setActiveIndex] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const typeaheadRef = useRef({
    query: "",
    timer: 0 as unknown as ReturnType<typeof setTimeout>,
  });

  const buttonId = useId();
  const listboxId = useId();
  const errorId = useId();
  const hintId = useId();

  const openList = () => {
    if (disabled) {
      onDisabledPress?.();
      return;
    }
    const idx = value ? Math.max(safeOptions.indexOf(value), 0) : 0;
    setActiveIndex(idx);
    setOpenField(name);
  };

  const closeList = (returnFocus = true) => {
    setOpenField(null);
    if (returnFocus) buttonRef.current?.focus();
  };

  const commitSelection = (opt: string) => {
    onSelect(opt);
    closeList();
  };

  useEffect(() => {
    if (isOpen) {
      optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [isOpen, activeIndex]);

  const handleButtonKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      if (!isOpen) openList();
    } else if (e.key === "Escape") {
      closeList(false);
    }
  };

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    const safeOptions = options || [];

    if (safeOptions.length === 0) {
      if (e.key === "Escape") closeList();
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, safeOptions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(safeOptions.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commitSelection(safeOptions[activeIndex]);
        break;
      case "Escape":
        e.preventDefault();
        closeList();
        break;
      case "Tab":
        closeList(false);
        break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) {
          const ta = typeaheadRef.current;
          clearTimeout(ta.timer);
          ta.query += e.key.toLowerCase();
          const match = safeOptions.findIndex((o) =>
            o.toLowerCase().startsWith(ta.query),
          );
          if (match >= 0) setActiveIndex(match);
          ta.timer = setTimeout(() => {
            ta.query = "";
          }, 500);
        }
    }
  };

  return (
    <div data-field-name={name}>
      <label
        id={buttonId + "-label"}
        htmlFor={buttonId}
        className="mb-1.5 block text-[12.5px] font-medium text-[#5B655F]"
      >
        {label}
        {required && <RequiredMark />}
      </label>
      <div className="relative">
        <button
          id={buttonId}
          ref={buttonRef}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-invalid={!!error}
          aria-describedby={
            [error ? errorId : null, hint ? hintId : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          disabled={disabled}
          onClick={() => (isOpen ? closeList() : openList())}
          onKeyDown={handleButtonKeyDown}
          className={`flex w-full items-center justify-between rounded-[14px] border px-4 py-2.75 text-left text-[14px] transition-colors ${
            disabled
              ? "cursor-not-allowed border-[#E4E1D8] bg-[#F6F6F2] text-[#B7BEB8]"
              : error
                ? "border-[#E7B7AF] bg-white text-[#1E2621] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#B4483C]"
                : `bg-white text-[#1E2621] hover:border-[#C9D3CC] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52] ${
                    isOpen ? "border-[#3E6B52]" : "border-[#E4E1D8]"
                  }`
          }`}
        >
          <span className={value ? "" : "text-[#B7BEB8]"}>
            {value || placeholder}
          </span>
          <ChevronDown
            size={16}
            className={`shrink-0 text-[#8A938C] transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div
            id={listboxId}
            ref={listRef}
            role="listbox"
            aria-labelledby={buttonId + "-label"}
            aria-activedescendant={
              safeOptions.length > 0
                ? `${listboxId}-opt-${activeIndex}`
                : undefined
            }
            tabIndex={-1}
            onKeyDown={handleListKeyDown}
            autoFocus
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-64 overflow-y-auto rounded-[14px] border border-[#E4E1D8] bg-white py-1.5 shadow-[0_16px_36px_rgba(30,38,33,0.12)] focus:outline-none"
          >
            {safeOptions.length === 0 ? (
              <div className="px-4 py-3 text-[13px] text-[#B7BEB8]">
                No options available
              </div>
            ) : (
              safeOptions.map((opt, idx) => (
                <button
                  key={opt}
                  id={`${listboxId}-opt-${idx}`}
                  ref={(el) => {
                    optionRefs.current[idx] = el;
                  }}
                  type="button"
                  role="option"
                  aria-selected={opt === value}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => commitSelection(opt)}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[13.5px] transition-colors ${
                    idx === activeIndex ? "bg-[#F6F6F2]" : ""
                  } ${opt === value ? "font-medium text-[#3E6B52]" : "text-[#1E2621]"}`}
                >
                  {opt}
                  {opt === value && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#3E6B52]" />
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {error && <FieldError id={errorId} message={error} />}
      {!error && hint && (
        <FieldHint id={hintId} message={hint} onDismiss={onDismissHint} />
      )}
    </div>
  );
}

function FieldError({ id, message }: { id?: string; message: string }) {
  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[#B4483C]"
    >
      <AlertCircle size={12} className="shrink-0" />
      {message}
    </p>
  );
}

function FieldHint({
  id,
  message,
  onDismiss,
}: {
  id?: string;
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <p
      id={id}
      aria-live="polite"
      className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[#C08A3E]"
    >
      <AlertCircle size={12} className="shrink-0" />
      {message}
    </p>
  );
}

/* ---------------- Loading skeleton ---------------- */

function FormSkeleton() {
  return (
    <div className="space-y-8">
      <p className="text-[13px] leading-relaxed text-[#8A938C]">
        Loading form inputs…
      </p>
      {[0, 1, 2].map((section) => (
        <div key={section} className="space-y-4">
          <div>
            <span className="mb-2 block h-3.5 w-24 animate-pulse rounded-full bg-[#EFEDE6]" />
            <span className="block h-3 w-36 animate-pulse rounded-full bg-[#F6F6F2]" />
          </div>
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <div key={i}>
                <span className="mb-1.5 block h-3 w-32 animate-pulse rounded-full bg-[#EFEDE6]" />
                <span className="block h-11 w-full animate-pulse rounded-[14px] bg-[#F6F6F2]" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
