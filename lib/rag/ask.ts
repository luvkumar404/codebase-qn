import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { repos } from "@/lib/db/schema";
import { retrieveRelevantSources } from "@/lib/rag/retrieve";
import {
  SYSTEM_INSTRUCTION,
  buildNumberedContext,
  buildUserPrompt,
} from "@/lib/rag/prompt";
import { generateAnswerStream } from "@/lib/gemini/generate";
import { AskSourcesLine, Source } from "@/lib/types";

export class RepositoryNotFoundError extends Error {
  constructor(id: string) {
    super(`Repository not found: ${id}`);
    this.name = "RepositoryNotFoundError";
  }
}

/**
 * Orchestrates RAG question answering:
 * 1. Checks repository existence in database
 * 2. Retrieves relevant sources (vector + keyword search + RRF)
 * 3. Returns sources and a ReadableStream where:
 *    - Line 1 is JSON: {"sources": [...]}
 *    - Following is text/plain streaming answer deltas from Gemini LLM
 */
export async function streamAnswer(
  repoId: string,
  question: string
): Promise<{ sources: Source[]; stream: ReadableStream<Uint8Array> }> {
  // Verify repository exists
  const [repo] = await db
    .select({ id: repos.id })
    .from(repos)
    .where(eq(repos.id, repoId))
    .limit(1);

  if (!repo) {
    throw new RepositoryNotFoundError(repoId);
  }

  // Retrieve top 8 fused sources
  const sources = await retrieveRelevantSources(repoId, question);

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // Line 1: JSON sources line
        const sourcesLine: AskSourcesLine = { sources };
        controller.enqueue(encoder.encode(JSON.stringify(sourcesLine) + "\n"));

        // If no sources found, return message without calling LLM
        if (sources.length === 0) {
          controller.enqueue(
            encoder.encode("No indexed code found for this repository.")
          );
          controller.close();
          return;
        }

        // Build numbered context & user prompt
        const numberedContext = buildNumberedContext(sources);
        const userPrompt = buildUserPrompt(question, numberedContext);

        try {
          for await (const chunk of generateAnswerStream({
            contents: userPrompt,
            systemInstruction: SYSTEM_INSTRUCTION,
          })) {
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (genErr) {
          console.error("Gemini stream error midway:", genErr);
          // If the Gemini stream fails midway, append a plain error sentence and close cleanly
          controller.enqueue(
            encoder.encode(
              "\n\nAn error occurred while generating the remainder of this response."
            )
          );
        }

        controller.close();
      } catch (streamErr) {
        controller.error(streamErr);
      }
    },
  });

  return { sources, stream };
}
