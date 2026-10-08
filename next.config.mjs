/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.NEXT_PUBLIC_PUBLIC_SITE === "true";

const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  // Static export only for GitHub Pages; Vercel uses default SSR
  ...(isGitHubPages && {
    output: "export",
    basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
    distDir: ".next-public",
  }),
};

export default nextConfig;
