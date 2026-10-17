import { Source } from "./types";

export interface StreamFeedResult {
  sources: Source[] | null;
  text: string;
}

export class StreamParser {
  private buffer = "";
  private headerParsed = false;
  private sources: Source[] = [];

  /**
   * Feed a chunk into the parser.
   * If the header has not yet been parsed, it buffers until '\n'.
   * Once '\n' is found, it parses the sources line.
   * Any text in the chunk after '\n' (or in subsequent chunks) is returned as `text`.
   */
  feed(chunk: string): StreamFeedResult {
    if (!this.headerParsed) {
      this.buffer += chunk;
      const newlineIndex = this.buffer.indexOf("\n");
      if (newlineIndex === -1) {
        return { sources: null, text: "" };
      }

      const firstLine = this.buffer.slice(0, newlineIndex);
      const remainingText = this.buffer.slice(newlineIndex + 1);
      this.headerParsed = true;

      try {
        const parsed = JSON.parse(firstLine);
        if (
          !parsed ||
          typeof parsed !== "object" ||
          !Array.isArray(parsed.sources)
        ) {
          throw new Error("Invalid stream header: missing 'sources' array");
        }
        this.sources = parsed.sources as Source[];
      } catch (err) {
        throw new Error(
          err instanceof Error
            ? `Failed to parse stream header: ${err.message}`
            : "Failed to parse stream header"
        );
      }

      return {
        sources: this.sources,
        text: remainingText,
      };
    }

    return {
      sources: null,
      text: chunk,
    };
  }

  isHeaderParsed(): boolean {
    return this.headerParsed;
  }

  getSources(): Source[] {
    return this.sources;
  }

  reset(): void {
    this.buffer = "";
    this.headerParsed = false;
    this.sources = [];
  }
}
