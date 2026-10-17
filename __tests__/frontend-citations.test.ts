import { splitAnswerWithCitations } from "@/lib/citations";

describe("splitAnswerWithCitations", () => {
  const totalSources = 3;

  it("keeps valid [n] markers within range", () => {
    const input = "Authentication is handled in [1], while orders are in [2].";
    const segments = splitAnswerWithCitations(input, totalSources);

    expect(segments).toEqual([
      { type: "text", text: "Authentication is handled in " },
      { type: "citation", number: 1 },
      { type: "text", text: ", while orders are in " },
      { type: "citation", number: 2 },
      { type: "text", text: "." },
    ]);
  });

  it("removes out-of-range [n] markers (n > totalSources or n < 1)", () => {
    const input = "Check [1], but ignore [0] and [4] and [99].";
    const segments = splitAnswerWithCitations(input, totalSources);

    expect(segments).toEqual([
      { type: "text", text: "Check " },
      { type: "citation", number: 1 },
      { type: "text", text: ", but ignore  and  and ." },
    ]);
  });

  it("handles repeated markers by collapsing duplicates", () => {
    const input = "Found in [1][1] and [2] [2] [2].";
    const segments = splitAnswerWithCitations(input, totalSources);

    expect(segments).toEqual([
      { type: "text", text: "Found in " },
      { type: "citation", number: 1 },
      { type: "text", text: " and " },
      { type: "citation", number: 2 },
      { type: "text", text: "." },
    ]);
  });

  it("handles adjacent markers like [1][2] correctly", () => {
    const input = "See implementation in [1][2].";
    const segments = splitAnswerWithCitations(input, totalSources);

    expect(segments).toEqual([
      { type: "text", text: "See implementation in " },
      { type: "citation", number: 1 },
      { type: "citation", number: 2 },
      { type: "text", text: "." },
    ]);
  });

  it("handles text with no markers", () => {
    const input = "Plain answer text without any citations.";
    const segments = splitAnswerWithCitations(input, totalSources);

    expect(segments).toEqual([
      { type: "text", text: "Plain answer text without any citations." },
    ]);
  });

  it("handles empty string input", () => {
    expect(splitAnswerWithCitations("", totalSources)).toEqual([]);
  });
});
