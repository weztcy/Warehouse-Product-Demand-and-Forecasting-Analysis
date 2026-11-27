import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Warehouse Product Demand and Forecasting Analysis",
  description:
    "Analisis permintaan produk multi-gudang, segmentasi ABC-XYZ, uji akurasi historis, dan proyeksi permintaan 2017.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-[#070b12] font-sans text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
