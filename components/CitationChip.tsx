"use client";

import { Source } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CitationChipProps {
  number: number;
  isActive: boolean;
  onClick: () => void;
  source?: Source;
}

export function CitationChip({
  number,
  isActive,
  onClick,
  source,
}: CitationChipProps) {
  const ariaLabel = source
    ? `Show source ${number}: ${source.filePath}`
    : `Show source ${number}`;

  return (
    <button
      type="button"
      className={cn(
        "inline-block min-w-[1.7em] mx-0.5 px-1.5 border border-primary rounded-md bg-transparent text-primary font-mono text-xs cursor-pointer align-[1px] transition-colors hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
        isActive && "bg-primary text-primary-foreground font-semibold hover:bg-primary"
      )}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {number}
    </button>
  );
}
