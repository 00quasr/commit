import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "commit — the drop is the proof",
  description:
    "Strava + BeReal for any goal worth committing to. Set the cycle. Drop the proof. The feed unlocks when you do.",
  metadataBase: new URL("https://commit.app"),
  openGraph: {
    title: "commit — the drop is the proof",
    description: "Strava + BeReal for any goal worth committing to. Set the cycle. Drop the proof.",
    url: "https://commit.app",
    siteName: "commit",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "commit", description: "The drop is the proof." },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[480px] bg-[radial-gradient(ellipse_60%_60%_at_50%_-10%,rgba(255,255,255,0.06),transparent_70%)]"
        />
        <div className="relative z-10">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
