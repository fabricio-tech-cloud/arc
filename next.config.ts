import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["body-muscles"],
  // `/` (src/app/page.tsx) is the Overview start page — no basePath / redirects away from it.
};

export default nextConfig;
