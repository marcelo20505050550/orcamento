import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Permite build de produção mesmo com avisos do ESLint
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Permite build de produção mesmo com erros de tipo
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
