import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core/columns/vector_extension/vector";
import { VECTOR_DIMENSION } from "@/lib/types";

// ─── repos ──────────────────────────────────────────────────────────

export const repos = pgTable("repos", {
  id: uuid("id").defaultRandom().primaryKey(),
  url: text("url").notNull().unique(),
  commitSha: text("commit_sha"),
  status: text("status", { enum: ["indexing", "ready", "failed"] })
    .notNull()
    .default("indexing"),
  error: text("error"),
  indexedAt: timestamp("indexed_at", { withTimezone: true }),
});

// ─── chunks ─────────────────────────────────────────────────────────

export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    repoId: uuid("repo_id")
      .notNull()
      .references(() => repos.id, { onDelete: "cascade" }),
    filePath: text("file_path").notNull(),
    startLine: integer("start_line").notNull(),
    endLine: integer("end_line").notNull(),
    content: text("content").notNull(),
    fileHash: text("file_hash").notNull(),
    embedding: vector("embedding", { dimensions: VECTOR_DIMENSION }),
    // tsv column is created via custom SQL migration — Drizzle can't express
    // generated tsvector columns natively.
  },
  (t) => [
    index("chunks_embedding_idx")
      .using("hnsw", t.embedding.op("vector_cosine_ops")),
    index("chunks_repo_id_idx").on(t.repoId),
    // GIN index on tsv is created via custom SQL migration.
  ]
);
