import {
  IndexRequest,
  IndexResponse,
  RepoStatusResponse,
  ErrorResponse,
  AskRequest,
} from "./types";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function indexRepository(
  url: string,
  signal?: AbortSignal
): Promise<IndexResponse> {
  const body: IndexRequest = { url };
  const res = await fetch("/api/index", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    let errorMsg = `Indexing failed with status ${res.status}`;
    try {
      const errJson = (await res.json()) as ErrorResponse;
      if (errJson?.error) {
        errorMsg = errJson.error;
      }
    } catch {
      // ignore json parse error
    }
    throw new ApiError(errorMsg, res.status);
  }

  return (await res.json()) as IndexResponse;
}

export async function fetchRepoStatus(
  id: string,
  signal?: AbortSignal
): Promise<RepoStatusResponse> {
  const res = await fetch(`/api/repos/${encodeURIComponent(id)}`, {
    signal,
  });

  if (!res.ok) {
    let errorMsg = `Failed to get repo status (${res.status})`;
    try {
      const errJson = (await res.json()) as ErrorResponse;
      if (errJson?.error) {
        errorMsg = errJson.error;
      }
    } catch {
      // ignore json parse error
    }
    throw new ApiError(errorMsg, res.status);
  }

  return (await res.json()) as RepoStatusResponse;
}

export async function streamAskQuestion(
  repoId: string,
  question: string,
  signal?: AbortSignal
): Promise<Response> {
  const body: AskRequest = { repoId, question };
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    let errorMsg = `Ask failed with status ${res.status}`;
    try {
      const errJson = (await res.json()) as ErrorResponse;
      if (errJson?.error) {
        errorMsg = errJson.error;
      }
    } catch {
      // ignore json parse error
    }
    throw new ApiError(errorMsg, res.status);
  }

  return res;
}
