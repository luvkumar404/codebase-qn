import { ai, EMBED_MODEL } from "@/lib/gemini/client";
import { EMBED_BATCH_SIZE, VECTOR_DIMENSION } from "@/lib/types";

export type EmbedMode = "document" | "query";

const TASK_TYPES: Record<EmbedMode, string> = {
  document: "RETRIEVAL_DOCUMENT",
  query: "CODE_RETRIEVAL_QUERY",
};

const MAX_ATTEMPTS = 4;
const BACKOFF_DELAYS_MS = [1000, 2000, 4000];

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function embedBatchWithRetry(
  batch: string[],
  taskType: string
): Promise<number[][]> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await ai.models.embedContent({
        model: EMBED_MODEL,
        contents: batch,
        config: {
          taskType,
          outputDimensionality: VECTOR_DIMENSION,
        },
      });

      const embeddings = response.embeddings;

      if (!embeddings || embeddings.length !== batch.length) {
        throw new Error(
          `Embedding count mismatch: expected ${batch.length}, received ${embeddings?.length ?? 0}`
        );
      }

      const vectors: number[][] = [];
      for (const item of embeddings) {
        if (!item.values || item.values.length === 0) {
          throw new Error("Received empty embedding vector from Gemini API");
        }
        vectors.push(item.values);
      }

      return vectors;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) {
        const waitMs = BACKOFF_DELAYS_MS[attempt - 1] ?? 4000;
        await delay(waitMs);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Embedding failed after ${MAX_ATTEMPTS} attempts`);
}

/**
 * Batched embedding generator for documents or queries.
 * Chunks input into batches of 50 and retries failed requests up to 4 times
 * with exponential backoff.
 */
export async function embed(
  texts: string[],
  mode: EmbedMode
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const taskType = TASK_TYPES[mode];
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
    const batchEmbeddings = await embedBatchWithRetry(batch, taskType);
    allEmbeddings.push(...batchEmbeddings);
  }

  return allEmbeddings;
}
