import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { chunks } from "@/lib/db/schema";
import { embed } from "@/lib/gemini/embed";
import { reciprocalRankFusion } from "@/lib/rag/fuse";
import { Source } from "@/lib/types";

export interface RetrievedChunk {
  id: string;
  repoId: string;
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
}

/**
 * Extracts identifier-like words from the question:
 * Matches /[A-Za-z_][A-Za-z0-9_]{2,}/g, max 12 items, deduplicated case-insensitively.
 */
export function extractKeywords(question: string): string[] {
  const matches = question.match(/[A-Za-z_][A-Za-z0-9_]{2,}/g) || [];
  const deduped: string[] = [];
  const seen = new Set<string>();

  for (const m of matches) {
    const lower = m.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      deduped.push(m);
      if (deduped.length >= 12) break;
    }
  }

  return deduped;
}

/**
 * Runs hybrid search scoped to repoId:
 * 1. Vector cosine similarity search (top 20)
 * 2. Full-text keyword search via tsvector / ts_rank (top 20)
 * 3. Reciprocal Rank Fusion (k=60), keeping the top 8 sources
 */
export async function retrieveRelevantSources(
  repoId: string,
  question: string
): Promise<Source[]> {
  // 1. Vector search
  const [queryEmbedding] = await embed([question], "query");

  let vectorResults: RetrievedChunk[] = [];
  if (queryEmbedding && queryEmbedding.length > 0) {
    const vectorStr = `[${queryEmbedding.join(",")}]`;
    vectorResults = await db
      .select({
        id: chunks.id,
        repoId: chunks.repoId,
        filePath: chunks.filePath,
        startLine: chunks.startLine,
        endLine: chunks.endLine,
        content: chunks.content,
      })
      .from(chunks)
      .where(and(eq(chunks.repoId, repoId), isNotNull(chunks.embedding)))
      .orderBy(sql`${chunks.embedding} <=> ${vectorStr}::vector`)
      .limit(20);
  }

  // 2. Keyword search
  const keywords = extractKeywords(question);
  let keywordResults: RetrievedChunk[] = [];

  if (keywords.length > 0) {
    const tsQuery = keywords.join(" | ");
    keywordResults = await db
      .select({
        id: chunks.id,
        repoId: chunks.repoId,
        filePath: chunks.filePath,
        startLine: chunks.startLine,
        endLine: chunks.endLine,
        content: chunks.content,
      })
      .from(chunks)
      .where(
        and(
          eq(chunks.repoId, repoId),
          sql`tsv @@ to_tsquery('simple', ${tsQuery})`
        )
      )
      .orderBy(sql`ts_rank(tsv, to_tsquery('simple', ${tsQuery})) DESC`)
      .limit(20);
  }

  // 3. Reciprocal Rank Fusion (top 8)
  const fused = reciprocalRankFusion(vectorResults, keywordResults, 60, 8);

  return fused.map((c) => ({
    filePath: c.filePath,
    startLine: c.startLine,
    endLine: c.endLine,
    content: c.content,
  }));
}
