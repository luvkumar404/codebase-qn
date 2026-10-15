-- Custom migration: add tsvector column and GIN index to chunks table.
-- Drizzle cannot express generated tsvector columns, so we handle them here.

-- Enable pgvector extension (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add the tsvector column (stored, generated from file_path and content)
ALTER TABLE "chunks"
  ADD COLUMN IF NOT EXISTS "tsv" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce("file_path", '') || ' ' || coalesce("content", ''))
  ) STORED;

-- GIN index on the tsvector column for keyword search
CREATE INDEX IF NOT EXISTS "chunks_tsv_idx" ON "chunks" USING gin ("tsv");
