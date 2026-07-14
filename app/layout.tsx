import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  title: "FIND:US — 서로를 발견하는 다섯 개의 방",
  description: "조별 QR 입장과 퇴장, 방별 실시간 현황을 확인하는 FIND:US 여정",
  openGraph: {
    title: "FIND:US",
    description: "서로를 발견하는 다섯 개의 방",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "FIND:US",
    description: "서로를 발견하는 다섯 개의 방",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
