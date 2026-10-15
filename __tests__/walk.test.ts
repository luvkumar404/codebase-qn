import fs from "fs";
import path from "path";
import os from "os";
import { walkRepo } from "@/lib/ingest/walk";

describe("walkRepo", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "walk-test-"));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it("indexes source files and skips node_modules, lockfiles, large files, and binaries", () => {
    // 1. Valid source files
    const srcDir = path.join(tempDir, "src");
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, "app.ts"), "export const a = 1;");
    fs.writeFileSync(path.join(tempDir, "README.md"), "# Hello");

    // 2. node_modules (should be skipped)
    const nmDir = path.join(tempDir, "node_modules", "some-pkg");
    fs.mkdirSync(nmDir, { recursive: true });
    fs.writeFileSync(path.join(nmDir, "index.js"), "module.exports = {};");

    // 3. Lockfiles (should be skipped)
    fs.writeFileSync(path.join(tempDir, "package-lock.json"), "{}");
    fs.writeFileSync(path.join(tempDir, "yarn.lock"), "# yarn lock");

    // 4. Large files > 200 KB (should be skipped)
    const largeContent = Buffer.alloc(205 * 1024, "x");
    fs.writeFileSync(path.join(srcDir, "huge.ts"), largeContent);

    // 5. Binary extensions (should be skipped)
    fs.writeFileSync(path.join(tempDir, "image.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    fs.writeFileSync(path.join(tempDir, "audio.mp3"), Buffer.from([0xff, 0xfb]));

    // 6. Non-indexable text files (e.g., .csv, .txt)
    fs.writeFileSync(path.join(tempDir, "data.csv"), "a,b,c");

    const files = walkRepo(tempDir);
    const relativePaths = files.map((f) => f.relativePath).sort();

    expect(relativePaths).toEqual(["README.md", "src/app.ts"]);
  });

  it("handles empty directory cleanly", () => {
    const files = walkRepo(tempDir);
    expect(files).toEqual([]);
  });
});
