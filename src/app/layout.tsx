import type { Metadata } from "next";
import { Manrope, Syne } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Arc — Training & Recovery",
  description: "Track workouts, supplements, and how you feel — powered by Neon.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${syne.variable} ${manrope.variable}`}>
      <body>
        <div className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6">
          <AppProviders>
            <AppNav />
            <main className="mt-6">{children}</main>
          </AppProviders>
        </div>
      </body>
    </html>
  );
}
