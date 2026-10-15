import { isValidGithubUrl, normalizeGithubUrl } from "@/lib/ingest/validate";

describe("GitHub URL validation", () => {
  it("accepts valid GitHub URLs", () => {
    expect(isValidGithubUrl("https://github.com/facebook/react")).toBe(true);
    expect(isValidGithubUrl("https://github.com/vercel/next.js")).toBe(true);
    expect(isValidGithubUrl("https://github.com/owner/my-repo")).toBe(true);
    expect(isValidGithubUrl("https://github.com/owner/repo.git")).toBe(true);
    expect(isValidGithubUrl("https://github.com/owner/repo/")).toBe(true);
  });

  it("rejects file:// URLs", () => {
    expect(isValidGithubUrl("file:///home/user/repo")).toBe(false);
    expect(isValidGithubUrl("file://c:/Users/my/repo")).toBe(false);
  });

  it("rejects git@ SSH URLs", () => {
    expect(isValidGithubUrl("git@github.com:facebook/react.git")).toBe(false);
    expect(isValidGithubUrl("git@gitlab.com:owner/repo.git")).toBe(false);
  });

  it("rejects other hosts", () => {
    expect(isValidGithubUrl("https://gitlab.com/owner/repo")).toBe(false);
    expect(isValidGithubUrl("https://bitbucket.org/owner/repo")).toBe(false);
    expect(isValidGithubUrl("http://github.com/owner/repo")).toBe(false); // http not https
    expect(isValidGithubUrl("https://notgithub.com/owner/repo")).toBe(false);
  });

  it("rejects extra path segments", () => {
    expect(isValidGithubUrl("https://github.com/owner/repo/pull/123")).toBe(false);
    expect(isValidGithubUrl("https://github.com/owner/repo/issues")).toBe(false);
    expect(isValidGithubUrl("https://github.com/owner/repo/blob/main/index.ts")).toBe(false);
    expect(isValidGithubUrl("https://github.com/owner/repo/tree/master")).toBe(false);
  });

  it("rejects incomplete or malformed URLs", () => {
    expect(isValidGithubUrl("https://github.com/owner")).toBe(false);
    expect(isValidGithubUrl("https://github.com/")).toBe(false);
    expect(isValidGithubUrl("")).toBe(false);
    expect(isValidGithubUrl("random text")).toBe(false);
  });

  it("normalizes valid URLs correctly", () => {
    expect(normalizeGithubUrl("https://github.com/owner/repo.git")).toBe("https://github.com/owner/repo");
    expect(normalizeGithubUrl("https://github.com/owner/repo/")).toBe("https://github.com/owner/repo");
  });

  it("throws on normalizing invalid URLs", () => {
    expect(() => normalizeGithubUrl("https://gitlab.com/owner/repo")).toThrow();
  });
});
