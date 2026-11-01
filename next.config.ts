import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Needed by the Dockerfile (copies .next/standalone into a small runtime image).
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
