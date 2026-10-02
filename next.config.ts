import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // ffmpeg.wasm pesa ~32 MB: que el navegador lo cachee entre usos.
        source: "/ffmpeg/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
