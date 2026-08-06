import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["ruangrupa.ajibayu.my.id", "smkarrahma.ajibayu.my.id"],
  serverExternalPackages: ["@react-pdf/renderer"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias["@react-pdf/renderer"] = false;
    }
    return config;
  },
};

export default nextConfig;
