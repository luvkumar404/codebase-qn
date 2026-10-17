"use client";

import { useState, useEffect, useCallback } from "react";
import { DotField } from "@/components/DotField";
import { RepoForm } from "@/components/RepoForm";
import { RepoList, RepoItemState } from "@/components/RepoList";
import { useIndexRepo } from "@/hooks/useIndexRepo";
import { useActiveRepo } from "@/hooks/useActiveRepo";
import {
  getStoredItem,
  setStoredItem,
  STORAGE_KEYS,
  StoredRepo,
} from "@/lib/storage";
import { fetchRepoStatus, indexRepository } from "@/lib/api";

export default function ReposPage() {
  const [repoItems, setRepoItems] = useState<RepoItemState[]>([]);
  const { setActiveRepo, activeRepo } = useActiveRepo();

  const loadRepos = useCallback(async () => {
    const stored = getStoredItem<StoredRepo[]>(STORAGE_KEYS.REPOS, []);
    if (stored.length === 0) {
      setRepoItems([]);
      return;
    }

    const fetchedItems: RepoItemState[] = [];
    const validStored: StoredRepo[] = [];

    await Promise.all(
      stored.map(async (entry) => {
        try {
          const status = await fetchRepoStatus(entry.repoId);
          fetchedItems.push(status);
          validStored.push(entry);
        } catch (err: unknown) {
          const status = (err as { status?: number })?.status;
          if (status !== 404) {
            fetchedItems.push({
              id: entry.repoId,
              url: entry.url,
              status: "failed",
              commitSha: null,
              error: err instanceof Error ? err.message : "Network error",
              indexedAt: entry.addedAt,
              files: 0,
              chunks: 0,
            });
            validStored.push(entry);
          }
        }
      })
    );

    if (validStored.length !== stored.length) {
      setStoredItem(STORAGE_KEYS.REPOS, validStored);
    }

    fetchedItems.sort((a, b) => {
      const timeA = a.indexedAt ? new Date(a.indexedAt).getTime() : 0;
      const timeB = b.indexedAt ? new Date(b.indexedAt).getTime() : 0;
      return timeB - timeA;
    });

    setRepoItems(fetchedItems);
  }, []);

  useEffect(() => {
    loadRepos();
  }, [loadRepos]);

  const handleIndexSuccess = useCallback(async () => {
    await loadRepos();
  }, [loadRepos]);

  const { index, cancel, isLoading, error, statusMessage } =
    useIndexRepo(handleIndexSuccess);

  const handleSelectRepo = (repo: RepoItemState) => {
    setActiveRepo({ repoId: repo.id, url: repo.url });
  };

  const handleReindex = async (repo: RepoItemState) => {
    setRepoItems((prev) =>
      prev.map((r) => (r.id === repo.id ? { ...r, isReindexing: true } : r))
    );
    try {
      const res = await indexRepository(repo.url);
      const updated = await fetchRepoStatus(res.repoId);
      setRepoItems((prev) =>
        prev.map((r) => (r.id === repo.id ? updated : r))
      );
    } catch (err) {
      setRepoItems((prev) =>
        prev.map((r) =>
          r.id === repo.id
            ? {
                ...r,
                isReindexing: false,
                status: "failed",
                error:
                  err instanceof Error ? err.message : "Re-indexing failed",
              }
            : r
        )
      );
    }
  };

  const handleRemove = (repoId: string) => {
    const current = getStoredItem<StoredRepo[]>(STORAGE_KEYS.REPOS, []);
    const updated = current.filter((r) => r.repoId !== repoId);
    setStoredItem(STORAGE_KEYS.REPOS, updated);
    setRepoItems((prev) => prev.filter((r) => r.id !== repoId));

    if (activeRepo?.repoId === repoId) {
      setActiveRepo(null);
    }
  };

  const readyRepos = repoItems.filter(
    (r) => r.status === "ready" && !r.isReindexing
  );
  const totalChunks = readyRepos.reduce((acc, r) => acc + (r.chunks || 0), 0);
  const indexingCount =
    (isLoading ? 1 : 0) +
    repoItems.filter((r) => r.status === "indexing" || r.isReindexing).length;

  return (
    <main className="max-w-[1100px] w-full mx-auto px-[clamp(24px,5vw,56px)] py-[clamp(24px,5vw,56px)] flex-1 flex flex-col">
      <div className="relative pb-7">
        <DotField variant="corner" />
        <h1 className="relative m-0 font-display font-bold text-[clamp(34px,6vw,60px)] leading-[1.04] tracking-[-0.03em] text-foreground">
          Your <em className="not-italic text-primary">repositories</em>
        </h1>
        <p className="relative mt-3.5 max-w-[56ch] text-muted-foreground text-lg leading-normal">
          Everything you have indexed. Re-index after new commits, or remove a
          repository from this browser.
        </p>
      </div>

      <div className="flex gap-3 flex-wrap my-7">
        <div className="flex-1 min-w-[150px] p-4 sm:p-5 bg-card border border-border rounded-[18px]">
          <b className="block font-display text-[30px] tracking-[-0.02em] text-foreground">
            {repoItems.length}
          </b>
          <span className="text-muted-foreground text-sm">repositories</span>
        </div>
        <div className="flex-1 min-w-[150px] p-4 sm:p-5 bg-card border border-border rounded-[18px]">
          <b className="block font-display text-[30px] tracking-[-0.02em] text-foreground">
            {totalChunks.toLocaleString()}
          </b>
          <span className="text-muted-foreground text-sm">chunks searchable</span>
        </div>
        <div className="flex-1 min-w-[150px] p-4 sm:p-5 bg-card border border-border rounded-[18px]">
          <b className="block font-display text-[30px] tracking-[-0.02em] text-foreground">
            {indexingCount}
          </b>
          <span className="text-muted-foreground text-sm">indexing now</span>
        </div>
      </div>

      <RepoForm
        index={index}
        cancel={cancel}
        isLoading={isLoading}
        error={error}
        statusMessage={statusMessage}
        buttonLabel="Index repository"
      />

      <RepoList
        repos={repoItems}
        onSelectRepo={handleSelectRepo}
        onReindex={handleReindex}
        onRemove={handleRemove}
      />

      <footer className="mt-auto px-[clamp(20px,5vw,56px)] pt-7 pb-12 text-muted-foreground text-[13px] text-center">
        Repositories are tracked locally in this browser.
      </footer>
    </main>
  );
}
