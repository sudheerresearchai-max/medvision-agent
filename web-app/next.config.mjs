/** @type {import('next').NextConfig} */

// MedVision Agent — research prototype only, NOT approved for clinical diagnosis.
const nextConfig = {
  reactStrictMode: true,

  // pdfjs-dist ships legacy Node builds that should not be bundled by webpack
  // inside server components / route handlers.
  experimental: {
    serverComponentsExternalPackages: ['pdfjs-dist'],
  },

  // Research prototype: generous (but still safe) client-side JS is fine;
  // no images are optimized remotely because scans stay as data URLs.
  eslint: {
    // Keep `next build` unblocked in sandboxed CI without an ESLint setup step.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
