"use client";

import { useRef } from "react";
import { DotField } from "@/components/DotField";
import { RepoForm } from "@/components/RepoForm";
import { Marquee } from "@/components/Marquee";
import { Chat } from "@/components/Chat";
import { SourcePanel } from "@/components/SourcePanel";
import { useActiveRepo } from "@/hooks/useActiveRepo";
import { useIndexRepo } from "@/hooks/useIndexRepo";
import { useAskStream } from "@/hooks/useAskStream";

export default function AskPage() {
  const { activeRepo, setActiveRepo } = useActiveRepo();
  const workspaceRef = useRef<HTMLElement>(null);

  const {
    messages,
    isStreaming,
    currentSources,
    activeSourceIndex,
    setActiveSourceIndex,
    citedFiles,
    ask,
    resetChat,
  } = useAskStream();

  const handleIndexed = (result: { repoId: string; url: string }) => {
    setActiveRepo({ repoId: result.repoId, url: result.url });
    resetChat();
    setTimeout(() => {
      workspaceRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    }, 100);
  };

  const { index, cancel, isLoading, error, statusMessage } =
    useIndexRepo(handleIndexed);

  // Derive readable owner/repo name
  const repoName = activeRepo?.url
    ? activeRepo.url.replace(/^https:\/\/github\.com\//, "").replace(/\/$/, "")
    : "";

  const handleAsk = (question: string) => {
    if (activeRepo) {
      ask(question, activeRepo.repoId);
    }
  };

  return (
    <main className="flex-1 flex flex-col">
      <section className="relative px-[clamp(20px,5vw,56px)] pt-[clamp(48px,9vw,104px)] pb-14 text-center overflow-hidden">
        <DotField variant="center" />
        <h1 className="relative mx-auto max-w-[15ch] font-display font-bold text-[clamp(40px,8vw,84px)] leading-[1.02] tracking-[-0.035em] text-foreground">
          Ask your codebase.{" "}
          <em className="not-italic text-primary">
            Get answers with receipts.
          </em>
        </h1>
        <p className="relative mx-auto mt-5.5 max-w-[46ch] text-muted-foreground text-[clamp(16px,2vw,19px)] leading-normal">
          Paste a public GitHub repository. Every answer links to the exact
          files and lines it came from.
        </p>

        <RepoForm
          index={index}
          cancel={cancel}
          isLoading={isLoading}
          error={error}
          statusMessage={statusMessage}
          initialUrl={activeRepo?.url || ""}
          buttonLabel={activeRepo ? "Re-index" : "Index repository"}
        />
      </section>

      <Marquee files={citedFiles} />

      {activeRepo && (
        <section
          ref={workspaceRef}
          className="px-[clamp(20px,5vw,56px)] py-8 flex-1"
          aria-label="Workspace"
        >
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] max-[900px]:grid-cols-1 gap-4 max-w-[1240px] mx-auto">
            <Chat
              repoName={repoName}
              messages={messages}
              isStreaming={isStreaming}
              activeSourceIndex={activeSourceIndex}
              onSelectSource={setActiveSourceIndex}
              onAsk={handleAsk}
            />
            <SourcePanel
              sources={currentSources}
              activeSourceIndex={activeSourceIndex}
              onSelectSource={setActiveSourceIndex}
            />
          </div>
        </section>
      )}

      <footer className="mt-auto px-[clamp(20px,5vw,56px)] pt-7 pb-12 text-muted-foreground text-[13px] text-center">
        In the real app answers stream directly from <code>/api/ask</code>.
      </footer>
    </main>
  );
}
