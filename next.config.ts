import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Packages that use native Node.js APIs must be externalized from the bundle. */
  serverExternalPackages: ["pg", "simple-git"],
};

export default nextConfig;
