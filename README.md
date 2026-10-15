# Codebase Q&A — Backend API

Backend-only service built with **Next.js (App Router, TypeScript strict)**, **PostgreSQL + pgvector** via **Drizzle ORM**, and **Google Gemini** for embeddings and streaming RAG answers with citations.

The user provides a public GitHub repository URL, the backend shallow-clones and indexes it into vector chunks and tsvector tokens, and then answers natural-language questions with precise citations (file path + line range).

---

## Architecture Overview

```
                      ┌──────────────────────┐
                      │  POST /api/index     │
                      └──────────┬───────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
         lib/ingest/clone.ts             lib/ingest/walk.ts
         (shallow --depth 1              (skips node_modules,
          temp dir + cleanup)             lockfiles, binaries, >200KB)
                 │                               │
                 └───────────────┬───────────────┘
                                 ▼
                        lib/chunking/index.ts
                     ├── .md  -> chunkMarkdown (heading splits)
                     └── else -> chunkFallback (~60 lines, ~8 overlap)
                                 │
                                 ▼
                        lib/gemini/embed.ts
             (gemini-embedding-001, 1024 dims, batches of 50,
              taskType: RETRIEVAL_DOCUMENT, 4 retry backoff)
                                 │
                                 ▼
                     PostgreSQL + pgvector (Drizzle)
                     - repos (url UNIQUE, commit_sha, status)
                     - chunks (embedding HNSW, tsv GIN, repo_id btree)

─────────────────────────────────────────────────────────────────────────

                      ┌──────────────────────┐
                      │    POST /api/ask     │
                      └──────────┬───────────┘
                                 ▼
                        lib/rag/retrieve.ts
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
           Vector Search                   Keyword Search
          (embedding <=> query,           (tsquery 'simple',
           top 20)                         ts_rank, top 20)
                 │                               │
                 └───────────────┬───────────────┘
                                 ▼
                         lib/rag/fuse.ts
                   (Reciprocal Rank Fusion k=60, top 8)
                                 │
                                 ▼
                        lib/rag/prompt.ts
            (Numbered context "[n] path:start-end\n<content>")
                                 │
                                 ▼
                       lib/gemini/generate.ts
         (ai.models.generateContentStream with CHAT_MODEL)
                                 │
                                 ▼
                      HTTP Chunked Stream
           Line 1: JSON {"sources": [{filePath, startLine, endLine, content}]}
           Line 2+: Text deltas with [n] citations
```

> [!IMPORTANT]
> **Vector Model Compatibility**: Vectors are only comparable within the same embedding model (`gemini-embedding-001` with `outputDimensionality: 1024`). Changing the embedding model or dimension requires re-indexing existing repositories.

---

## Prerequisites

- **Node.js**: v20 or higher
- **Docker & Docker Compose**: For PostgreSQL + pgvector
- **Google Gemini API Key**: Obtain a key from [Google AI Studio](https://aistudio.google.com/apikey)

---

## Setup & Running

### 1. Start Database Container
```bash
docker compose up -d
```
This launches `pgvector/pgvector:pg16` on `localhost:5432` with database `githubqna`, user `postgres`, password `postgres`.

### 2. Configure Environment Variables
Copy the example file:
```bash
cp .env.example .env
```
Edit `.env` with your Google Gemini API key:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/githubqna
GEMINI_API_KEY=your_actual_gemini_api_key_here
# Optional: GEMINI_MODEL=gemini-3.6-flash
```

### 3. Run Migrations
Applies Drizzle schema push and creates the generated `tsvector` column and GIN index:
```bash
npm run db:migrate
```

### 4. Start Development Server
```bash
npm run dev
```
The server will listen at `http://localhost:3000`.

---

## Running Tests & Type Checking

Run all Jest test suites (walk, chunking, embed with mocks & retries, URL validation, reciprocal rank fusion, citations, and keyword extraction):
```bash
npm test
```

Run TypeScript strict type checking:
```bash
npx tsc --noEmit
```

---

## API Endpoints & cURL Examples

### 1. Index a Repository
`POST /api/index`

Clones the repo into a temporary directory, extracts source files, generates chunks & embeddings, and stores them in PostgreSQL.

```bash
curl -X POST http://localhost:3000/api/index \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/octocat/Hello-World"}'
```

**Success Response (200 OK):**
```json
{
  "repoId": "8f8b3c12-3456-4abc-9def-1234567890ab",
  "files": 1,
  "chunks": 1,
  "url": "https://github.com/octocat/Hello-World"
}
```

**Validation Error Response (400 Bad Request):**
```json
{
  "error": "Invalid GitHub repository URL. Must be in the format: https://github.com/<owner>/<repo>"
}
```

---

### 2. Check Repository Status
`GET /api/repos/:id`

Retrieves the current indexing status, commit SHA, file count, and chunk count.

```bash
curl http://localhost:3000/api/repos/8f8b3c12-3456-4abc-9def-1234567890ab
```

**Response (200 OK):**
```json
{
  "id": "8f8b3c12-3456-4abc-9def-1234567890ab",
  "url": "https://github.com/octocat/Hello-World",
  "status": "ready",
  "commitSha": "7fd1a60b01f91b314f59955a4e4d4e80d8edf11d",
  "error": null,
  "indexedAt": "2026-10-15T10:00:00.000Z",
  "files": 1,
  "chunks": 1
}
```

---

### 3. Ask a Question (Streaming)
`POST /api/ask`

Retrieves the top 8 code chunks using hybrid vector search (top 20) + full-text keyword search (top 20) merged via Reciprocal Rank Fusion ($k=60$). Streams the answer as `text/plain`.

**The FIRST line is JSON containing all cited sources:**
`{"sources":[{"filePath":"...","startLine":1,"endLine":25,"content":"..."}]}`
followed by `\n`, then the streamed tokens from Gemini citing sources as `[n]`.

```bash
curl -N -X POST http://localhost:3000/api/ask \
  -H "Content-Type: application/json" \
  -d '{
    "repoId": "8f8b3c12-3456-4abc-9def-1234567890ab",
    "question": "What does this repository do and where is it defined?"
  }'
```

**Example Streamed Output:**
```
{"sources":[{"filePath":"README","startLine":1,"endLine":1,"content":"Hello World!"}]}
The repository contains a simple greeting message defined in [1]. It simply outputs "Hello World!".
```

If no relevant chunks exist in the repository, the endpoint returns the empty sources line and a plain message without calling the LLM:
```
{"sources":[]}
No indexed code found for this repository.
```

---

## File Structure

```
├── app/
│   └── api/
│       ├── ask/
│       │   └── route.ts            # POST: Streamed RAG answers
│       ├── index/
│       │   └── route.ts            # POST: Shallow clone & index repository
│       └── repos/
│           └── [id]/
│               └── route.ts        # GET: Repo indexing status & chunk counts
├── lib/
│   ├── chunking/
│   │   ├── fallback.ts             # ~60-line window chunking with ~8-line overlap
│   │   ├── index.ts                # Chunker dispatcher based on extension
│   │   └── markdown.ts             # Heading-based markdown chunking
│   ├── db/
│   │   ├── client.ts               # Drizzle ORM + pg.Pool singleton
│   │   └── schema.ts               # repos + chunks tables with vector(1024)
│   ├── gemini/
│   │   ├── client.ts               # GoogleGenAI singleton & model constants
│   │   ├── embed.ts                # Batched embedding with exponential backoff
│   │   └── generate.ts             # AsyncGenerator streaming answer generator
│   ├── ingest/
│   │   ├── clone.ts                # Shallow git clone to temp directory with cleanup
│   │   ├── index.ts                # Ingestion orchestration & atomic DB upsert
│   │   ├── validate.ts             # Strict GitHub URL regex validator
│   │   └── walk.ts                 # Recursive directory walker with exclusion filters
│   ├── rag/
│   │   ├── ask.ts                  # RAG answer streaming pipeline
│   │   ├── citations.ts            # [n] citation extraction & validation
│   │   ├── fuse.ts                 # Reciprocal Rank Fusion (k=60)
│   │   ├── prompt.ts               # Numbered snippet context builder & system instruction
│   │   └── retrieve.ts             # Vector search + tsvector keyword search
│   ├── env.ts                      # Zod validation for environment variables
│   └── types.ts                    # Shared types & constants (VECTOR_DIMENSION = 1024)
├── drizzle/
│   └── 0001_add_tsv_column.sql     # Custom SQL: pgvector extension, tsvector, GIN index
├── scripts/
│   └── migrate.ts                  # Migration runner (drizzle-kit push + custom SQL)
├── __tests__/                      # Complete Jest test suite
├── docker-compose.yml              # pgvector/pgvector:pg16 container
└── package.json
```
