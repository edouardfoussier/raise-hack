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
    default: "Diffender — Keep your product on-brand, every commit.",
    template: "%s · Diffender",
  },
  description:
    "Diffender is an AI-native design system that reasons about consistency across your product's visual and interactive surface — extracting your real design system, detecting drift, and proposing reconciliation to keep designers and engineers aligned.",
  openGraph: {
    title: "Diffender — Keep your product on-brand, every commit.",
    description:
      "An AI-native design system: extract your real tokens, detect drift on every commit, and reconcile changes — reasoning in your design tokens, not pixels.",
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
