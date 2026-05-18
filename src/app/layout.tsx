import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Orbit | AI Student Productivity",
  description: "A premium AI-first SaaS platform for notes, PDFs, and study assistance.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased bg-black text-white`} suppressHydrationWarning>
        <div className="relative min-h-screen w-full selection:bg-white/20 overflow-x-hidden">
          {/* Subtle noise/grid gradient background matching Galaxy Studio */}
          <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900/60 via-black to-black pointer-events-none" />
          <div className="relative z-10 w-full min-h-screen flex flex-col">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
