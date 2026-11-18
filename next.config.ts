import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NEXT_PUBLIC_STATIC_EXPORT === "1" ? { output: "export" as const } : {}),
  turbopack: {
    // 親フォルダのlockfileをルートと誤認して入れ子の .next を作らないよう、
    // このプロジェクト直下をルートに固定する。
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
