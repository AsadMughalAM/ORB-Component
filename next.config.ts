import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep the dev overlay badge out of screen captures.
  devIndicators: false,
  webpack(config) {
    // Import .glsl / .vert / .frag files as raw strings.
    config.module.rules.push({
      test: /\.(glsl|vert|frag)$/,
      type: "asset/source",
    });
    return config;
  },
};

export default nextConfig;
