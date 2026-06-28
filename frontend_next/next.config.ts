import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ── API Proxy ──────────────────────────────────────────────────────────────
  // In development, proxy /api/* calls to the Express backend so the browser
  // doesn't hit CORS issues when both run on different ports.
  // In production (Vercel), set NEXT_PUBLIC_API_URL env var instead.
  async rewrites() {
    // Only proxy in dev; in prod the client talks directly to the backend URL.
    if (process.env.NODE_ENV === "production") return [];
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_URL || "http://localhost:5000"}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${process.env.BACKEND_URL || "http://localhost:5000"}/uploads/:path*`,
      },
    ];
  },

  // ── Images ─────────────────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },

  // ── Security headers ───────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },

  // ── Performance ────────────────────────────────────────────────────────────
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },

  // ── Output ─────────────────────────────────────────────────────────────────
  // 'standalone' bundles only what's needed — great for Docker / Railway
  // output: "standalone",

  // ── Experimental ───────────────────────────────────────────────────────────
  experimental: {
    // Turbopack is default in Next 15+; keep this for forward compat
    optimizePackageImports: ["lucide-react", "framer-motion", "clsx", "date-fns", "axios"],
  },
};

export default nextConfig;
