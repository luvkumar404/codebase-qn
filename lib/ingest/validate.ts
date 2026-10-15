const GITHUB_URL_REGEX =
  /^https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git)?\/?$/;

/**
 * Validates that a string is strictly a GitHub repo URL: https://github.com/<owner>/<repo>
 * Rejects file://, git@, non-github hosts, extra path segments, etc.
 */
export function isValidGithubUrl(url: string): boolean {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  const match = trimmed.match(GITHUB_URL_REGEX);
  if (!match) return false;
  const owner = match[1];
  const repo = match[2];
  if (owner === "." || owner === ".." || repo === "." || repo === "..") {
    return false;
  }
  return true;
}

/**
 * Normalizes a valid GitHub URL to canonical `https://github.com/<owner>/<repo>` format.
 * Throws if the URL is not valid.
 */
export function normalizeGithubUrl(url: string): string {
  if (!isValidGithubUrl(url)) {
    throw new Error(
      "Invalid GitHub repository URL. Must be in the format: https://github.com/<owner>/<repo>"
    );
  }
  const match = url.trim().match(GITHUB_URL_REGEX)!;
  const owner = match[1];
  const repo = match[2].replace(/\.git$/, "");
  return `https://github.com/${owner}/${repo}`;
}
