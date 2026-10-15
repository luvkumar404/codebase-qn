export interface ChunkResult {
  content: string;
  startLine: number;
  endLine: number;
}

const WINDOW_SIZE = 60;
const OVERLAP = 8;

/**
 * Fallback chunker: ~60-line windows with ~8-line overlap.
 * Prefers breaking at blank lines near the boundary when possible.
 */
export function chunkFallback(content: string): ChunkResult[] {
  const lines = content.split("\n");
  if (lines.length === 0) return [];

  const chunks: ChunkResult[] = [];
  let start = 0;

  while (start < lines.length) {
    let end = Math.min(start + WINDOW_SIZE, lines.length);

    // If we're not at the end, try to break at a blank line near the boundary
    if (end < lines.length) {
      // Search backwards from `end` for a blank line within the overlap zone
      const searchStart = Math.max(end - OVERLAP, start + 1);
      let bestBreak = -1;
      for (let i = end; i >= searchStart; i--) {
        if (lines[i]?.trim() === "") {
          bestBreak = i;
          break;
        }
      }
      if (bestBreak > start) {
        end = bestBreak + 1; // include the blank line
      }
    }

    const chunkLines = lines.slice(start, end);
    const chunkContent = chunkLines.join("\n");

    // Don't produce empty chunks
    if (chunkContent.trim().length > 0) {
      chunks.push({
        content: chunkContent,
        startLine: start + 1, // 1-based
        endLine: end, // 1-based inclusive
      });
    }

    // Advance with overlap
    const nextStart = end - OVERLAP;
    start = nextStart <= start ? end : nextStart;
  }

  return chunks;
}
