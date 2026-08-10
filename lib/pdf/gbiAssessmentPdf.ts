import type { PdfProjectDetails } from "@/lib/pdf/costBreakdownPdf";

/* ---------------- Public types ---------------- */

/** Raw CMS green-elements criterion shape (mirrors ActualGBIAssessment). */
export type GbiCriterion = {
  name?: string;
  total_marks?: number;
  items?: any[];
  subcriteria?: Array<{ name?: string; items?: any[] }>;
};

/** Predicted & actual answer maps taken from the selected project payload. */
export type GbiAnswers = {
  checked_items?: number[] | Record<string, unknown>;
  checked_options?: Record<string, number[]>;
  checked_subitems?: Record<string, number[]>;
  selected_items?: Record<string, number>;
  custom_inputs?: Record<string, string[]>;
  actual_checked_items?: number[] | Record<string, unknown>;
  actual_checked_options?: Record<string, number[]>;
  actual_checked_subitems?: Record<string, number[]>;
  actual_selected_items?: Record<string, number>;
  actual_custom_inputs?: Record<string, string[]>;
};

export type GbiPdfInput = {
  project: PdfProjectDetails;
  criteria?: (GbiCriterion | string)[];
  answers?: GbiAnswers;
  generatedAt?: Date;
};

/* ---------------- Value helpers ---------------- */

function safeText(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u00a0\u202f]/g, " ")
    .replace(/[^\x00-\xff]/g, "");
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function fmtValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function fmtSize(value: unknown): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return `${n.toLocaleString("en-US")} m²`;
}

/* ---------------- Answer normalisation ---------------- */

function toIdArray(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map(Number).filter((n) => Number.isFinite(n));
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .map(Number)
      .filter((n) => Number.isFinite(n));
  }
  return [];
}

/** Predicted & actual state for a single item, mirroring the UI marks logic. */
function buildItemState(
  item: any,
  a: Required<GbiAnswers>,
): {
  kind: "checkbox" | "options" | "selection" | "subitems";
  predictedChecked: boolean;
  actualChecked: boolean;
  predictedMarks: number;
  actualMarks: number;
} {
  const optionGroups = Array.isArray(item.option_groups) ? item.option_groups : [];
  const selectionGroups = Array.isArray(item.selection_groups)
    ? item.selection_groups
    : [];
  const subitems = Array.isArray(item.subitems) ? item.subitems : [];
  const hasSubitems = !!item.subitems_exist && subitems.length > 0;
  const hasSelections = selectionGroups.some(
    (g: any) => Array.isArray(g?.selections) && g.selections.length > 0,
  );
  const hasOptions = optionGroups.some(
    (g: any) => Array.isArray(g?.options) && g.options.length > 0,
  );

  const predItemIds = toIdArray(a.checked_items);
  const actItemIds = toIdArray(a.actual_checked_items);

  let predictedMarks = 0;
  let actualMarks = 0;
  const predictedChecked = predItemIds.includes(Number(item.id));
  const actualChecked = actItemIds.includes(Number(item.id));

  if (hasSubitems) {
    const predSub = toIdArray(a.checked_subitems?.[item.id]);
    const actSub = toIdArray(a.actual_checked_subitems?.[item.id]);
    const predCustom = (a.custom_inputs?.[item.id] as string[]) || [];
    const actCustom = (a.actual_custom_inputs?.[item.id] as string[]) || [];
    const maxMarks = item.marks || 6;
    predictedMarks = Math.min(predSub.length + predCustom.length, maxMarks);
    actualMarks = Math.min(actSub.length + actCustom.length, maxMarks);
    return {
      kind: "subitems",
      predictedChecked: predSub.length + predCustom.length > 0,
      actualChecked: actSub.length + actCustom.length > 0,
      predictedMarks,
      actualMarks,
    };
  }
  if (hasSelections && !hasOptions) {
    predictedMarks = selectionGroups.reduce((sum: number, g: any) => {
      const sel = (g.selections || []).find(
        (s: any) => s.id === (a.selected_items?.[g.id] ?? null),
      );
      return sum + (sel?.marks || 0);
    }, 0);
    actualMarks = selectionGroups.reduce((sum: number, g: any) => {
      const sel = (g.selections || []).find(
        (s: any) => s.id === (a.actual_selected_items?.[g.id] ?? null),
      );
      return sum + (sel?.marks || 0);
    }, 0);
    return {
      kind: "selection",
      predictedChecked: predictedMarks > 0,
      actualChecked: actualMarks > 0,
      predictedMarks,
      actualMarks,
    };
  }
  if (hasOptions && !hasSelections) {
    predictedMarks = optionGroups.reduce((sum: number, g: any) => {
      const selIds = toIdArray(a.checked_options?.[g.id]);
      return (
        sum +
        (g.options || []).reduce(
          (gs: number, o: any) => gs + (selIds.includes(o.id) ? o.marks || 0 : 0),
          0,
        )
      );
    }, 0);
    actualMarks = optionGroups.reduce((sum: number, g: any) => {
      const selIds = toIdArray(a.actual_checked_options?.[g.id]);
      return (
        sum +
        (g.options || []).reduce(
          (gs: number, o: any) => gs + (selIds.includes(o.id) ? o.marks || 0 : 0),
          0,
        )
      );
    }, 0);
    return {
      kind: "options",
      predictedChecked: predictedMarks > 0,
      actualChecked: actualMarks > 0,
      predictedMarks,
      actualMarks,
    };
  }
  if (hasSelections && hasOptions) {
    const selMarks = (groups: any[], map: Record<string, number>) =>
      groups.reduce((sum: number, g: any) => {
        const sel = (g.selections || []).find(
          (s: any) => s.id === (map?.[g.id] ?? null),
        );
        return sum + (sel?.marks || 0);
      }, 0);
    const optMarks = (groups: any[], map: Record<string, number[]>) =>
      groups.reduce((sum: number, g: any) => {
        const selIds = toIdArray(map?.[g.id]);
        return (
          sum +
          (g.options || []).reduce(
            (gs: number, o: any) => gs + (selIds.includes(o.id) ? o.marks || 0 : 0),
            0,
          )
        );
      }, 0);
    predictedMarks =
      selMarks(selectionGroups, a.selected_items) +
      optMarks(optionGroups, a.checked_options);
    actualMarks =
      selMarks(selectionGroups, a.actual_selected_items) +
      optMarks(optionGroups, a.actual_checked_options);
    return {
      kind: "options",
      predictedChecked: predictedMarks > 0,
      actualChecked: actualMarks > 0,
      predictedMarks,
      actualMarks,
    };
  }
  predictedMarks = predictedChecked ? item.marks || 0 : 0;
  actualMarks = actualChecked ? item.marks || 0 : 0;
  return {
    kind: "checkbox",
    predictedChecked,
    actualChecked,
    predictedMarks,
    actualMarks,
  };
}

/* ---------------- Row model ---------------- */

type Row = {
  label: string;
  detail?: string;
  marks: string;
  predicted: string;
  actual: string;
  match: boolean;
  isParent?: boolean;
  kind: string;
};

const CHECKED = "Checked";
const UNCHECKED = "Not checked";
const NONE = "None / Not applicable";

function buildCriterionRows(
  criterion: GbiCriterion,
  a: Required<GbiAnswers>,
): { rows: Row[]; predicted: number; actual: number; total: number } {
  const rows: Row[] = [];
  const allItems: any[] = [];
  if (Array.isArray(criterion.items)) allItems.push(...criterion.items);
  if (Array.isArray(criterion.subcriteria)) {
    criterion.subcriteria.forEach((sub) => {
      if (Array.isArray(sub.items)) allItems.push(...sub.items);
    });
  }

  let predicted = 0;
  let actual = 0;

  allItems.forEach((item) => {
    const state = buildItemState(item, a);
    predicted += state.predictedMarks;
    actual += state.actualMarks;

    const indentLabel = (text: string) => `    ${text}`;

    if (state.kind === "subitems") {
      const subitems = Array.isArray(item.subitems) ? item.subitems : [];
      const predSub = toIdArray(a.checked_subitems?.[item.id]);
      const actSub = toIdArray(a.actual_checked_subitems?.[item.id]);
      const predCustom = (a.custom_inputs?.[item.id] as string[]) || [];
      const actCustom = (a.actual_custom_inputs?.[item.id] as string[]) || [];

      rows.push({
        label: safeText(item.description || ""),
        marks: String(item.marks || ""),
        predicted: `${state.predictedChecked ? CHECKED : UNCHECKED}`,
        actual: `${state.actualChecked ? CHECKED : UNCHECKED}`,
        match: state.predictedChecked === state.actualChecked,
        isParent: true,
        kind: "item",
      });

      subitems.forEach((sub: any) => {
        const predOn = predSub.includes(Number(sub.id));
        const actOn = actSub.includes(Number(sub.id));
        rows.push({
          label: indentLabel(safeText(sub.description || "")),
          marks: "",
          predicted: predOn ? CHECKED : UNCHECKED,
          actual: actOn ? CHECKED : UNCHECKED,
          match: predOn === actOn,
          kind: "subitem",
        });
      });

      predCustom.forEach((value) => {
        const actOn = actCustom.includes(value);
        rows.push({
          label: indentLabel(`Custom: ${safeText(value)}`),
          marks: "",
          predicted: CHECKED,
          actual: actOn ? CHECKED : UNCHECKED,
          match: actOn,
          kind: "custom",
        });
      });

      actCustom.forEach((value) => {
        if (predCustom.includes(value)) return;
        rows.push({
          label: indentLabel(`Custom: ${safeText(value)}`),
          marks: "",
          predicted: UNCHECKED,
          actual: CHECKED,
          match: false,
          kind: "custom",
        });
      });
      return;
    }

    if (state.kind === "selection") {
      const selectionGroups = Array.isArray(item.selection_groups)
        ? item.selection_groups
        : [];
      rows.push({
        label: safeText(item.description || ""),
        marks: "",
        predicted: "",
        actual: "",
        match: true,
        isParent: true,
        kind: "item",
      });
      selectionGroups.forEach((g: any) => {
        const predSel = (g.selections || []).find(
          (s: any) => s.id === (a.selected_items?.[g.id] ?? null),
        );
        const actSel = (g.selections || []).find(
          (s: any) => s.id === (a.actual_selected_items?.[g.id] ?? null),
        );
        const predText = predSel?.description || NONE;
        const actText = actSel?.description || NONE;
        rows.push({
          label: indentLabel(safeText(g.label || "Selection")),
          marks: String(predSel?.marks ?? ""),
          predicted: safeText(predText),
          actual: safeText(actText),
          match: predSel?.id === actSel?.id,
          kind: g.exclusive ? "selection-exclusive" : "selection",
        });
      });
      return;
    }

    if (state.kind === "options") {
      const optionGroups = Array.isArray(item.option_groups)
        ? item.option_groups
        : [];
      rows.push({
        label: safeText(item.description || ""),
        marks: "",
        predicted: "",
        actual: "",
        match: true,
        isParent: true,
        kind: "item",
      });
      optionGroups.forEach((g: any) => {
        const predIds = toIdArray(a.checked_options?.[g.id]);
        const actIds = toIdArray(a.actual_checked_options?.[g.id]);
        (g.options || []).forEach((o: any) => {
          const predOn = predIds.includes(Number(o.id));
          const actOn = actIds.includes(Number(o.id));
          rows.push({
            label: indentLabel(safeText(o.description || "")),
            marks: String(o.marks ?? ""),
            predicted: predOn ? CHECKED : UNCHECKED,
            actual: actOn ? CHECKED : UNCHECKED,
            match: predOn === actOn,
            kind: "option",
          });
        });
      });
      return;
    }

    // plain checkbox item
    rows.push({
      label: safeText(item.description || ""),
      marks: String(item.marks ?? ""),
      predicted: state.predictedChecked ? CHECKED : UNCHECKED,
      actual: state.actualChecked ? CHECKED : UNCHECKED,
      match: state.predictedChecked === state.actualChecked,
      kind: "checkbox",
    });
  });

  return { rows, predicted, actual, total: criterion.total_marks || 0 };
}

/* ---------------- Palette ---------------- */

type RGB = [number, number, number];

const C = {
  ink: [30, 38, 33] as RGB,
  forest: [44, 74, 58] as RGB,
  green: [62, 107, 82] as RGB,
  sage: [243, 246, 243] as RGB,
  paper: [251, 250, 247] as RGB,
  border: [228, 225, 216] as RGB,
  gold: [192, 138, 62] as RGB,
  goldSoft: [251, 243, 222] as RGB,
  muted: [138, 147, 140] as RGB,
  white: [255, 255, 255] as RGB,
  predicted: [91, 91, 214] as RGB,
  actual: [47, 111, 78] as RGB,
  mismatch: [249, 115, 22] as RGB,
} as const;

type JsDoc = any;

function drawSectionTitle(
  doc: JsDoc,
  title: string,
  y: number,
  marginX: number,
): number {
  doc.setFillColor(...C.green);
  doc.rect(marginX, y - 3.4, 1.6, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...C.ink);
  doc.text(safeText(title), marginX + 5.2, y);
  return y + 4.5;
}

function runTable(doc: JsDoc, opts: Record<string, unknown>): number {
  doc.autoTable(opts);
  const finalY = doc.lastAutoTable?.finalY as number | undefined;
  return finalY ?? 40;
}

function summaryTable(
  doc: JsDoc,
  labelValues: Array<[string, string]>,
  startY: number,
  marginX: number,
  contentW: number,
): number {
  return runTable(doc, {
    startY,
    margin: { left: marginX, right: marginX },
    theme: "grid",
    tableWidth: "auto",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 3,
      textColor: C.ink,
      lineColor: C.border,
      lineWidth: 0.15,
    },
    body: labelValues.map(([label, value]) => [
      {
        content: safeText(label),
        styles: { fontStyle: "bold", textColor: C.muted, fillColor: C.paper },
      },
      { content: safeText(value), styles: { fillColor: C.white } },
    ]),
    columnStyles: {
      0: { cellWidth: 46 },
      1: { cellWidth: contentW - 46 },
    },
  });
}

type DetailRow = { label: string; value?: string; section?: boolean };

/** The project details rendered in tabular form — section rows span the full width. */
function detailsTable(
  doc: JsDoc,
  rows: DetailRow[],
  startY: number,
  marginX: number,
  contentW: number,
): number {
  const sectionIdx = new Set<number>();
  rows.forEach((r, i) => {
    if (r.section) sectionIdx.add(i);
  });

  return runTable(doc, {
    startY,
    margin: { left: marginX, right: marginX },
    theme: "grid",
    tableWidth: "auto",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 3,
      textColor: C.ink,
      lineColor: C.border,
      lineWidth: 0.15,
    },
    body: rows.map((r, i) => {
      if (r.section) {
        return [{ content: safeText(r.label), colSpan: 2 }];
      }
      return [
        {
          content: safeText(r.label),
          styles: { fontStyle: "bold", textColor: C.muted },
        },
        { content: safeText(r.value ?? "—"), styles: { fillColor: C.white } },
      ];
    }),
    columnStyles: {
      0: { cellWidth: 46 },
      1: { cellWidth: contentW - 46 },
    },
    didParseCell: (data: any) => {
      if (data.section !== "body") return;
      const idx = data.row.index;
      if (sectionIdx.has(idx)) {
        data.cell.styles.fillColor = C.paper;
        data.cell.styles.textColor = C.forest;
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 7.5;
        data.cell.styles.halign = "left";
      }
    },
  });
}

function addFooters(
  doc: JsDoc,
  projectName: string,
  generatedAt: Date,
  marginX: number,
): void {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.line(marginX, pageH - 12, pageW - marginX, pageH - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.muted);
    doc.text(
      `Generated on ${fmtDate(generatedAt)}  ·  ${safeText(projectName)}`,
      marginX,
      pageH - 8,
    );
    doc.text(`Page ${i} of ${pageCount}`, pageW - marginX, pageH - 8, {
      align: "right",
    });
  }
}

/* ---------------- Main entry ---------------- */

export async function generateGbiAssessmentPdf(
  input: GbiPdfInput,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { applyPlugin } = await import("jspdf-autotable");
  applyPlugin(jsPDF);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 14;
  const contentW = pageW - marginX * 2;
  const generatedAt = input.generatedAt ?? new Date();
  const project = input.project;
  const projectName = safeText(project.name || "Untitled project");

  const rawCriteria = Array.isArray(input.criteria)
    ? input.criteria.filter((c): c is GbiCriterion => !!c && typeof c !== "string")
    : [];
  const answers = (input.answers ?? {}) as Required<GbiAnswers>;

  const criteriaRows = rawCriteria.map((criterion) =>
    buildCriterionRows(criterion, answers),
  );
  const hasData = criteriaRows.length > 0;
  const grandPredicted = criteriaRows.reduce((s, c) => s + c.predicted, 0);
  const grandActual = criteriaRows.reduce((s, c) => s + c.actual, 0);
  const grandTotal = criteriaRows.reduce((s, c) => s + c.total, 0);

  /* ==================== PAGE 1 — Project details ==================== */

  const bandH = 42;
  doc.setFillColor(...C.ink);
  doc.rect(0, 0, pageW, bandH, "F");
  doc.setFillColor(...C.gold);
  doc.rect(0, bandH, pageW, 1.4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...C.gold);
  doc.setCharSpace(1.6);
  doc.text("GBI ASSESSMENT REPORT", marginX, 16);
  doc.setCharSpace(0);

  doc.setFont("times", "bold");
  doc.setFontSize(23);
  doc.setTextColor(...C.white);
  doc.text(projectName, marginX, 27);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 211, 206);
  doc.text(`Generated on ${fmtDate(generatedAt)}`, marginX, 35);

  let y = bandH + 1.4 + 12;

  y = drawSectionTitle(doc, "Report summary", y, marginX);
  y = summaryTable(
    doc,
    [
      ["Project name", projectName],
      ["Report date", fmtDate(generatedAt)],
      ["Report type", "GBI assessment - predicted vs actual"],
      [
        "Contents",
        "Page 1 - Project details  |  Page 2+ - GBI assessment breakdown",
      ],
    ],
    y + 2,
    marginX,
    contentW,
  );

  y = drawSectionTitle(doc, "Project details", y + 8, marginX);
  y = detailsTable(
    doc,
    [
      { label: "THE BASICS", section: true },
      { label: "Building type", value: fmtValue(project.buildingType) },
      { label: "Category", value: fmtValue(project.category) },
      { label: "Classification", value: fmtValue(project.classification) },
      { label: "SCALE & TIMING", section: true },
      { label: "Size", value: fmtSize(project.size) },
      { label: "Year", value: fmtValue(project.year) },
      { label: "LOCATION & STRUCTURE", section: true },
      { label: "Location", value: fmtValue(project.location) },
      { label: "Structure", value: fmtValue(project.structure) },
      { label: "CERTIFICATION", section: true },
      {
        label: "Predicted rating",
        value:
          project.rating != null ? `${project.rating} points` : undefined,
      },
      {
        label: "Target certification",
        value: fmtValue(project.targetCertification),
      },
    ],
    y + 2,
    marginX,
    contentW,
  );

  /* ==================== PAGE 2 — Assessment breakdown ==================== */

  doc.addPage();

  y = marginX;
  y = drawSectionTitle(doc, "GBI Assessment", y, marginX);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  doc.text(
    `${projectName} - predicted vs actual assessment`,
    marginX,
    y + 1,
  );
  y += 8;

  const stripBoxes: Array<{ label: string; value: string; tone: RGB }> = [
    {
      label: "Predicted",
      value: grandTotal ? `${grandPredicted} / ${grandTotal} pts` : `${grandPredicted} pts`,
      tone: C.predicted,
    },
    {
      label: "Actual",
      value: grandTotal ? `${grandActual} / ${grandTotal} pts` : `${grandActual} pts`,
      tone: C.actual,
    },
    {
      label: "Criteria",
      value: String(criteriaRows.length),
      tone: C.ink,
    },
  ];
  const boxW = (contentW - 8) / 3;
  const boxH = 16;
  stripBoxes.forEach((box, i) => {
    const x = marginX + i * (boxW + 4);
    doc.setFillColor(...C.sage);
    doc.roundedRect(x, y, boxW, boxH, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.muted);
    doc.text(box.label.toUpperCase(), x + 3.5, y + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...box.tone);
    doc.text(box.value, x + 3.5, y + 11.5);
  });
  y += boxH + 10;

  if (!hasData) {
    doc.setFillColor(...C.paper);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.roundedRect(marginX, y, contentW, 30, 3, 3, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...C.muted);
    doc.text(
      "No GBI assessment data is available for this project yet.",
      pageW / 2,
      y + 16,
      { align: "center" },
    );
  } else {
    criteriaRows.forEach((criterionData) => {
      if (y > pageW * 1.4) {
        doc.addPage();
        y = marginX;
      }
      const title = rawCriteria[criteriaRows.indexOf(criterionData)];
      y = drawSectionTitle(doc, safeText(title?.name || "Criterion"), y, marginX);

      const rows = criterionData.rows;
      y = runTable(doc, {
        startY: y + 2,
        margin: { left: marginX, right: marginX },
        theme: "grid",
        tableWidth: "auto",
        styles: {
          font: "helvetica",
          fontSize: 8,
          cellPadding: 2.5,
          textColor: C.ink,
          lineColor: C.border,
          lineWidth: 0.15,
          valign: "middle",
        },
        head: [["Item", "Pts", "Predicted", "Actual"]],
        headStyles: {
          fillColor: C.forest,
          textColor: C.white,
          fontStyle: "bold",
          fontSize: 8,
        },
        columnStyles: {
          0: { cellWidth: contentW - 12 - 24 - 26 },
          1: { cellWidth: 12, halign: "center", textColor: C.muted },
          2: { cellWidth: 26, halign: "left", textColor: C.predicted },
          3: { cellWidth: 26, halign: "left", textColor: C.actual },
        },
        body: rows.map((r) => [
          r.label,
          r.marks,
          r.predicted,
          r.actual,
        ]),
        didParseCell: (data: any) => {
          if (data.section !== "body") return;
          const row = rows[data.row.index];
          if (!row) return;
          if (data.column.index === 0 && row.isParent) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.textColor = C.forest;
            data.cell.styles.fillColor = [242, 246, 243];
          }
          if (data.column.index >= 2 && !row.match && row.predicted !== "") {
            data.cell.styles.textColor = C.mismatch;
            data.cell.styles.fillColor = [255, 244, 230];
          }
        },
      });
      y = y + 6;
    });
  }

  /* ==================== Footers ==================== */

  addFooters(doc, projectName, generatedAt, marginX);

  const safeFileName = projectName.replace(/[\\/:*?"<>|]+/g, "_").trim();
  doc.save(`${safeFileName || "Project"} - GBI Assessment.pdf`);
}
