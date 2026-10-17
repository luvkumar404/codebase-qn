"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IndexResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RepoFormProps {
  onIndexed?: (result: IndexResponse) => void;
  index: (url: string) => Promise<IndexResponse | null>;
  cancel: () => void;
  isLoading: boolean;
  error: string | null;
  statusMessage: string | null;
  initialUrl?: string;
  buttonLabel?: string;
}

export function RepoForm({
  onIndexed,
  index,
  cancel,
  isLoading,
  error,
  statusMessage,
  initialUrl = "",
  buttonLabel = "Index repository",
}: RepoFormProps) {
  const [url, setUrl] = useState(initialUrl);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await index(url);
    if (result && onIndexed) {
      onIndexed(result);
    }
  };

  return (
    <div className="max-w-[640px] mx-auto mt-9 w-full">
      <form
        className="flex gap-2 p-1.5 bg-card border border-border rounded-full focus-within:border-primary transition-colors max-sm:flex-col max-sm:rounded-2xl max-sm:p-2.5"
        onSubmit={handleSubmit}
        noValidate
      >
        <Input
          id="repo-url-input"
          type="url"
          className="flex-1 min-w-0 border-0 bg-transparent rounded-full px-4 text-foreground text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:border-0 shadow-none h-10"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          aria-label="GitHub repository URL"
          autoComplete="off"
          disabled={isLoading}
        />
        <Button
          type="submit"
          shape="pill"
          disabled={isLoading || !url.trim()}
          className="px-5.5 py-2.5 font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-transform active:translate-y-0 hover:-translate-y-px motion-reduce:transform-none disabled:opacity-45"
        >
          {isLoading ? "Indexing…" : buttonLabel}
        </Button>
      </form>

      <div
        className={cn(
          "max-w-[640px] h-0.5 mx-auto mt-2.5 bg-border rounded-full overflow-hidden transition-opacity duration-200",
          isLoading ? "opacity-100" : "opacity-0"
        )}
        aria-hidden={!isLoading}
      >
        <i className="block h-full w-[40%] bg-primary rounded-full animate-indeterminate" />
      </div>

      <div className="flex items-center justify-center gap-3 min-h-[24px] mt-3.5">
        {error && (
          <p className="m-0 text-sm text-destructive text-center" role="alert">
            {error}
          </p>
        )}
        {!error && statusMessage && (
          <p className="m-0 text-sm text-muted-foreground text-center" role="status">
            {statusMessage}
          </p>
        )}
        {isLoading && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            shape="pill"
            className="h-6 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:border-destructive border border-border"
            onClick={cancel}
            aria-label="Cancel indexing"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
