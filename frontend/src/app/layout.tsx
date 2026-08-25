import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ServiceWorkerInit } from "@/components/ServiceWorkerInit";

const a2g = localFont({
  src: [
    { path: "./fonts/에이투지체-3Light.ttf",    weight: "300" },
    { path: "./fonts/에이투지체-4Regular.ttf",  weight: "400" },
    { path: "./fonts/에이투지체-5Medium.ttf",   weight: "500" },
    { path: "./fonts/에이투지체-6SemiBold.ttf", weight: "600" },
    { path: "./fonts/에이투지체-7Bold.ttf",     weight: "700" },
    { path: "./fonts/에이투지체-8ExtraBold.ttf",weight: "800" },
  ],
  variable: "--font-a2g",
});

export const metadata: Metadata = {
  title: "onetask",
  description: "개인 학습 + 일정 대시보드",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "onetask",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        {/* These global font stylesheets are intentionally declared in the root app layout. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500&display=swap" />
        <meta name="theme-color" content="#1a1a1a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${a2g.variable} antialiased`}>
        <ServiceWorkerInit />
        <div id="app-frame">
          {children}
        </div>
      </body>
    </html>
  );
}
