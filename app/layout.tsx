import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Only Respira Black — Della Respira is retired, don't reintroduce it here.
const respiraBlack = localFont({
  src: "./fonts/Respira_Black.ttf",
  variable: "--font-respira-black",
  weight: "900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Brosé — the new ritual",
  description: "Brosé, the new ritual.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={respiraBlack.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,400;0,500;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <div className="site-vignette" aria-hidden="true" />
        <div className="grain-overlay" aria-hidden="true" />
      </body>
    </html>
  );
}