"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Ask" },
  { href: "/repos", label: "Repositories" },
  { href: "/eval", label: "Evaluation" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between gap-4 flex-wrap px-[clamp(20px,5vw,56px)] py-5">
      <Link
        href="/"
        className="flex items-center gap-3 font-display font-bold text-lg tracking-tight no-underline text-foreground"
      >
        <span
          className="w-[22px] h-[22px] bg-[radial-gradient(#ff5a1f_2.2px,transparent_2.6px)] [background-size:7.4px_7.4px]"
          aria-hidden="true"
        />
        Codebase Q&amp;A
      </Link>
      <nav className="flex gap-1.5" aria-label="Main">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-4 py-1.5 border border-border rounded-full text-sm text-muted-foreground transition-colors hover:text-foreground hover:border-[#3a3a40] focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
                isActive &&
                  "bg-primary text-primary-foreground border-primary font-semibold hover:border-primary"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
