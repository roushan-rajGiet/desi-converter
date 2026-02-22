/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    transpilePackages: ['@desi/shared'],
    // Static export for Netlify deployment
    // Rewrites are not compatible with static export, but the frontend
    // already calls the API directly via NEXT_PUBLIC_API_URL in api.ts
    ...(process.env.NETLIFY
        ? {
            output: 'export',
            images: { unoptimized: true },
        }
        : {
            async rewrites() {
                const internalApiUrl =
                    process.env.INTERNAL_API_URL ||
                    process.env.NEXT_PUBLIC_API_URL ||
                    'http://localhost:4000';
                return [
                    {
                        source: '/api/:path*',
                        destination: `${internalApiUrl}/api/:path*`,
                    },
                ];
            },
        }),
};

module.exports = nextConfig;
