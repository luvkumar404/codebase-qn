"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface EvalSetup {
  name: string;
  note: string;
  hits: number;
  best?: boolean;
}

interface EvalBarsProps {
  total: number;
  setups: EvalSetup[];
}

export function EvalBars({ total, setups }: EvalBarsProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setAnimated(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="grid gap-5">
      {setups.map((s) => {
        const pct = Math.round((s.hits / total) * 100);
        const width = animated ? `${pct}%` : "0%";

        return (
          <div key={s.name}>
            <div className="flex justify-between items-baseline mb-2 text-[15px]">
              <span>
                <span className="text-foreground">{s.name}</span>
                <small className="block text-muted-foreground text-[13px] mt-0.5">
                  {s.note}
                </small>
              </span>
              <b className="font-display text-[28px] tracking-[-0.02em] text-foreground">
                {pct}%
              </b>
            </div>
            <div
              className="h-3.5 bg-secondary rounded-full overflow-hidden"
              role="img"
              aria-label={`${s.name}: ${s.hits} of ${total} questions, ${pct}%`}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-1000 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none",
                  s.best ? "bg-primary" : "bg-[#55535a]"
                )}
                style={{ width }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
