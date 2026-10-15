import { cleanCitations, extractValidCitations } from "@/lib/rag/citations";

describe("citations", () => {
  const totalSources = 3;

  it("keeps valid [n] markers within range", () => {
    const input = "The main entry point is in [1] and uses helpers from [2].";
    const cleaned = cleanCitations(input, totalSources);
    expect(cleaned).toBe("The main entry point is in [1] and uses helpers from [2].");

    const extracted = extractValidCitations(input, totalSources);
    expect(extracted).toEqual([1, 2]);
  });

  it("removes out-of-range [n] markers (n > totalSources or n < 1)", () => {
    const input = "Defined in [1] and invalid [4] and also [0] and [99].";
    const cleaned = cleanCitations(input, totalSources);
    expect(cleaned).toBe("Defined in [1] and invalid and also and.");

    const extracted = extractValidCitations(input, totalSources);
    expect(extracted).toEqual([1]);
  });

  it("handles repeated adjacent citation markers", () => {
    const input = "Found in [1][1] and also [2] [2] [2].";
    const cleaned = cleanCitations(input, totalSources);
    expect(cleaned).toBe("Found in [1] and also [2].");
  });

  it("cleans combined out-of-range and repeated markers properly", () => {
    const input = "Check [1][1] or out of range [5][5] or [2].";
    const cleaned = cleanCitations(input, totalSources);
    expect(cleaned).toBe("Check [1] or out of range or [2].");
  });
});
