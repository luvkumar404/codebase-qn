import { ai, CHAT_MODEL } from "@/lib/gemini/client";

export interface GenerateOptions {
  contents: string;
  systemInstruction: string;
}

/**
 * Streams answer text deltas from Gemini LLM using ai.models.generateContentStream.
 * Yields raw text pieces as they arrive.
 */
export async function* generateAnswerStream({
  contents,
  systemInstruction,
}: GenerateOptions): AsyncGenerator<string, void, unknown> {
  const responseStream = await ai.models.generateContentStream({
    model: CHAT_MODEL,
    contents,
    config: {
      systemInstruction,
      maxOutputTokens: 2048,
    },
  });

  for await (const chunk of responseStream) {
    const text = chunk.text;
    if (text) {
      yield text;
    }
  }
}
