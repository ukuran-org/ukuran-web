import path from "node:path";
import type { NextConfig } from "next";

// Brand assets live in the shared assets folder at the repository root, so the
// bundler and output tracing treat the repository root as the project root.
const repositoryRoot = path.join(__dirname, "../..");

const nextConfig: NextConfig = {
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
  outputFileTracingRoot: repositoryRoot,
  turbopack: {
    root: repositoryRoot,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
