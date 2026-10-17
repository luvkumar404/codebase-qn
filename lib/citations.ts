export type AnswerSegment =
  | { type: "text"; text: string }
  | { type: "citation"; number: number };

/**
 * Splits answer text on /\[(\d+)\]/ into text and citation parts.
 * Drops any citation number outside 1..totalSources.
 * Handles adjacent markers (e.g. [1][2]) and collapses repeated identical markers (e.g. [1][1]).
 */
export function splitAnswerWithCitations(
  text: string,
  totalSources: number
): AnswerSegment[] {
  if (!text) return [];

  // Deduplicate repeated identical adjacent markers like [1][1] or [1] [1]
  const normalized = text.replace(/\[(\d+)\](?:\s*\[\1\])+/g, "[$1]");
  const parts = normalized.split(/\[(\d+)\]/);
  const segments: AnswerSegment[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i % 2 === 0) {
      if (part.length > 0) {
        const last = segments[segments.length - 1];
        if (last && last.type === "text") {
          last.text += part;
        } else {
          segments.push({ type: "text", text: part });
        }
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 1 && num <= totalSources) {
        segments.push({ type: "citation", number: num });
      }
    }
  }

  return segments;
}
