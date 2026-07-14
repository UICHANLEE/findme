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
  title: "FIND:US — 서로를 발견하는 다섯 개의 방",
  description: "조별 QR 입장과 퇴장, 방별 실시간 현황을 확인하는 FIND:US 여정",
  openGraph: {
    title: "FIND:US",
    description: "서로를 발견하는 다섯 개의 방",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "FIND:US — 서로를 발견하는 다섯 개의 방" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "FIND:US",
    description: "서로를 발견하는 다섯 개의 방",
    images: ["/og.png"],
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
