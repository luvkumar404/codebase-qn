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

## Frontend Application

The frontend is built using **Next.js App Router (TypeScript strict)**, **pure CSS Modules**, and typography via `next/font/google` (**Bricolage Grotesque**, **Inter**, and **JetBrains Mono**). It follows a dark theme with a single signature orange accent (`#ff5a1f`), pill-shaped interactive elements, and custom dot-grid backgrounds.

### Pages & Capabilities

1. **Ask Page (`/`)**:
   - Client-side validation for public GitHub URLs (`https://github.com/owner/repo`).
   - Repository indexing with an indeterminate progress bar, elapsed wait handling, and user cancellation via `AbortController`.
   - Streaming question answering via `useAskStream` with chunk-boundary handling, live Markdown text rendering, and numbered citation chips.
   - Dual-panel workspace with a conversation thread on the left and a synchronized source code viewer on the right with exact line ranges and highlighting.
   - Dynamic marquee showing real cited file paths across questions.
   - Automatic active repository restoration from `localStorage` (`cqa.activeRepo`), self-healing if backend records return 404.

2. **Repositories Page (`/repos`)**:
   - Local browser repository list tracking (`cqa.repos`), refreshed against `GET /api/repos/[id]` on page load.
   - Real-time status cards (total repositories, searchable chunks, and active indexing tasks).
   - Per-repository action controls: **Ask** (sets active repo and navigates to `/`), **Re-index** (triggers re-ingestion), and **Remove** (client-side removal with explicit disclaimer that database vectors remain).
   - Fully responsive design collapsing from a 6-column grid to mobile card layouts under 860px.

3. **Evaluation Page (`/eval`)**:
   - Statically imported benchmark dataset from `eval/results.json`.
   - Animated horizontal hit@8 progress bars across vector, hybrid, and hybrid + rerank configurations.
   - Interactive question-by-question matrix with a "show only questions that missed" toggle and accessible text+icon badges.
   - Sample disclaimer badge when `sample: true`.

### How to Run

1. Start the backend database container:
   ```bash
   docker compose up -d
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.
4. Run the test suite:
   ```bash
   npm test
   ```
5. Typecheck the codebase:
   ```bash
   npx tsc --noEmit
   ```

### How the Frontend Communicates with the API

- **`POST /api/index`**: Sends `{ url }`. The backend blocks while cloning, chunking, and embedding. The frontend displays an indeterminate progress bar and exposes a `Cancel` button backed by an `AbortController`. Upon completion, real chunk and file counts are recorded and stored in `cqa.repos`.
- **`GET /api/repos/[id]`**: Fetches repository status, commit SHA, file count, and chunk count. Used during page initialization to validate stored repositories and prune missing IDs (e.g. after a database reset).
- **`POST /api/ask`**: Sends `{ repoId, question }` and receives a chunked `text/plain` stream. The custom `StreamParser` in `lib/stream.ts` buffers incoming chunks until the first newline (`\n`), parses the JSON header `{"sources":[...]}`, and emits streaming answer text for subsequent chunks.

### Known Limitations

1. **No Backend Repository List Endpoint**: The backend provides no endpoint to enumerate indexed repositories. The frontend persists indexed repository IDs in browser `localStorage` (`cqa.repos`). Clearing browser storage clears the visible list, though data remains in PostgreSQL.
2. **No Granular Ingestion Progress**: The ingestion endpoint blocks until completion without streaming intermediate progress steps. The frontend displays an honest indeterminate progress bar rather than simulated percentage steps.
3. **No Vector Deletion Endpoint**: The backend does not expose a DELETE endpoint. Removing a repository from the UI removes it only from the browser's local listing and explicitly warns the user that database records are preserved.

---

## File Structure

```
├── app/
│   ├── api/
│   │   ├── ask/
│   │   │   └── route.ts            # POST: Streamed RAG answers
│   │   ├── index/
│   │   │   └── route.ts            # POST: Shallow clone & index repository
│   │   └── repos/
│   │       └── [id]/
│   │           └── route.ts        # GET: Repo indexing status & chunk counts
│   ├── eval/
│   │   ├── eval.module.css         # Evaluation page styling
│   │   └── page.tsx                # Evaluation dashboard (Server Component)
│   ├── repos/
│   │   ├── repos.module.css        # Repositories page styling
│   │   └── page.tsx                # Repositories management page
│   ├── globals.css                 # Design tokens, CSS variables, & base resets
│   ├── layout.tsx                  # Root layout with Google Fonts & Header
│   ├── page.module.css             # Ask page layout styles
│   └── page.tsx                    # Main Ask page (Hero, Marquee, Workspace)
├── components/
│   ├── Answer.tsx                  # Answer text renderer with citation chips
│   ├── Answer.module.css
│   ├── Chat.tsx                    # Left panel: message thread & ask form
│   ├── Chat.module.css
│   ├── CitationChip.tsx            # Numbered interactive citation button
│   ├── CitationChip.module.css
│   ├── DotField.tsx                # Masked background radial dot pattern
│   ├── DotField.module.css
│   ├── EvalBars.tsx                # Animated hit@8 comparison bars
│   ├── EvalBars.module.css
│   ├── EvalTable.tsx               # Question-by-question evaluation table
│   ├── EvalTable.module.css
│   ├── Header.tsx                  # Brand dot mark + pill navigation
│   ├── Header.module.css
│   ├── Marquee.tsx                 # Cited files horizontal scrolling strip
│   ├── Marquee.module.css
│   ├── RepoForm.tsx                # Repository URL input with progress indicator
│   ├── RepoForm.module.css
│   ├── RepoList.tsx                # Repository list with actions and status dots
│   ├── RepoList.module.css
│   ├── SourcePanel.tsx             # Right panel: tabs & code viewer with line numbers
│   └── SourcePanel.module.css
├── eval/
│   └── results.json                # Benchmark metrics for evaluation page
├── hooks/
│   ├── useActiveRepo.ts            # Active repository state & verification
│   ├── useAskStream.ts             # Streaming fetch reader & source synchronization
│   └── useIndexRepo.ts             # Repository indexing hook with AbortController
├── lib/
│   ├── api.ts                      # Typed API client with custom ApiError
│   ├── citations.ts                # Pure citation splitting & filtering
│   ├── storage.ts                  # Safe localStorage wrapper
│   ├── stream.ts                   # Stream parser for line-1 sources + text
│   ├── types.ts                    # Shared types & constants
│   ├── chunking/                   # Fallback & markdown chunking
│   ├── db/                         # Drizzle schema & Postgres connection
│   ├── gemini/                     # Google Gemini embedding & generation
│   ├── ingest/                     # Git clone, walk, & indexing logic
│   └── rag/                        # Retrieval, fusion, prompt, & streaming
├── __tests__/                      # Jest unit & integration test suites
├── drizzle/                        # Drizzle schema migrations
├── docker-compose.yml              # pgvector container
└── package.json
```

