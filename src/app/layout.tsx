import type { Metadata } from "next";
import { Manrope, Syne } from "next/font/google";
import localFont from "next/font/local";
import { AppNav } from "@/components/AppNav";
import { AppProviders } from "@/components/AppProviders";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const roba = localFont({
  src: "./fonts/Roba-Regular.ttf",
  variable: "--font-logo",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Arc — Training & Recovery",
  description: "Track workouts, supplements, and how you feel — powered by Neon.",
  appleWebApp: {
    capable: true,
    title: "Arc",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${manrope.variable} ${roba.variable}`}>
      <body>
        <AppProviders>
          <AppNav>{children}</AppNav>
        </AppProviders>
      </body>
    </html>
  );
}
