"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface EvalQuestion {
  question: string;
  expectedFile: string;
  vector: number;
  hybrid: number;
  rerank: number;
}

interface EvalTableProps {
  questions: EvalQuestion[];
}

function StatusBadge({ hit }: { hit: boolean }) {
  return hit ? (
    <Badge
      variant="outline"
      className="inline-flex items-center justify-center gap-1 border-transparent bg-[rgba(123,216,143,0.14)] text-ok font-semibold text-xs px-2.5 py-0.5 rounded-full"
      aria-label="Hit"
    >
      <span aria-hidden="true">✓</span> Hit
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="inline-flex items-center justify-center gap-1 border-transparent bg-[rgba(255,138,122,0.12)] text-destructive font-semibold text-xs px-2.5 py-0.5 rounded-full"
      aria-label="Miss"
    >
      <span aria-hidden="true">✕</span> Miss
    </Badge>
  );
}

export function EvalTable({ questions }: EvalTableProps) {
  const [onlyMiss, setOnlyMiss] = useState(false);

  const filteredQuestions = questions.filter(
    (q) => !onlyMiss || !(q.vector && q.hybrid && q.rerank)
  );

  return (
    <div>
      <div className="flex justify-between items-center gap-3 flex-wrap mb-4">
        <label className="flex items-center gap-2.5 text-sm text-muted-foreground cursor-pointer select-none">
          <Checkbox
            checked={onlyMiss}
            onCheckedChange={(checked) => setOnlyMiss(Boolean(checked))}
          />
          <span>Show questions that missed in any setup</span>
        </label>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 border border-border rounded-full text-xs text-muted-foreground">
          {filteredQuestions.length} of {questions.length} shown
        </span>
      </div>

      <div className="overflow-x-auto">
        <Table className="w-full border-collapse min-w-[640px]">
          <TableHeader>
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="py-3 px-2.5 text-left text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Question
              </TableHead>
              <TableHead className="py-3 px-2.5 text-left text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Expected file
              </TableHead>
              <TableHead className="py-3 px-2.5 text-center text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Vector
              </TableHead>
              <TableHead className="py-3 px-2.5 text-center text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Hybrid
              </TableHead>
              <TableHead className="py-3 px-2.5 text-center text-xs uppercase tracking-wider text-muted-foreground font-medium">
                + Rerank
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredQuestions.map((q) => (
              <TableRow
                key={q.question}
                className="border-t border-border hover:bg-secondary/40 transition-colors"
              >
                <TableCell className="py-3 px-2.5 text-sm text-foreground">
                  {q.question}
                </TableCell>
                <TableCell className="py-3 px-2.5 font-mono text-[13px] text-muted-foreground">
                  {q.expectedFile}
                </TableCell>
                <TableCell className="py-3 px-2.5 text-center">
                  <StatusBadge hit={Boolean(q.vector)} />
                </TableCell>
                <TableCell className="py-3 px-2.5 text-center">
                  <StatusBadge hit={Boolean(q.hybrid)} />
                </TableCell>
                <TableCell className="py-3 px-2.5 text-center">
                  <StatusBadge hit={Boolean(q.rerank)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
