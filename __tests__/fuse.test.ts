import { reciprocalRankFusion } from "@/lib/rag/fuse";

interface TestItem {
  id: string;
  name: string;
}

describe("reciprocalRankFusion", () => {
  it("ranks items that appear in both lists higher than items appearing in only one", () => {
    const listA: TestItem[] = [
      { id: "item-1", name: "Item 1" },
      { id: "item-2", name: "Item 2" },
      { id: "item-3", name: "Item 3" },
    ];

    const listB: TestItem[] = [
      { id: "item-4", name: "Item 4" },
      { id: "item-2", name: "Item 2" }, // appears in both!
      { id: "item-5", name: "Item 5" },
    ];

    const fused = reciprocalRankFusion(listA, listB, 60, 5);

    // item-2 appears in listA at rank 2 (1/62) and in listB at rank 2 (1/62) -> score ~ 0.0322
    // item-1 appears in listA at rank 1 (1/61) -> score ~ 0.0163
    // item-4 appears in listB at rank 1 (1/61) -> score ~ 0.0163
    expect(fused[0].id).toBe("item-2");
  });

  it("produces deterministic ordering on tied scores", () => {
    // Two items with identical score contributions
    const listA: TestItem[] = [
      { id: "zebra", name: "Zebra" },
      { id: "apple", name: "Apple" },
    ];
    const listB: TestItem[] = [];

    // listA only: zebra has rank 1 (1/61), apple has rank 2 (1/62)
    // Now let's create exact tied scores:
    const list1: TestItem[] = [{ id: "b-item", name: "B" }];
    const list2: TestItem[] = [{ id: "a-item", name: "A" }];

    // Both have 1/61 score
    const fused = reciprocalRankFusion(list1, list2, 60, 10);
    expect(fused.length).toBe(2);
    // Tie-breaker: ID ascending ('a-item' before 'b-item')
    expect(fused[0].id).toBe("a-item");
    expect(fused[1].id).toBe("b-item");

    // Repeat to ensure repeatability / determinism
    const fusedAgain = reciprocalRankFusion(list1, list2, 60, 10);
    expect(fusedAgain).toEqual(fused);
  });

  it("respects topK limit", () => {
    const listA = Array.from({ length: 15 }, (_, i) => ({
      id: `item-${i + 1}`,
      name: `Item ${i + 1}`,
    }));

    const fused = reciprocalRankFusion(listA, [], 60, 8);
    expect(fused.length).toBe(8);
  });

  it("handles empty lists gracefully", () => {
    expect(reciprocalRankFusion([], [], 60, 8)).toEqual([]);
  });
});
