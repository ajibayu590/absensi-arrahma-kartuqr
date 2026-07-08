import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["ruangrupa.ajibayu.my.id", "smkarrahma.ajibayu.my.id"],
  serverExternalPackages: ["@react-pdf/renderer"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ignore @react-pdf/renderer on the server to prevent SSR chunk errors
      config.resolve.alias["@react-pdf/renderer"] = false;
    }
    return config;
  },
};

export default nextConfig;
