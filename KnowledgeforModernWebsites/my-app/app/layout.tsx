import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import ContentHeader from "@/components/ContentHeader";
import MainContainer from "@/components/MainContainer";
import SidebarNav from "@/components/SidebarNav";
import { ShellProvider } from "@/components/ShellContext";
import { KMW_SITE } from "@/lib/kmwNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${KMW_SITE.name} - ${KMW_SITE.fullName}`,
  description:
    "Knowledge base for Modern Websites: Architecture, Security, DevOps, Scalability, Data, Observability, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen bg-background text-foreground">
          <ShellProvider>
            <SidebarNav />
            <ContentHeader />
            <MainContainer>{children}</MainContainer>
          </ShellProvider>
        </div>
      </body>
    </html>
  );
}
