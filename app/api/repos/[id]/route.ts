import { NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { repos, chunks } from "@/lib/db/schema";
import { ErrorResponse, RepoStatusResponse } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return Response.json(
        { error: "Invalid repository ID format" } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    const [repo] = await db
      .select()
      .from(repos)
      .where(eq(repos.id, id))
      .limit(1);

    if (!repo) {
      return Response.json(
        { error: "Repository not found" } satisfies ErrorResponse,
        { status: 404 }
      );
    }

    // Retrieve chunk and distinct file counts
    const [counts] = await db
      .select({
        chunkCount: sql<number>`count(*)::int`,
        fileCount: sql<number>`count(distinct ${chunks.filePath})::int`,
      })
      .from(chunks)
      .where(eq(chunks.repoId, id));

    const responseData: RepoStatusResponse = {
      id: repo.id,
      url: repo.url,
      status: repo.status,
      commitSha: repo.commitSha,
      error: repo.error,
      indexedAt: repo.indexedAt ? repo.indexedAt.toISOString() : null,
      files: counts?.fileCount ?? 0,
      chunks: counts?.chunkCount ?? 0,
    };

    return Response.json(responseData, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to retrieve repository status";
    return Response.json(
      { error: message } satisfies ErrorResponse,
      { status: 500 }
    );
  }
}
