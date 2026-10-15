/** Shared vector dimension — must match everywhere (schema, embed config). */
export const VECTOR_DIMENSION = 1024;

/** Maximum number of chunks per repo. */
export const MAX_CHUNKS_PER_REPO = 1500;

/** Maximum file size in bytes to index. */
export const MAX_FILE_SIZE_BYTES = 200 * 1024; // 200 KB

/** Maximum characters per embedding input. */
export const MAX_EMBED_INPUT_CHARS = 6000;

/** Embedding batch size. */
export const EMBED_BATCH_SIZE = 50;

// ─── Database row types ──────────────────────────────────────────────

export type RepoStatus = "indexing" | "ready" | "failed";

export interface Repo {
  id: string;
  url: string;
  commitSha: string | null;
  status: RepoStatus;
  error: string | null;
  indexedAt: Date | null;
}

export interface Chunk {
  id: string;
  repoId: string;
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  fileHash: string;
  embedding: number[] | null;
}

// ─── API request / response types ────────────────────────────────────

export interface IndexRequest {
  url: string;
}

export interface IndexResponse {
  repoId: string;
  files: number;
  chunks: number;
  url: string;
}

export interface AskRequest {
  repoId: string;
  question: string;
}

export interface Source {
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
}

export interface AskSourcesLine {
  sources: Source[];
}

export interface RepoStatusResponse {
  id: string;
  url: string;
  status: RepoStatus;
  commitSha: string | null;
  error: string | null;
  indexedAt: string | null;
  files: number;
  chunks: number;
}

export interface ErrorResponse {
  error: string;
}
