import path from "path";
import { chunkFallback } from "./fallback";
import { chunkMarkdown } from "./markdown";
import type { ChunkResult } from "./fallback";

export type { ChunkResult };

/**
 * Choose a chunker based on file extension.
 * Markdown files get heading-based splitting; everything else uses the
 * fallback line-window chunker.
 */
export function chunkFile(filePath: string, content: string): ChunkResult[] {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".md") {
    return chunkMarkdown(content);
  }
  return chunkFallback(content);
}
