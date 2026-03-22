import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "WasteWise AI+ | Know Your Carbon Impact",
    template: "%s | WasteWise AI+",
  },
  description:
    "Scan receipts, classify waste, and get AI-powered sustainability insights. Track your carbon footprint and offset your impact.",
  keywords: ["sustainability", "carbon footprint", "waste classification", "receipt scanner", "eco-friendly"],
  openGraph: {
    title: "WasteWise AI+ | Know Your Carbon Impact",
    description: "Scan receipts and waste to discover your environmental impact. Get personalized AI tips to reduce your carbon footprint.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
