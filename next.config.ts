import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  turbopack: {},
  // Tell Vercel's file tracer to include chromium's binary files —
  // they are read via fs at runtime so static analysis misses them
  outputFileTracingIncludes: {
    '/api/render': ['./node_modules/@sparticuz/chromium/**/*'],
  },
};

export default nextConfig;
