import { embed } from "@/lib/gemini/embed";
import { ai, EMBED_MODEL } from "@/lib/gemini/client";
import { VECTOR_DIMENSION } from "@/lib/types";

// Dummy vector matching VECTOR_DIMENSION
const mockVector = new Array(VECTOR_DIMENSION).fill(0.1);

describe("embed", () => {
  let embedContentSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    embedContentSpy = jest.spyOn(ai.models, "embedContent");
  });

  afterEach(() => {
    jest.useRealTimers();
    embedContentSpy.mockRestore();
  });

  it("handles empty input without calling Gemini", async () => {
    const result = await embed([], "document");
    expect(result).toEqual([]);
    expect(embedContentSpy).not.toHaveBeenCalled();
  });

  it("batches requests into groups of 50 and passes correct taskType", async () => {
    // 120 items -> 3 batches: 50, 50, 20
    const texts = Array.from({ length: 120 }, (_, i) => `text ${i}`);

    embedContentSpy.mockImplementation(async (params: any) => {
      const count = params.contents.length;
      return {
        embeddings: Array.from({ length: count }, () => ({ values: [...mockVector] })),
      };
    });

    const resultPromise = embed(texts, "document");
    await jest.runAllTimersAsync();
    const result = await resultPromise;

    expect(embedContentSpy).toHaveBeenCalledTimes(3);

    // Verify first call batch size 50
    expect(embedContentSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        model: EMBED_MODEL,
        contents: expect.arrayContaining([texts[0], texts[49]]),
        config: {
          taskType: "RETRIEVAL_DOCUMENT",
          outputDimensionality: VECTOR_DIMENSION,
        },
      })
    );
    expect(embedContentSpy.mock.calls[0][0].contents.length).toBe(50);
    expect(embedContentSpy.mock.calls[1][0].contents.length).toBe(50);
    expect(embedContentSpy.mock.calls[2][0].contents.length).toBe(20);

    expect(result.length).toBe(120);
  });

  it("uses CODE_RETRIEVAL_QUERY for query mode", async () => {
    embedContentSpy.mockResolvedValueOnce({
      embeddings: [{ values: [...mockVector] }],
    });

    const resultPromise = embed(["search query"], "query");
    await jest.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toHaveLength(1);
    expect(embedContentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        config: {
          taskType: "CODE_RETRIEVAL_QUERY",
          outputDimensionality: VECTOR_DIMENSION,
        },
      })
    );
  });

  it("retries failed embedding calls with backoff and succeeds if a later attempt passes", async () => {
    embedContentSpy
      .mockRejectedValueOnce(new Error("Rate limit 429"))
      .mockRejectedValueOnce(new Error("Temporary server error 503"))
      .mockResolvedValueOnce({
        embeddings: [{ values: [...mockVector] }],
      });

    const resultPromise = embed(["text to embed"], "document");
    await jest.runAllTimersAsync();
    const result = await resultPromise;

    expect(embedContentSpy).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(1);
  });

  it("throws after 4 failed attempts", async () => {
    embedContentSpy.mockRejectedValue(new Error("Persistent error"));

    const resultPromise = embed(["text"], "document");
    // Attach error handler to prevent unhandled rejection warning while timers advance
    const caught = resultPromise.catch((e) => e);

    await jest.runAllTimersAsync();

    const err = await caught;
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Persistent error");
    expect(embedContentSpy).toHaveBeenCalledTimes(4);
  });

  it("throws when returned embeddings count does not match batch size", async () => {
    // Expect 2 embeddings, mock returns only 1
    embedContentSpy.mockResolvedValue({
      embeddings: [{ values: [...mockVector] }],
    });

    const resultPromise = embed(["text 1", "text 2"], "document");
    const caught = resultPromise.catch((e) => e);

    await jest.runAllTimersAsync();

    const err = await caught;
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain("Embedding count mismatch: expected 2, received 1");
  });
});
