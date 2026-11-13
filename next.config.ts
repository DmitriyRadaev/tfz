
import type { NextConfig } from "next";
import { APP_BASE_PATH } from "./src/shared/lib/app-path";

const nextConfig: NextConfig = {
    basePath: APP_BASE_PATH,
    // Канонический /calculate-tfz/ задаёт Nginx; Next не должен убирать этот слеш.
    skipTrailingSlashRedirect: true,
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
