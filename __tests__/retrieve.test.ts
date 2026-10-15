import { extractKeywords } from "@/lib/rag/retrieve";

describe("extractKeywords", () => {
  it("extracts identifier-like words matching /[A-Za-z_][A-Za-z0-9_]{2,}/g", () => {
    const question = "Where is the authenticateUser function called in auth_service?";
    const keywords = extractKeywords(question);

    expect(keywords).toContain("Where");
    expect(keywords).toContain("the");
    expect(keywords).toContain("authenticateUser");
    expect(keywords).toContain("function");
    expect(keywords).toContain("called");
    expect(keywords).toContain("auth_service");
    // "is" and "in" are 2 letters -> skipped (pattern requires at least 3 chars total: 1 + {2,})
    expect(keywords).not.toContain("is");
    expect(keywords).not.toContain("in");
  });

  it("deduplicates keywords case-insensitively", () => {
    const question = "Handle user, User, USER and userController";
    const keywords = extractKeywords(question);

    expect(keywords.filter((k) => k.toLowerCase() === "user").length).toBe(1);
    expect(keywords).toContain("userController");
  });

  it("caps keywords at maximum 12 items", () => {
    const question =
      "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen";
    const keywords = extractKeywords(question);

    expect(keywords.length).toBe(12);
  });

  it("handles questions without valid identifiers", () => {
    expect(extractKeywords("??? !!! ...")).toEqual([]);
    expect(extractKeywords("")).toEqual([]);
  });
});
