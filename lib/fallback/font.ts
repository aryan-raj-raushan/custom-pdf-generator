// lib/fonts.ts
// Optional: next/font-based loading is more reliable than a CSS @import for
// html2canvas, because Next.js self-hosts the font files and font-display
// resolution is predictable — avoids a flash of fallback glyphs getting
// baked into the exported PDF on a slow connection.
//
// Usage in app/layout.tsx:
//
//   import { notoDevanagari, tinos } from "@/lib/fonts";
//
//   export default function RootLayout({ children }: { children: React.ReactNode }) {
//     return (
//       <html lang="en" className={`${tinos.variable} ${notoDevanagari.variable}`}>
//         <body>{children}</body>
//       </html>
//     );
//   }
//
// Then in globals.css:
//   :root {
//     --font-paper: var(--font-tinos), "Times New Roman", serif;
//     --font-devanagari: var(--font-noto-devanagari), sans-serif;
//   }
//
// If you'd rather not touch next/font, the CSS @import in
// styles/exam-paper.css works too — just slightly less deterministic
// for the very first export right after a cold page load.

import { Tinos, Noto_Sans_Devanagari } from 'next/font/google';

export const tinos = Tinos({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-tinos',
  display: 'swap',
});

export const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-devanagari',
  display: 'swap',
});
