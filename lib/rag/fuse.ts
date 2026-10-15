export interface IdentifiableItem {
  id: string;
}

export interface FusedItem<T> {
  item: T;
  score: number;
}

const DEFAULT_K = 60;

/**
 * Reciprocal Rank Fusion (RRF) algorithm:
 * Combines multiple ranked lists of items into a single ranked list.
 * For each list, an item at 1-based rank r contributes: 1 / (k + r).
 * Items appearing in multiple lists accumulate higher scores.
 * Tie-breaker: item id ascending (guaranteeing deterministic ordering).
 *
 * @param listA First ranked list (e.g. vector search results)
 * @param listB Second ranked list (e.g. keyword search results)
 * @param k Smoothing constant (default 60)
 * @param topK Maximum number of fused items to return
 */
export function reciprocalRankFusion<T extends IdentifiableItem>(
  listA: T[],
  listB: T[],
  k = DEFAULT_K,
  topK = 8
): T[] {
  const scores = new Map<string, { item: T; score: number }>();

  // Helper to add ranked contributions
  function addRankings(list: T[]): void {
    list.forEach((item, index) => {
      const rank = index + 1; // 1-based rank
      const contribution = 1.0 / (k + rank);

      const existing = scores.get(item.id);
      if (existing) {
        existing.score += contribution;
      } else {
        scores.set(item.id, { item, score: contribution });
      }
    });
  }

  addRankings(listA);
  addRankings(listB);

  const fused = Array.from(scores.values());

  // Sort descending by score; break ties deterministically by ID ascending
  fused.sort((a, b) => {
    const diff = b.score - a.score;
    if (Math.abs(diff) > 1e-9) {
      return diff;
    }
    return a.item.id.localeCompare(b.item.id);
  });

  return fused.slice(0, topK).map((entry) => entry.item);
}
