import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Harakumo's build machines have ~1 GB of memory: build pages on a single worker.
    cpus: 1,
  },
};

export default nextConfig;
