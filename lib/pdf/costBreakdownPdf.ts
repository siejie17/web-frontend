import type {
  CostBreakdown,
  CostNode,
} from "@/components/project/CostBreakdownTree";

/* ---------------- Public types ---------------- */

export type PdfProjectDetails = {
  id?: number | null;
  name?: string | null;
  buildingType?: string | null;
  category?: string | null;
  classification?: string | null;
  size?: string | number | null;
  budget?: string | null;
  adjustedCost?: string | number | null;
  year?: string | number | null;
  location?: string | null;
  structure?: string | null;
  rating?: number | null;
  targetCertification?: string | null;
};

export type PdfExportInput = {
  breakdown: CostBreakdown;
  project: PdfProjectDetails;
  projectBudget?: number | null;
  generatedAt?: Date;
};

/* ---------------- Value helpers ---------------- */

/** jsPDF's built-in fonts are WinAnsi-encoded; anything outside Latin-1 would throw.
 *  Normalise the common typographic marks and drop the rest. */
function safeText(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u00a0\u202f]/g, " ")
    .replace(/[^\x00-\xff]/g, "");
}

function fmtMoney(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `RM ${safe.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtCurrency(value: unknown): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return `RM ${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function fmtSize(value: unknown): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return `${n.toLocaleString("en-US")} m²`;
}

function fmtValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/* ---------------- Tree helpers ---------------- */

/** A parent's figure is always the sum of its children — never a stored value. */
function sumPredicted(node: CostNode): number {
  if (node.children) {
    return Object.values(node.children).reduce(
      (sum, child) => sum + sumPredicted(child),
      0,
    );
  }
  return Number.isFinite(node.cost) ? node.cost : 0;
}

function sumActual(node: CostNode): number {
  if (node.children) {
    return Object.values(node.children).reduce(
      (sum, child) => sum + sumActual(child),
      0,
    );
  }
  const value = node.actual_cost ?? 0;
  return Number.isFinite(value) ? value : 0;
}

type FlatRow = {
  code: string;
  description: string;
  depth: number;
  predicted: number;
  actual: number;
  isParent: boolean;
  isCert: boolean;
};

/** Flatten the nested tree into rows, keeping depths 0, 1 and 2 (each child row carries
 *  its full ancestor path via `code`, so parents are always present above their children). */
function flattenBreakdown(data: CostBreakdown): FlatRow[] {
  const rows: FlatRow[] = [];

  const visit = (
    nodes: Record<string, CostNode>,
    path: string[],
    depth: number,
  ) => {
    for (const [key, node] of Object.entries(nodes)) {
      const code = [...path, key].join(".");
      const isParent = !!node.children;
      rows.push({
        code,
        description: safeText(node.description || ""),
        depth,
        predicted: isParent ? sumPredicted(node) : node.cost ?? 0,
        actual: isParent ? sumActual(node) : node.actual_cost ?? 0,
        isParent,
        isCert: node.is_certification === 1,
      });
      if (isParent && depth < 2) {
        visit(node.children!, [...path, key], depth + 1);
      }
    }
  };

  visit(data, [], 0);
  return rows;
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
} as const;

/* ---------------- Drawing helpers ---------------- */

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

/** Run an autotable via the jspdf plugin and return the y-coordinate just below it. */
function runTable(doc: JsDoc, opts: Record<string, unknown>): number {
  doc.autoTable(opts);
  const finalY = doc.lastAutoTable?.finalY as number | undefined;
  return finalY ?? 40;
}

/** Simple two-column label/value table used for the report summary. */
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

/** Draw the generated-on line plus "Page X of Y" on every page of the document. */
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

export async function generateCostBreakdownPdf(
  input: PdfExportInput,
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

  const rows = flattenBreakdown(input.breakdown ?? {});
  const hasData = rows.length > 0;
  const predictedTotal = rows
    .filter((r) => r.depth === 0)
    .reduce((sum, r) => sum + r.predicted, 0);
  const actualTotal = rows
    .filter((r) => r.depth === 0)
    .reduce((sum, r) => sum + r.actual, 0);

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
  doc.text("PROJECT COST BREAKDOWN REPORT", marginX, 16);
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
      ["Report type", "Project details & cost breakdown"],
      ["Contents", "Page 1 - Project details  |  Page 2 - Cost breakdown"],
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
      { label: "Budget", value: fmtCurrency(project.budget) },
      { label: "Adjusted cost", value: fmtCurrency(project.adjustedCost) },
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

  /* ==================== PAGE 2 — Cost breakdown ==================== */

  doc.addPage();

  y = marginX;
  y = drawSectionTitle(doc, "Cost Breakdown", y, marginX);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  doc.text(`${projectName} - detailed cost ledger`, marginX, y + 1);
  y += 8;

  const stripBoxes: Array<{ label: string; value: string; tone: RGB }> = [
    { label: "Predicted", value: fmtMoney(predictedTotal), tone: C.forest },
    { label: "Actual", value: fmtMoney(actualTotal), tone: C.green },
    {
      label: "Budget",
      value:
        input.projectBudget != null ? fmtMoney(input.projectBudget) : "—",
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
    doc.setFontSize(10.5);
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
      "No cost breakdown data is available for this project yet.",
      pageW / 2,
      y + 16,
      { align: "center" },
    );
  } else {
    runTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      theme: "grid",
      tableWidth: "auto",
      styles: {
        font: "helvetica",
        fontSize: 8.5,
        cellPadding: 2.5,
        textColor: C.ink,
        lineColor: C.border,
        lineWidth: 0.15,
        valign: "middle",
      },
      head: [["Code", "Element", "Predicted (RM)", "Actual (RM)"]],
      headStyles: {
        fillColor: C.forest,
        textColor: C.white,
        fontStyle: "bold",
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 22, halign: "left", fontStyle: "bold", textColor: C.muted },
        1: { cellWidth: contentW - 22 - 34 - 34 },
        2: { cellWidth: 34, halign: "right" },
        3: { cellWidth: 34, halign: "right" },
      },
      body: rows.map((r) => [
        r.code,
        r.description,
        fmtMoney(r.predicted),
        fmtMoney(r.actual),
      ]),
      foot: [
        [
          { content: "TOTAL", colSpan: 2 },
          fmtMoney(predictedTotal),
          fmtMoney(actualTotal),
        ],
      ],
      footStyles: {
        fillColor: C.ink,
        textColor: C.white,
        fontStyle: "bold",
        fontSize: 8.5,
      },
      didParseCell: (data: any) => {
        if (data.section === "foot") {
          if (data.column.index >= 2) data.cell.styles.halign = "right";
          return;
        }
        if (data.section !== "body") return;
        const row = rows[data.row.index];
        if (!row) return;
        if (data.column.index === 1) {
          data.cell.styles.cellPadding = {
            top: 2.5,
            right: 2.5,
            bottom: 2.5,
            left: 5 + row.depth * 4,
          };
        }
        if (row.isParent) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.textColor = C.forest;
          data.cell.styles.fillColor = [242, 246, 243];
        } else if (row.isCert) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.textColor = [138, 100, 32];
          data.cell.styles.fillColor = C.goldSoft;
        }
      },
    });
  }

  /* ==================== Footers ==================== */

  addFooters(doc, projectName, generatedAt, marginX);

  const safeFileName = projectName.replace(/[\\/:*?"<>|]+/g, "_").trim();
  doc.save(`${safeFileName || "Project"} - Cost Breakdown.pdf`);
}
