import evalResults from "@/eval/results.json";
import { DotField } from "@/components/DotField";
import { EvalBars } from "@/components/EvalBars";
import { EvalTable } from "@/components/EvalTable";
import { Card } from "@/components/ui/card";

export default function EvalPage() {
  const { sample, total, setups, questions } = evalResults;

  return (
    <main className="max-w-[1100px] w-full mx-auto px-[clamp(24px,5vw,56px)] py-[clamp(24px,5vw,56px)] flex-1 flex flex-col">
      <div className="relative pb-7">
        <DotField variant="corner" />
        <h1 className="relative m-0 font-display font-bold text-[clamp(34px,6vw,60px)] leading-[1.04] tracking-[-0.03em] text-foreground">
          Does retrieval{" "}
          <em className="not-italic text-primary">find the right file?</em>
        </h1>
        <p className="relative mt-3.5 max-w-[56ch] text-muted-foreground text-lg leading-normal">
          {total} questions about one repository, each with a known correct file.
          A question counts as a hit when that file appears in the top 8
          retrieved chunks (hit@8).
        </p>
        {sample && (
          <span className="inline-flex items-center gap-1.5 mt-4.5 px-3.5 py-1 border border-primary rounded-full text-xs text-primary bg-accent-soft">
            Sample numbers. Replace with your own eval results.
          </span>
        )}
      </div>

      <Card className="mt-7 p-7 bg-card border-border rounded-[22px] gap-0">
        <h2 id="h-res" className="m-0 mb-1 font-display text-[22px] tracking-tight text-foreground">
          hit@8 by retrieval setup
        </h2>
        <p className="m-0 mb-6 text-muted-foreground text-[15px]">
          Each step adds one technique to the one before it.
        </p>
        <EvalBars total={total} setups={setups} />
      </Card>

      <Card className="mt-7 p-7 bg-card border-border rounded-[22px] gap-0">
        <h2 id="h-q" className="m-0 mb-1 font-display text-[22px] tracking-tight text-foreground">
          Question by question
        </h2>
        <p className="m-0 mb-6 text-muted-foreground text-[15px]">
          Showing {questions.length} of {total} questions.
        </p>
        <EvalTable questions={questions} />
      </Card>

      <Card className="mt-7 p-7 bg-card border-border rounded-[22px] gap-0">
        <h2 id="h-n" className="m-0 mb-1 font-display text-[22px] tracking-tight text-foreground">
          What the numbers say
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3 mt-3">
          <div className="p-4.5 bg-secondary rounded-2xl">
            <b className="block mb-1 font-display text-base text-foreground">
              Keyword search fixed exact names
            </b>
            <span className="text-muted-foreground text-sm leading-normal">
              Questions that mention identifiers like{" "}
              <code className="font-mono text-[13px] text-foreground bg-card px-1.5 py-0.5 rounded">
                useCart
              </code>{" "}
              missed with vectors alone and hit once keyword search was merged
              in.
            </span>
          </div>
          <div className="p-4.5 bg-secondary rounded-2xl">
            <b className="block mb-1 font-display text-base text-foreground">
              Reranking helped ranking, not recall
            </b>
            <span className="text-muted-foreground text-sm leading-normal">
              It pulled one correct file from lower in the top 20 into the top 8.
            </span>
          </div>
          <div className="p-4.5 bg-secondary rounded-2xl">
            <b className="block mb-1 font-display text-base text-foreground">
              Still missing
            </b>
            <span className="text-muted-foreground text-sm leading-normal">
              Pagination logic is spread across several small helpers, so no
              single chunk matches. Function-level chunking is the next
              experiment.
            </span>
          </div>
        </div>
      </Card>

      <footer className="mt-auto px-[clamp(20px,5vw,56px)] pt-7 pb-12 text-muted-foreground text-[13px] text-center">
        Evaluation metrics benchmarked against public repositories.
      </footer>
    </main>
  );
}
