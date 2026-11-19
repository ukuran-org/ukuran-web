import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Google_Sans } from "next/font/google";
import localFont from "next/font/local";
import favicon from "../../../assets/favicon.svg";
import "./globals.css";

const googleSans = Google_Sans({
  variable: "--font-google-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

// Sans Ukuran is reserved for the UKURAN wordmark.
const sansUkuran = localFont({
  variable: "--font-sans-ukuran",
  src: "../../../assets/fonts/SansUkuran-Bold.woff2",
  weight: "700",
  style: "normal",
});

export const metadata: Metadata = {
  title: "Ukuran",
  icons: {
    icon: { url: favicon.src, type: "image/svg+xml" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${googleSans.variable} ${sansUkuran.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
