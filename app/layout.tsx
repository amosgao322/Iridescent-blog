import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import ConditionalLayoutWrapper from "@/components/layout/ConditionalLayoutWrapper";
import PageTimeTracker from "@/components/analytics/PageTimeTracker";
import AnalyticsV2Tracker from "@/components/analytics-v2/AnalyticsV2Tracker";

export const metadata: Metadata = {
  title: "高槐玉的独立空间",
  description: "博观而约取，厚积而薄发。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <PageTimeTracker />
        <AnalyticsV2Tracker />
        <div className="min-h-screen bg-white">
          <Header />
          <ConditionalLayoutWrapper sidebar={<Sidebar />}>
            {children}
          </ConditionalLayoutWrapper>
        </div>
      </body>
    </html>
  );
}

