import { StreamParser } from "@/lib/stream";
import { Source } from "@/lib/types";

describe("StreamParser", () => {
  let parser: StreamParser;

  beforeEach(() => {
    parser = new StreamParser();
  });

  const mockSource: Source = {
    filePath: "src/auth.ts",
    startLine: 1,
    endLine: 10,
    content: "export const auth = true;",
  };

  it("handles sources line arriving split across chunks", () => {
    const chunk1 = '{"sources":[{"filePath":"src/auth.ts","sta';
    const chunk2 = 'rtLine":1,"endLine":10,"content":"export const auth = true;"}]}\n';
    const chunk3 = "Here is the explanation of the auth code.";

    const res1 = parser.feed(chunk1);
    expect(res1.sources).toBeNull();
    expect(res1.text).toBe("");
    expect(parser.isHeaderParsed()).toBe(false);

    const res2 = parser.feed(chunk2);
    expect(res2.sources).toEqual([mockSource]);
    expect(res2.text).toBe("");
    expect(parser.isHeaderParsed()).toBe(true);

    const res3 = parser.feed(chunk3);
    expect(res3.sources).toBeNull();
    expect(res3.text).toBe("Here is the explanation of the auth code.");
  });

  it("handles text arriving in the same chunk as the sources line", () => {
    const chunk = JSON.stringify({ sources: [mockSource] }) + "\nFirst line of answer text.";

    const res = parser.feed(chunk);
    expect(res.sources).toEqual([mockSource]);
    expect(res.text).toBe("First line of answer text.");
    expect(parser.isHeaderParsed()).toBe(true);
  });

  it("handles empty sources array correctly", () => {
    const chunk = '{"sources":[]}\nNo sources found for this question.';

    const res = parser.feed(chunk);
    expect(res.sources).toEqual([]);
    expect(res.text).toBe("No sources found for this question.");
    expect(parser.getSources()).toEqual([]);
  });

  it("handles invalid first line with a clear error", () => {
    const chunk = "not valid json at all\nSome text";

    expect(() => {
      parser.feed(chunk);
    }).toThrow(/Failed to parse stream header/);
  });

  it("handles missing sources property with a clear error", () => {
    const chunk = '{"otherKey":123}\nSome text';

    expect(() => {
      parser.feed(chunk);
    }).toThrow(/missing 'sources' array/);
  });
});
