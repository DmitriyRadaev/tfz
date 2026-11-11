
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    basePath: "/calculate-tfz",
    reactStrictMode: true,

    ...(process.env.BUILD_STANDALONE === "true"
        ? { output: "standalone" as const }
        : {}),

    images: {
        remotePatterns: [],
    },

    async headers() {
        return [
            {
                source: "/:path*",
                headers: [
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "X-Frame-Options", value: "DENY" },
                    {
                        key: "Referrer-Policy",
                        value: "strict-origin-when-cross-origin",
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
