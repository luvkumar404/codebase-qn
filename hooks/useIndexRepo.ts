"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { indexRepository } from "@/lib/api";
import {
  setStoredItem,
  getStoredItem,
  STORAGE_KEYS,
  StoredRepo,
  ActiveRepo,
} from "@/lib/storage";
import { IndexResponse } from "@/lib/types";

export const GITHUB_URL_REGEX = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/;

export function useIndexRepo(
  onSuccess?: (result: IndexResponse) => void
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setStatusMessage("Indexing cancelled.");
    }
  }, []);

  const index = useCallback(
    async (rawUrl: string): Promise<IndexResponse | null> => {
      const trimmed = rawUrl.trim();
      setError(null);
      setStatusMessage(null);

      if (!GITHUB_URL_REGEX.test(trimmed)) {
        setError(
          "Enter a public GitHub URL like https://github.com/owner/repo."
        );
        return null;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setStatusMessage(
        "Indexing. This can take a few minutes for larger repositories."
      );

      try {
        const result = await indexRepository(trimmed, controller.signal);
        setIsLoading(false);
        abortControllerRef.current = null;

        const ownerRepo = trimmed
          .replace(/^https:\/\/github\.com\//, "")
          .replace(/\/$/, "");

        setStatusMessage(
          `Indexed ${ownerRepo}: ${result.files} files, ${result.chunks.toLocaleString()} chunks.`
        );

        // Update active repo in storage
        const active: ActiveRepo = {
          repoId: result.repoId,
          url: result.url,
        };
        setStoredItem(STORAGE_KEYS.ACTIVE_REPO, active);

        // Update repos list in storage
        const currentRepos = getStoredItem<StoredRepo[]>(
          STORAGE_KEYS.REPOS,
          []
        );
        const exists = currentRepos.some((r) => r.repoId === result.repoId);
        if (!exists) {
          const updated: StoredRepo[] = [
            {
              repoId: result.repoId,
              url: result.url,
              addedAt: new Date().toISOString(),
            },
            ...currentRepos,
          ];
          setStoredItem(STORAGE_KEYS.REPOS, updated);
        }

        if (onSuccess) {
          onSuccess(result);
        }
        return result;
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          return null;
        }
        setIsLoading(false);
        abortControllerRef.current = null;
        const msg =
          err instanceof Error ? err.message : "Failed to index repository";
        setError(msg);
        setStatusMessage(null);
        return null;
      }
    },
    [onSuccess]
  );

  return {
    index,
    cancel,
    isLoading,
    error,
    statusMessage,
  };
}
