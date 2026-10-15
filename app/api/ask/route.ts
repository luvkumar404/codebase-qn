import { NextRequest } from "next/server";
import { z } from "zod";
import { streamAnswer, RepositoryNotFoundError } from "@/lib/rag/ask";
import { ErrorResponse } from "@/lib/types";

const askSchema = z.object({
  repoId: z
    .string({
      error: "repoId is required",
    })
    .uuid("repoId must be a valid UUID"),
  question: z
    .string({
      error: "question is required",
    })
    .min(1, "question cannot be empty"),
});

export const maxDuration = 300;

export async function POST(request: NextRequest): Promise<Response> {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: "Invalid JSON request body" } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    const validation = askSchema.safeParse(body);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      return Response.json(
        { error: firstIssue?.message || "Invalid request body" } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    const { repoId, question } = validation.data;

    const { stream } = await streamAnswer(repoId, question);

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    if (err instanceof RepositoryNotFoundError) {
      return Response.json(
        { error: err.message } satisfies ErrorResponse,
        { status: 404 }
      );
    }

    const message =
      err instanceof Error ? err.message : "Failed to answer question";
    return Response.json(
      { error: message } satisfies ErrorResponse,
      { status: 500 }
    );
  }
}
