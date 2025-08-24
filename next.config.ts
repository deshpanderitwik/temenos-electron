import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export with absolute paths for Electron
  output: 'export',
  trailingSlash: true,
  // Force absolute paths that work with file:// protocol
  assetPrefix: '',
  basePath: '',
  images: {
    unoptimized: true
  }
};

export default nextConfig;
