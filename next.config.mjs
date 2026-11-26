/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];
  },
  async rewrites() {
    // In cloud serverless environments like Vercel, API endpoints are served directly by Next.js App Router route handlers.
    // Rewriting to private loopback (127.0.0.1) triggers DNS_HOSTNAME_RESOLVED_PRIVATE on Vercel.
    const backend = process.env.BACKEND_URL;
    if (backend && !process.env.VERCEL && !backend.includes("127.0.0.1") && !backend.includes("localhost")) {
      return [
        {
          source: '/api/:path*',
          destination: `${backend}/api/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
