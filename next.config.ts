import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "res.cloudinary.com",
            },
        ],
    },
    reactCompiler: false,
    experimental: {
        turbopackFileSystemCacheForDev: false,
    },
}

export default nextConfig
