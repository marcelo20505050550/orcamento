import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/providers";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistema de Orçamentos",
  description: "Sistema de Orçamentos para Fabricação de Produtos Personalizados",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          <div className="min-h-screen flex flex-col bg-background" suppressHydrationWarning>
            <Header />
            <div className="flex flex-1" suppressHydrationWarning>
              <Sidebar />
              <main className="flex-1 p-4 md:p-6 overflow-auto" suppressHydrationWarning>
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
