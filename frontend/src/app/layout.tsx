import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { StoreProvider } from "@/context/StoreContext";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "ArthaOS — Sistem Kasir & Manajemen Bisnis",
  description:
    "Point of Sale, Inventori FIFO, Buku Kasbon, dan Laporan Keuangan untuk UMKM Indonesia.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${inter.variable} dark`} suppressHydrationWarning>
      <body className="min-h-screen font-sans bg-background text-foreground selection:bg-primary/20 selection:text-primary" suppressHydrationWarning>
        <AuthProvider>
          <StoreProvider>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </StoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
