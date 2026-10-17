"use client";

import { useState, useEffect, useCallback } from "react";
import { getStoredItem, setStoredItem, removeStoredItem, STORAGE_KEYS, ActiveRepo } from "@/lib/storage";
import { fetchRepoStatus } from "@/lib/api";

export function useActiveRepo() {
  const [activeRepo, setActiveRepoState] = useState<ActiveRepo | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const saved = getStoredItem<ActiveRepo | null>(STORAGE_KEYS.ACTIVE_REPO, null);
    if (!saved || !saved.repoId) {
      setIsValidating(false);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    fetchRepoStatus(saved.repoId, controller.signal)
      .then(() => {
        if (isMounted) {
          setActiveRepoState(saved);
          setIsValidating(false);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        // If 404 or not found, clear stored repo
        if (err?.status === 404) {
          removeStoredItem(STORAGE_KEYS.ACTIVE_REPO);
          setActiveRepoState(null);
        } else {
          // If network error, still restore active repo from localStorage
          setActiveRepoState(saved);
        }
        setIsValidating(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const setActiveRepo = useCallback((repo: ActiveRepo | null) => {
    setActiveRepoState(repo);
    if (repo) {
      setStoredItem(STORAGE_KEYS.ACTIVE_REPO, repo);
    } else {
      removeStoredItem(STORAGE_KEYS.ACTIVE_REPO);
    }
  }, []);

  return { activeRepo, setActiveRepo, isValidating };
}
