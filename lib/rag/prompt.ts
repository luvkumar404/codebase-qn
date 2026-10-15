import { Source } from "@/lib/types";

export const SYSTEM_INSTRUCTION = `You are an expert codebase assistant. Your task is to answer the user's question about the codebase based ONLY on the provided numbered code snippets.

Rules:
1. Answer ONLY using the information present in the numbered snippets.
2. Cite your sources using [n] notation corresponding to the numbered snippet (e.g. [1], [2]).
3. If the provided snippets do not contain enough information to answer the question, state plainly: "I cannot find the answer in the indexed code."
4. NEVER invent or hallucinate file paths, line ranges, or code that is not present in the snippets.
5. Keep explanations direct, accurate, and concise.`;

/**
 * Builds the numbered context string:
 * [1] path:start-end\n<content>
 *
 * [2] path:start-end\n<content>
 */
export function buildNumberedContext(sources: Source[]): string {
  if (sources.length === 0) {
    return "";
  }

  return sources
    .map(
      (s, index) =>
        `[${index + 1}] ${s.filePath}:${s.startLine}-${s.endLine}\n${s.content}`
    )
    .join("\n\n");
}

/**
 * Combines numbered context and the user question into the full prompt for the model.
 */
export function buildUserPrompt(question: string, numberedContext: string): string {
  if (!numberedContext) {
    return question;
  }
  return `Numbered Code Context:\n\n${numberedContext}\n\nQuestion: ${question}`;
}
