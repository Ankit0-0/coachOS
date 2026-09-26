import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Render serves this as a static site, so the build writes plain files to
  // out/ instead of needing a Node server.
  output: 'export',
  // /privacy/ etc. are written as privacy/index.html, which every static host
  // serves at the clean URL; privacy.html would need host-specific rewrites.
  trailingSlash: true,
  // next/image's default loader optimises on request, which needs that server.
  // Unoptimized means the files are served as they are — the screenshots are
  // already sized for the page.
  images: { unoptimized: true }
};

export default nextConfig;
