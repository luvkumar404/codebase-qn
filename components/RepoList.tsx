"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RepoStatusResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface RepoItemState extends RepoStatusResponse {
  isReindexing?: boolean;
}

interface RepoListProps {
  repos: RepoItemState[];
  onSelectRepo: (repo: RepoItemState) => void;
  onReindex: (repo: RepoItemState) => void;
  onRemove: (repoId: string) => void;
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "–";
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
}

export function RepoList({
  repos,
  onSelectRepo,
  onReindex,
  onRemove,
}: RepoListProps) {
  if (repos.length === 0) {
    return (
      <div className="mt-5 bg-card border border-border rounded-[22px] overflow-hidden">
        <p className="p-12 text-center text-muted-foreground text-sm">
          No repositories yet. Paste a GitHub URL above to index your first one.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 bg-card border border-border rounded-[22px] overflow-hidden">
      <div className="hidden min-[861px]:grid grid-cols-[2.2fr_1.1fr_0.7fr_0.8fr_1fr_auto] gap-4 items-center px-6 py-3 text-xs uppercase tracking-wider text-muted-foreground bg-secondary font-medium">
        <span>Repository</span>
        <span>Status</span>
        <span>Files</span>
        <span>Chunks</span>
        <span>Indexed</span>
        <span />
      </div>

      {repos.map((r) => {
        const name = r.url
          .replace(/^https:\/\/github\.com\//, "")
          .replace(/\/$/, "");
        const statusLabel =
          r.status === "ready"
            ? "Ready"
            : r.status === "indexing" || r.isReindexing
            ? "Indexing"
            : "Failed";

        const isBusy = r.status === "indexing" || r.isReindexing;
        const subText = r.error
          ? r.error
          : r.commitSha
          ? `commit ${r.commitSha.slice(0, 7)}`
          : "ready";

        return (
          <div
            key={r.id}
            className="grid grid-cols-[2.2fr_1.1fr_0.7fr_0.8fr_1fr_auto] max-[860px]:grid-cols-2 gap-4 items-center px-6 py-4 max-[860px]:p-5 border-t border-border first:border-t-0"
          >
            <div className="font-mono text-sm max-[860px]:col-span-full">
              <span className="text-foreground">{name}</span>
              <small className="block mt-0.5 font-sans text-xs text-muted-foreground">
                {subText}
              </small>
            </div>

            <div>
              {r.status === "ready" && !r.isReindexing ? (
                <Badge
                  variant="outline"
                  className="gap-2 border-transparent bg-transparent text-ok font-normal text-[13px] px-0"
                >
                  <span className="w-2 h-2 rounded-full bg-ok shrink-0" aria-hidden="true" />
                  {statusLabel}
                </Badge>
              ) : r.status === "failed" ? (
                <Badge
                  variant="outline"
                  className="gap-2 border-transparent bg-transparent text-destructive font-normal text-[13px] px-0"
                >
                  <span className="w-2 h-2 rounded-full bg-destructive shrink-0" aria-hidden="true" />
                  {statusLabel}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="gap-2 border-transparent bg-transparent text-primary font-normal text-[13px] px-0"
                >
                  <span className="w-2 h-2 rounded-full bg-primary animate-status-pulse motion-reduce:animate-none shrink-0" aria-hidden="true" />
                  {statusLabel}
                </Badge>
              )}
            </div>

            <span className="font-mono text-sm text-muted-foreground">
              {r.files || "–"}
            </span>

            <span className="font-mono text-sm text-muted-foreground">
              {r.chunks ? r.chunks.toLocaleString() : "–"}
            </span>

            <span className="font-mono text-sm text-muted-foreground">
              {isBusy ? "now" : formatRelativeTime(r.indexedAt)}
            </span>

            <div className="flex gap-1.5 justify-end flex-wrap max-[860px]:col-span-full max-[860px]:justify-start">
              <Button
                shape="pill"
                size="sm"
                render={
                  <Link
                    href="/"
                    onClick={() => onSelectRepo(r)}
                    aria-disabled={r.status !== "ready" || r.isReindexing}
                  />
                }
                disabled={r.status !== "ready" || r.isReindexing}
                className={cn(
                  "bg-primary text-primary-foreground font-semibold px-3.5 py-1 text-[13px] h-7",
                  (r.status !== "ready" || r.isReindexing) &&
                    "opacity-45 pointer-events-none"
                )}
              >
                Ask
              </Button>

              <Button
                type="button"
                variant="outline"
                shape="pill"
                size="sm"
                disabled={isBusy}
                className="bg-transparent border-border hover:border-primary text-foreground px-3.5 py-1 text-[13px] h-7"
                onClick={() => onReindex(r)}
              >
                Re-index
              </Button>

              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      type="button"
                      variant="destructive-outline"
                      shape="pill"
                      size="sm"
                      className="px-3.5 py-1 text-[13px] h-7"
                    >
                      Remove
                    </Button>
                  }
                />
                <AlertDialogContent className="bg-card border-border rounded-2xl max-w-sm">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-display text-lg text-foreground">
                      Remove from this list?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground text-sm">
                      Remove {name} from this list? The data stays in the
                      database.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="bg-transparent border-0 gap-2 sm:justify-end">
                    <AlertDialogCancel
                      variant="outline"
                      className="rounded-full border-border text-foreground hover:bg-secondary"
                    >
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => onRemove(r.id)}
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        );
      })}
    </div>
  );
}
