"use client";

import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Source } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SourcePanelProps {
  sources: Source[] | null;
  activeSourceIndex: number;
  onSelectSource: (index: number) => void;
}

export function SourcePanel({
  sources,
  activeSourceIndex,
  onSelectSource,
}: SourcePanelProps) {
  const countLabel =
    sources && sources.length > 0 ? `${sources.length} cited` : "";

  const renderContent = () => {
    if (sources === null) {
      return (
        <p className="p-6 text-sm text-muted-foreground max-w-[38ch] leading-relaxed">
          Cited code appears here. Select a numbered citation in an answer.
        </p>
      );
    }

    if (sources.length === 0) {
      return (
        <p className="p-6 text-sm text-muted-foreground max-w-[38ch] leading-relaxed">
          No sources for this answer.
        </p>
      );
    }

    const currentSource = sources[activeSourceIndex] || sources[0];
    const lines = currentSource.content.split("\n");

    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div
          className="border-b border-border max-h-[36%] overflow-y-auto"
          role="tablist"
          aria-label="Source files"
        >
          {sources.map((s, idx) => {
            const isActive = idx === activeSourceIndex;
            return (
              <button
                key={`${s.filePath}-${s.startLine}-${idx}`}
                role="tab"
                type="button"
                aria-selected={isActive}
                className={cn(
                  "w-full flex items-baseline gap-3 px-6 py-2.5 bg-transparent border-0 border-l-[3px] border-l-transparent text-left font-mono text-[13px] text-muted-foreground cursor-pointer transition-colors hover:bg-secondary",
                  isActive && "bg-accent-soft border-l-primary text-foreground"
                )}
                onClick={() => onSelectSource(idx)}
              >
                <span className="shrink-0">{idx + 1}</span>
                <span className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                  {s.filePath}
                </span>
                <span className="shrink-0 opacity-80">
                  {s.startLine}–{s.endLine}
                </span>
              </button>
            );
          })}
        </div>

        <ScrollArea className="flex-1 py-3.5 font-mono text-[13px] leading-[1.7]">
          <pre tabIndex={0} aria-label="Source code" className="font-mono m-0">
            {lines.map((line, k) => {
              const lineNo = currentSource.startLine + k;
              return (
                <div
                  key={k}
                  className="flex text-foreground bg-accent-soft border-l-[3px] border-primary"
                >
                  <span className="shrink-0 w-14 pr-4 text-right select-none opacity-60 text-[#77746d]">
                    {lineNo}
                  </span>
                  <span className="whitespace-pre pr-6">{line || " "}</span>
                </div>
              );
            })}
          </pre>
        </ScrollArea>
      </div>
    );
  };

  return (
    <Card className="bg-card border-border rounded-[22px] flex flex-col min-h-[540px] max-h-[620px] overflow-hidden p-0 gap-0">
      <h2 className="m-0 px-6 py-4.5 font-display text-[15px] font-medium text-muted-foreground border-b border-border flex justify-between items-center">
        <span>Sources</span>
        <span>{countLabel}</span>
      </h2>
      {renderContent()}
    </Card>
  );
}
