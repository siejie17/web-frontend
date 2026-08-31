const MIDA_HEADING = "## MIDA ESG";
const SARAWAK_HEADING = "## Sarawak 13th Malaysia Plan";

export function splitEsgMapping(esg?: string | null) {
  if (!esg?.trim()) return { sarawak: "", mida: "" };

  const midaStart = esg.indexOf(MIDA_HEADING);
  if (midaStart < 0) return { sarawak: esg.trim(), mida: "" };

  return {
    sarawak: esg.slice(0, midaStart).trim(),
    mida: esg.slice(midaStart + MIDA_HEADING.length).trim(),
  };
}

export function parseMidaCriteria(markdown: string) {
  return markdown
    .split(/(?=^### )/m)
    .map((section) => section.trim())
    .filter(Boolean)
    .map((section) => {
      const [heading = "", ...lines] = section.split("\n");
      const fields = Array.from(
        lines.join("\n").matchAll(/^- \*\*(.+?):\*\*\s*(.+)$/gm),
        ([, label, value]) => ({ label, value }),
      );

      return {
        criterion: heading.replace(/^###\s+/, "").trim(),
        fields: fields.filter(({ label }) => label !== "Criterion"),
      };
    });
}

export function splitEsgDialogContent(markdown: string) {
  const sections = markdown.split(/^##\s+/m).filter((section) => section.trim());
  const result = { sarawak: "", mida: "", suggestions: "" };

  for (const section of sections) {
    const [heading = "", ...body] = section.split("\n");
    const content = body.join("\n").trim();
    const normalizedHeading = heading.trim().toLowerCase();

    if (normalizedHeading.includes("sarawak")) result.sarawak = content;
    else if (normalizedHeading === "mida esg") result.mida = content;
    else if (normalizedHeading.includes("suggestion") || normalizedHeading.includes("material")) {
      result.suggestions = content;
    }
  }

  return result;
}

export function formatEsgMapping(esg?: string | null): string {
  const { sarawak, mida } = splitEsgMapping(esg);

  return [
    sarawak && `${SARAWAK_HEADING}\n\n${sarawak}`,
    mida && `${MIDA_HEADING}\n\n${mida}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
