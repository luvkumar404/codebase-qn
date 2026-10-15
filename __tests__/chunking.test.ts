import { chunkFallback } from "@/lib/chunking/fallback";
import { chunkMarkdown } from "@/lib/chunking/markdown";
import { chunkFile } from "@/lib/chunking/index";

describe("chunkFallback", () => {
  it("produces no chunks for empty content or whitespace-only content", () => {
    expect(chunkFallback("")).toEqual([]);
    expect(chunkFallback("   \n\n   \t  ")).toEqual([]);
  });

  it("produces one chunk for a tiny file", () => {
    const content = "console.log('hello world');\nconst x = 42;";
    const chunks = chunkFallback(content);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].startLine).toBe(1);
    expect(chunks[0].endLine).toBe(2);
    expect(chunks[0].content).toBe(content);
  });

  it("handles line numbers and overlapping windows correctly for larger files", () => {
    // Generate 100 lines without blank lines
    const lines = Array.from({ length: 100 }, (_, i) => `line_${i + 1}`);
    const content = lines.join("\n");

    const chunks = chunkFallback(content);
    expect(chunks.length).toBeGreaterThan(1);

    // First chunk: 60 lines (1 to 60)
    expect(chunks[0].startLine).toBe(1);
    expect(chunks[0].endLine).toBe(60);

    // Second chunk: with 8 overlap, should start at 53 (60 - 8 + 1 = 53)
    expect(chunks[1].startLine).toBe(53);
    expect(chunks[1].endLine).toBe(100);

    // Verify overlap content is preserved
    const chunk0Lines = chunks[0].content.split("\n");
    const chunk1Lines = chunks[1].content.split("\n");
    expect(chunk0Lines.slice(52)).toEqual(chunk1Lines.slice(0, 8));
  });

  it("prefers breaking at blank lines near boundary", () => {
    // 100 lines, with a blank line at line 55 (index 54)
    const lines = Array.from({ length: 100 }, (_, i) => (i === 54 ? "" : `line_${i + 1}`));
    const content = lines.join("\n");

    const chunks = chunkFallback(content);
    expect(chunks.length).toBeGreaterThan(1);
    // Should break at line 55 because it's a blank line within the overlap zone (60 - 8 = 52 to 60)
    expect(chunks[0].endLine).toBe(55);
  });
});

describe("chunkMarkdown", () => {
  it("produces no chunks for empty content", () => {
    expect(chunkMarkdown("")).toEqual([]);
  });

  it("splits markdown content by headings", () => {
    const md = `# Title\n\nIntroduction paragraph.\n\n## Section 1\n\nDetails here.\n\n### Sub 1.1\n\nMore details.`;
    const chunks = chunkMarkdown(md);

    expect(chunks.length).toBe(3);
    expect(chunks[0].content).toContain("# Title");
    expect(chunks[0].content).toContain("Introduction paragraph.");
    expect(chunks[0].startLine).toBe(1);

    expect(chunks[1].content).toContain("## Section 1");
    expect(chunks[2].content).toContain("### Sub 1.1");
  });

  it("handles preamble before the first heading", () => {
    const md = `Preamble before heading\n\n# Heading 1\nContent 1`;
    const chunks = chunkMarkdown(md);

    expect(chunks.length).toBe(2);
    expect(chunks[0].content).toBe("Preamble before heading");
    expect(chunks[0].startLine).toBe(1);
    expect(chunks[1].content).toBe("# Heading 1\nContent 1");
  });
});

describe("chunkFile dispatcher", () => {
  it("uses chunkMarkdown for .md files and chunkFallback for others", () => {
    const md = "# Title\n\nText";
    const ts = "const x = 1;\nconst y = 2;";

    const mdChunks = chunkFile("README.md", md);
    const tsChunks = chunkFile("src/index.ts", ts);

    expect(mdChunks[0].content).toContain("# Title");
    expect(tsChunks[0].content).toBe(ts);
  });
});
