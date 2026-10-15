import type { ChunkResult } from "./fallback";

/**
 * Markdown chunker: split by headings (lines starting with #).
 * Each chunk corresponds to a heading section. If the preamble (content
 * before the first heading) is non-empty, it becomes its own chunk.
 */
export function chunkMarkdown(content: string): ChunkResult[] {
  const lines = content.split("\n");
  if (lines.length === 0) return [];

  const chunks: ChunkResult[] = [];
  let sectionStart = 0;
  let sectionLines: string[] = [];

  function flush(endLineIndex: number): void {
    const text = sectionLines.join("\n");
    if (text.trim().length > 0) {
      chunks.push({
        content: text,
        startLine: sectionStart + 1, // 1-based
        endLine: endLineIndex + 1, // 1-based inclusive
      });
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // A heading line starts with one or more '#'
    if (/^#{1,6}\s/.test(line) && sectionLines.length > 0) {
      // Flush previous section
      flush(i - 1);
      sectionStart = i;
      sectionLines = [line];
    } else {
      sectionLines.push(line);
    }
  }

  // Flush last section
  if (sectionLines.length > 0) {
    flush(lines.length - 1);
  }

  return chunks;
}
