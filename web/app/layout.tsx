import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://diffender.com"),
  title: {
    default: "Diffender — Ship the demo, not just the code.",
    template: "%s · Diffender",
  },
  description:
    "Diffender auto-generates polished, deterministic demo videos of your web app — captions, voice-over, intro/outro and a shareable link, straight from your real components.",
  openGraph: {
    title: "Diffender — Ship the demo, not just the code.",
    description:
      "Deterministic, shareable demo videos of your web app, generated from your real components.",
    url: "https://diffender.com",
    siteName: "Diffender",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
