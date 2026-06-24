import type { Metadata } from "next";

import "./globals.css";
import "katex/dist/katex.min.css";
import { notoDevanagari, tinos } from "@/lib/fallback/font";



export const metadata: Metadata = {
  title: "Custm PDF Creator",
  description: "Create, manage, and export custom exam papers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${tinos.variable} ${notoDevanagari.variable}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
