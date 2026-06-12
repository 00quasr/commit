import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "commit — show your work. see theirs.",
  description:
    "A photo of the work, on the rhythm you set. What your friends got done today stays locked until you post yours.",
  metadataBase: new URL("https://commit.app"),
  openGraph: {
    title: "commit — show your work. see theirs.",
    description:
      "A photo of the work, on the rhythm you set. What your friends got done today stays locked until you post yours.",
    url: "https://commit.app",
    siteName: "commit",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "commit",
    description: "Show your work. See theirs.",
  },
};

export const viewport: Viewport = {
  themeColor: "#faf8f4",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable}`}
    >
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
