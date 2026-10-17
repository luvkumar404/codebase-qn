interface MarqueeProps {
  files: string[];
}

export function Marquee({ files }: MarqueeProps) {
  if (!files || files.length === 0) {
    return null;
  }

  // Duplicate items to ensure a seamless continuous scroll
  const displayItems = [...files, ...files, ...files, ...files];

  return (
    <div
      className="w-full border-y border-border overflow-hidden whitespace-nowrap py-3.5 font-mono text-[13px] text-muted-foreground"
      aria-hidden="true"
    >
      <div className="inline-flex gap-11 pl-11 animate-marquee motion-reduce:animate-none motion-reduce:overflow-x-auto will-change-transform">
        {displayItems.map((file, idx) => (
          <span
            key={`${file}-${idx}`}
            className="inline-flex items-center before:content-['●'] before:text-primary before:mr-3 before:text-[8px] before:align-[2px]"
          >
            {file}
          </span>
        ))}
      </div>
    </div>
  );
}
