import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "QPE — Quantum Phase Estimation Explainer",
  description: "Interactive visualisation of Quantum Phase Estimation: phase gates, Hamiltonians, precision scaling, and noise.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-[var(--bg-dark)] text-[var(--text)]">
        <Navbar />
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">{children}</main>
        <footer className="border-t border-[var(--bg-card)]/10 py-4 text-center text-xs text-[var(--text-muted)]">
          Built with Next.js • QPE Deep Dive
        </footer>
      </body>
    </html>
  );
}
