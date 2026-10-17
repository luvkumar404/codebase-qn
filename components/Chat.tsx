"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/hooks/useAskStream";
import { Answer } from "./Answer";

interface ChatProps {
  repoName: string;
  messages: ChatMessage[];
  isStreaming: boolean;
  activeSourceIndex: number;
  onSelectSource: (index: number) => void;
  onAsk: (question: string) => void;
}

const SUGGESTED_QUESTION = "Where is authentication handled?";

export function Chat({
  repoName,
  messages,
  isStreaming,
  activeSourceIndex,
  onSelectSource,
  onAsk,
}: ChatProps) {
  const [question, setQuestion] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isStreaming) return;
    onAsk(trimmed);
    setQuestion("");
  };

  return (
    <Card className="bg-card border-border rounded-[22px] flex flex-col min-h-[540px] max-h-[620px] overflow-hidden p-0 gap-0">
      <h2 className="m-0 px-6 py-4.5 font-display text-[15px] font-medium text-muted-foreground border-b border-border flex justify-between items-center">
        <span>Conversation</span>
        <span className="font-mono text-[13px] text-muted-foreground">
          {repoName}
        </span>
      </h2>

      <div
        className="flex-1 overflow-y-auto p-6"
        ref={threadRef}
        aria-live="polite"
        aria-atomic="false"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-start">
            <p className="text-muted-foreground max-w-[40ch] mb-4 text-[15px] leading-relaxed">
              Ask where something happens. Answers cite numbered sources, and
              selecting one shows the lines on the right.
            </p>
            <button
              type="button"
              className="px-4 py-2.5 bg-transparent border border-border rounded-full text-foreground text-sm text-left hover:border-primary transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
              onClick={() => onAsk(SUGGESTED_QUESTION)}
              aria-label={`Ask suggested question: ${SUGGESTED_QUESTION}`}
            >
              {SUGGESTED_QUESTION}
            </button>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="mb-7">
              {msg.role === "user" ? (
                <div className="font-display text-xl font-medium tracking-tight mb-3.5 text-foreground">
                  {msg.text}
                </div>
              ) : (
                <div className="text-[#dcd9d2]">
                  <Answer
                    text={msg.text}
                    sources={msg.sources}
                    activeSourceIndex={activeSourceIndex}
                    onSelectSource={onSelectSource}
                  />
                  {msg.error && (
                    <div className="text-destructive text-sm mt-2" role="alert">
                      {msg.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <form
        className="flex gap-2 mx-4 mb-4 p-1.5 border border-border rounded-full bg-background focus-within:border-primary transition-colors"
        onSubmit={handleSubmit}
      >
        <Input
          id="chat-question-input"
          type="text"
          className="flex-1 min-w-0 px-4 bg-transparent border-0 text-foreground text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:border-0 shadow-none h-9"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about this code"
          aria-label="Question"
          autoComplete="off"
          disabled={isStreaming}
        />
        <Button
          type="submit"
          shape="pill"
          size="sm"
          className="px-5 font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-45 h-9"
          disabled={isStreaming || !question.trim()}
        >
          Ask
        </Button>
      </form>
    </Card>
  );
}
