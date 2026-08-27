export function normalizeReviewText(value?: string | null) {
  return (value || "")
    .replaceAll("\\n", "\n")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/^[\s>*+•-]+/gm, " ")
    .replace(/[*_~`#]/g, "")
    .toLocaleLowerCase()
    .replace(/\b(?:a\s+)?minimum\s+of\b/g, "at least")
    .replace(/[^\p{L}\p{N}%]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function isDistinctPurpose(requirement?: string | null, purpose?: string | null) {
  const normalizedPurpose = normalizeReviewText(purpose);
  if (!normalizedPurpose) return false;
  if (
    /^requirements? (?:may |can )?vary\b/.test(normalizedPurpose)
    || /^(?:see|refer to|review|open) (?:the )?(?:gbi )?requirements?\b/.test(normalizedPurpose)
    || /^no (?:gbi )?purpose (?:summary )?(?:is )?(?:available|recorded)\b/.test(normalizedPurpose)
  ) return false;

  const normalizedRequirement = normalizeReviewText(requirement);
  if (!normalizedRequirement) return true;
  if (normalizedRequirement === normalizedPurpose) return false;
  if (normalizedRequirement.includes(normalizedPurpose) || normalizedPurpose.includes(normalizedRequirement)) return false;

  const comparisonFillers = new Set(["a", "an", "the", "of", "for", "to", "and", "at"]);
  const significantTokens = (value: string) => value.split(" ").filter((token) => !comparisonFillers.has(token));
  const requirementTokens = new Set(significantTokens(normalizedRequirement));
  const purposeTokens = new Set(significantTokens(normalizedPurpose));
  const sharedTokenCount = [...purposeTokens].filter((token) => requirementTokens.has(token)).length;
  const diceSimilarity = (2 * sharedTokenCount) / (requirementTokens.size + purposeTokens.size);

  return diceSimilarity < 0.8;
}
