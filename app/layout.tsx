import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ruixing Cheng's personal website",
  description: "A private workspace for useful files, resources and tools.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
