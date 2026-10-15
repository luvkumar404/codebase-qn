import fs from "fs";
import path from "path";
import { MAX_FILE_SIZE_BYTES } from "@/lib/types";

/** Directories to skip during traversal. */
const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  "out",
  "coverage",
  "vendor",
]);

/** Lock files to skip. */
const LOCKFILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "composer.lock",
  "Gemfile.lock",
  "Cargo.lock",
  "go.sum",
  "poetry.lock",
]);

/** Extensions we want to index. */
const INDEXABLE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".py",
  ".java",
  ".go",
  ".rs",
  ".md",
  ".sql",
  ".css",
  ".html",
]);

/** Binary extensions to always skip. */
const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".svg",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".otf",
  ".mp3",
  ".mp4",
  ".wav",
  ".webm",
  ".webp",
  ".zip",
  ".tar",
  ".gz",
  ".bz2",
  ".7z",
  ".pdf",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".o",
  ".obj",
  ".class",
  ".pyc",
  ".wasm",
]);

export interface WalkedFile {
  /** Relative path from the repo root (forward slashes). */
  relativePath: string;
  /** Absolute path on disk. */
  absolutePath: string;
}

/**
 * Recursively walk `rootDir`, returning files that are eligible for indexing.
 *
 * Skips: SKIP_DIRS, lockfiles, binary extensions, files > MAX_FILE_SIZE_BYTES,
 * symlinks, and files whose extension is not in INDEXABLE_EXTENSIONS.
 */
export function walkRepo(rootDir: string): WalkedFile[] {
  const results: WalkedFile[] = [];

  function recurse(dir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      // Permission error or similar — skip this directory.
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip symlinks
      if (entry.isSymbolicLink()) continue;

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        recurse(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;

      // Skip lockfiles
      if (LOCKFILES.has(entry.name)) continue;

      // Skip binary extensions
      const ext = path.extname(entry.name).toLowerCase();
      if (BINARY_EXTENSIONS.has(ext)) continue;

      // Only index known source/doc extensions
      if (!INDEXABLE_EXTENSIONS.has(ext)) continue;

      // Skip files that are too large
      try {
        const stat = fs.statSync(fullPath);
        if (stat.size > MAX_FILE_SIZE_BYTES) continue;
      } catch {
        continue;
      }

      const relativePath = path
        .relative(rootDir, fullPath)
        .split(path.sep)
        .join("/");

      results.push({ relativePath, absolutePath: fullPath });
    }
  }

  recurse(rootDir);
  return results;
}
