import type { Metadata } from "next";
import {
  Inter,
  Plus_Jakarta_Sans,
  Playfair_Display,
  Space_Grotesk,
  DM_Sans,
} from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { StoreProvider } from "@/context/StoreContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dmsans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ArthaOS - Sistem Kasir & Manajemen Bisnis",
  description:
    "Point of Sale, Inventori FIFO, Buku Kasbon, dan Laporan Keuangan untuk UMKM Indonesia.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${plusJakarta.variable} ${playfair.variable} ${spaceGrotesk.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen font-sans bg-background text-foreground selection:bg-primary/20 selection:text-primary" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <StoreProvider>
              <TooltipProvider>
                {children}
              </TooltipProvider>
            </StoreProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
