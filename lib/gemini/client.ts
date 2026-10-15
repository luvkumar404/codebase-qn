import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";

export const CHAT_MODEL = env.GEMINI_MODEL || "gemini-3.6-flash";
export const EMBED_MODEL = "gemini-embedding-001";

const globalForGemini = globalThis as unknown as {
  _geminiAi?: GoogleGenAI;
};

function getGeminiClient(): GoogleGenAI {
  if (!globalForGemini._geminiAi) {
    globalForGemini._geminiAi = new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
    });
  }
  return globalForGemini._geminiAi;
}

export const ai = getGeminiClient();
