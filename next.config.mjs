/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  distDir: process.env.NEXT_PUBLIC_PUBLIC_SITE === "true" ? ".next-public" : ".next",
  trailingSlash: true,
};

export default nextConfig;
