import type { NextConfig } from "next";

const EXTERNAL_PACKAGES = ['@sparticuz/chromium', 'puppeteer-core']

const nextConfig: NextConfig = {
  serverExternalPackages: EXTERNAL_PACKAGES,
  webpack(config, { isServer }) {
    if (isServer) {
      const existing = Array.isArray(config.externals) ? config.externals : []
      config.externals = [
        ...existing,
        ...EXTERNAL_PACKAGES,
      ]
    }
    return config
  },
};

export default nextConfig;
