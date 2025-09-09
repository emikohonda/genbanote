import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* 既存のオプションがあればここに残す */
  eslint: {
    // Vercel本番ビルドでESLintエラーを無視する
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
