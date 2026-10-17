import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import { Header } from "@/components/Header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { cn } from "@/lib/utils";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-bricolage",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Codebase Q&A",
  description: "Ask your codebase. Get answers with receipts.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn(
        "dark",
        bricolage.variable,
        inter.variable,
        jetbrainsMono.variable
      )}
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased flex flex-col">
        <TooltipProvider>
          <Header />
          <div className="flex-1 flex flex-col">{children}</div>
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
