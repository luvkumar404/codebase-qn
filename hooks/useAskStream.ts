"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Source } from "@/lib/types";
import { StreamParser } from "@/lib/stream";
import { streamAskQuestion } from "@/lib/api";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
  error?: string;
}

export function useAskStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentSources, setCurrentSources] = useState<Source[] | null>(null);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [citedFiles, setCitedFiles] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const ask = useCallback(
    async (question: string, repoId: string) => {
      const trimmed = question.trim();
      if (!trimmed || isStreaming) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const userMsgId = `user-${Date.now()}`;
      const assistantMsgId = `asst-${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: "user", text: trimmed },
        { id: assistantMsgId, role: "assistant", text: "", sources: [] },
      ]);

      setIsStreaming(true);
      setCurrentSources(null);
      setActiveSourceIndex(0);

      const parser = new StreamParser();
      const decoder = new TextDecoder();

      try {
        const response = await streamAskQuestion(
          repoId,
          trimmed,
          controller.signal
        );

        if (!response.body) {
          throw new Error("No response body received from server");
        }

        const reader = response.body.getReader();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunkText = decoder.decode(value, { stream: true });
          const { sources, text } = parser.feed(chunkText);

          if (sources) {
            setCurrentSources(sources);
            setActiveSourceIndex(0);

            if (sources.length > 0) {
              setCitedFiles((prev) => {
                const combined = new Set(prev);
                sources.forEach((s) => combined.add(s.filePath));
                return Array.from(combined);
              });
            }

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId ? { ...msg, sources } : msg
              )
            );
          }

          if (text) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, text: msg.text + text }
                  : msg
              )
            );
          }
        }

        // Flush any remaining decoder output
        const finalChunk = decoder.decode();
        if (finalChunk) {
          const { text } = parser.feed(finalChunk);
          if (text) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, text: msg.text + text }
                  : msg
              )
            );
          }
        }

        setIsStreaming(false);
        abortControllerRef.current = null;
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          return;
        }
        setIsStreaming(false);
        abortControllerRef.current = null;
        const msg =
          err instanceof Error ? err.message : "Error streaming response";

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, error: msg } : m
          )
        );
      }
    },
    [isStreaming]
  );

  const resetChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setCurrentSources(null);
    setActiveSourceIndex(0);
    setIsStreaming(false);
  }, []);

  return {
    messages,
    isStreaming,
    currentSources,
    activeSourceIndex,
    setActiveSourceIndex,
    citedFiles,
    ask,
    resetChat,
  };
}
