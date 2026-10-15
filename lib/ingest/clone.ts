import { simpleGit } from "simple-git";
import fs from "fs";
import path from "path";
import os from "os";

export interface CloneResult {
  dir: string;
  commitSha: string | null;
  cleanup: () => Promise<void>;
}

/**
 * Shallow clones a public git repository to a temporary directory.
 * Always returns a cleanup callback that safely removes the directory.
 */
export async function cloneRepo(url: string): Promise<CloneResult> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "githubqna-repo-"));

  const cleanup = async (): Promise<void> => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, {
          recursive: true,
          force: true,
          maxRetries: 3,
          retryDelay: 200,
        });
      }
    } catch (err) {
      console.error(`Failed to clean up temporary directory ${tempDir}:`, err);
    }
  };

  try {
    const git = simpleGit();
    await git.clone(url, tempDir, ["--depth", "1", "--single-branch"]);

    let commitSha: string | null = null;
    try {
      const repoGit = simpleGit(tempDir);
      commitSha = (await repoGit.revparse(["HEAD"])).trim();
    } catch {
      commitSha = null;
    }

    return {
      dir: tempDir,
      commitSha,
      cleanup,
    };
  } catch (err) {
    await cleanup();
    throw err;
  }
}
