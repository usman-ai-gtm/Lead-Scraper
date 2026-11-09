/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
