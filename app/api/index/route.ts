import { NextRequest } from "next/server";
import { isValidGithubUrl } from "@/lib/ingest/validate";
import { indexRepo } from "@/lib/ingest";
import { ErrorResponse, IndexResponse } from "@/lib/types";

export const maxDuration = 300;

export async function POST(
  request: NextRequest
): Promise<Response> {
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

    if (
      !body ||
      typeof body !== "object" ||
      !("url" in body) ||
      typeof (body as { url: unknown }).url !== "string"
    ) {
      return Response.json(
        {
          error:
            "Missing 'url' field. Please provide a GitHub URL in the format: https://github.com/<owner>/<repo>",
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    const rawUrl = (body as { url: string }).url;
    if (!isValidGithubUrl(rawUrl)) {
      return Response.json(
        {
          error:
            "Invalid GitHub repository URL. Must be in the format: https://github.com/<owner>/<repo>",
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    const result: IndexResponse = await indexRepo(rawUrl);
    return Response.json(result, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to index repository";
    return Response.json(
      { error: message } satisfies ErrorResponse,
      { status: 500 }
    );
  }
}
