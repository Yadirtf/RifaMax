import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fuentes que usan el ícono y las imágenes para WhatsApp y redes.
  outputFileTracingIncludes: { "/**": ["./assets/fonts/*.woff"] },
};

export default nextConfig;
