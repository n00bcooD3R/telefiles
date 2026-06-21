import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sqlite3", "sqlite", "@cloudflare/next-on-pages"],
};

export default nextConfig;
