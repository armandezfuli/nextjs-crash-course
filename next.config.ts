import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    reactCompiler: false,
    experimental: {
      turbopackFileSystemCacheForDev: false
    },
}

export default nextConfig
