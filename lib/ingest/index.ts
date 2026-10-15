import fs from "fs";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { repos, chunks } from "@/lib/db/schema";
import { cloneRepo } from "@/lib/ingest/clone";
import { walkRepo } from "@/lib/ingest/walk";
import { chunkFile } from "@/lib/chunking";
import { embed } from "@/lib/gemini/embed";
import { normalizeGithubUrl } from "@/lib/ingest/validate";
import {
  MAX_CHUNKS_PER_REPO,
  MAX_EMBED_INPUT_CHARS,
  IndexResponse,
} from "@/lib/types";

interface PreparedChunk {
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  fileHash: string;
  embedText: string;
}

/**
 * Orchestrates the full repository indexing pipeline:
 * 1. Validate & normalize URL
 * 2. Shallow clone repository
 * 3. Walk & filter eligible files
 * 4. Chunk files (capped at 1500)
 * 5. Generate embeddings for `File: <path>\n<content>` (truncated to 6000 chars)
 * 6. Upsert repo & chunks atomically in a database transaction
 */
export async function indexRepo(rawUrl: string): Promise<IndexResponse> {
  const url = normalizeGithubUrl(rawUrl);

  const cloneResult = await cloneRepo(url);
  try {
    const walkedFiles = walkRepo(cloneResult.dir);

    const preparedChunks: PreparedChunk[] = [];
    const indexedFilesSet = new Set<string>();

    for (const file of walkedFiles) {
      if (preparedChunks.length >= MAX_CHUNKS_PER_REPO) {
        break;
      }

      let content: string;
      try {
        content = fs.readFileSync(file.absolutePath, "utf-8");
      } catch {
        continue;
      }

      const fileHash = crypto.createHash("sha256").update(content).digest("hex");
      const fileChunks = chunkFile(file.relativePath, content);

      if (fileChunks.length > 0) {
        indexedFilesSet.add(file.relativePath);
      }

      for (const fc of fileChunks) {
        if (preparedChunks.length >= MAX_CHUNKS_PER_REPO) {
          break;
        }

        const rawEmbedText = `File: ${file.relativePath}\n${fc.content}`;
        const embedText =
          rawEmbedText.length > MAX_EMBED_INPUT_CHARS
            ? rawEmbedText.slice(0, MAX_EMBED_INPUT_CHARS)
            : rawEmbedText;

        preparedChunks.push({
          filePath: file.relativePath,
          startLine: fc.startLine,
          endLine: fc.endLine,
          content: fc.content,
          fileHash,
          embedText,
        });
      }
    }

    // Embed all chunks
    const textsToEmbed = preparedChunks.map((c) => c.embedText);
    const embeddings = await embed(textsToEmbed, "document");

    // Upsert in one transaction
    const repoId = await db.transaction(async (tx) => {
      // Cascade delete previous repo entry if exists
      await tx.delete(repos).where(eq(repos.url, url));

      // Insert fresh repo entry
      const [newRepo] = await tx
        .insert(repos)
        .values({
          url,
          commitSha: cloneResult.commitSha,
          status: "ready",
          error: null,
          indexedAt: new Date(),
        })
        .returning({ id: repos.id });

      // Insert chunk rows in batches to prevent hitting SQL parameter limits
      if (preparedChunks.length > 0) {
        const chunkRecords = preparedChunks.map((pc, idx) => ({
          repoId: newRepo.id,
          filePath: pc.filePath,
          startLine: pc.startLine,
          endLine: pc.endLine,
          content: pc.content,
          fileHash: pc.fileHash,
          embedding: embeddings[idx],
        }));

        const BATCH_SIZE = 250;
        for (let i = 0; i < chunkRecords.length; i += BATCH_SIZE) {
          const batch = chunkRecords.slice(i, i + BATCH_SIZE);
          await tx.insert(chunks).values(batch);
        }
      }

      return newRepo.id;
    });

    return {
      repoId,
      files: indexedFilesSet.size,
      chunks: preparedChunks.length,
      url,
    };
  } finally {
    await cloneResult.cleanup();
  }
}
