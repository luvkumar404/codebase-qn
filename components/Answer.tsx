"use client";

import { useMemo } from "react";
import { Source } from "@/lib/types";
import { splitAnswerWithCitations } from "@/lib/citations";
import { CitationChip } from "./CitationChip";

interface AnswerProps {
  text: string;
  sources?: Source[];
  activeSourceIndex: number;
  onSelectSource: (index: number) => void;
}

export function Answer({
  text,
  sources = [],
  activeSourceIndex,
  onSelectSource,
}: AnswerProps) {
  const segments = useMemo(() => {
    return splitAnswerWithCitations(text, sources.length);
  }, [text, sources.length]);

  return (
    <div className="text-[#dcd9d2] leading-[1.65] whitespace-pre-wrap break-words">
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={index}>{segment.text}</span>;
        }

        const sourceIndex = segment.number - 1;
        const source = sources[sourceIndex];

        return (
          <CitationChip
            key={index}
            number={segment.number}
            isActive={sourceIndex === activeSourceIndex}
            onClick={() => onSelectSource(sourceIndex)}
            source={source}
          />
        );
      })}
    </div>
  );
}
