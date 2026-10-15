/**
 * Parses and cleans citation markers formatted as `[n]` in LLM output.
 * Valid citations (1 <= n <= totalSources) are preserved.
 * Out-of-range markers (n < 1 or n > totalSources) are removed.
 * Repeated adjacent citations (e.g. `[1][1]` or `[1] [1]`) are deduplicated.
 */

const CITATION_REGEX = /\[(\d+)\]/g;

/**
 * Extracts a deduplicated array of 1-based citation indices present in the text
 * that fall within [1, totalSources].
 */
export function extractValidCitations(
  text: string,
  totalSources: number
): number[] {
  const citations = new Set<number>();
  let match: RegExpExecArray | null;
  const regex = new RegExp(CITATION_REGEX.source, "g");

  while ((match = regex.exec(text)) !== null) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num >= 1 && num <= totalSources) {
      citations.add(num);
    }
  }

  return Array.from(citations).sort((a, b) => a - b);
}

/**
 * Cleans the input text by:
 * 1. Removing out-of-range `[n]` markers where n < 1 or n > totalSources.
 * 2. Deduplicating repeated adjacent identical markers like `[1][1]` or `[1] [1]`.
 */
export function cleanCitations(text: string, totalSources: number): string {
  // First, remove out-of-range citations
  let cleaned = text.replace(CITATION_REGEX, (match, digits) => {
    const num = parseInt(digits, 10);
    if (!isNaN(num) && num >= 1 && num <= totalSources) {
      return match;
    }
    return "";
  });

  // Next, collapse repeated identical adjacent markers like [1][1] or [1] [1]
  cleaned = cleaned.replace(/\[(\d+)\](?:\s*\[\1\])+/g, "[$1]");

  // Clean up any extra spaces created by removed citations
  cleaned = cleaned.replace(/ +([.,;:!?])/g, "$1");
  cleaned = cleaned.replace(/ {2,}/g, " ");

  return cleaned.trim();
}
