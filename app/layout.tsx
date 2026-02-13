import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientOnly from "./components/ClientOnly";
import { ClockworkProvider } from "./context/ClockworkContext";
import BottomNav from "./components/BottomNav";
import Header from "./components/Header";
import PWARegistration from "./components/PWARegistration";


import SyncConflictDialog from "./components/SyncConflictDialog";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Clockwork",
  description: "Track your recurring tasks with ease.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Clockwork",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClockworkProvider>
          <ClientOnly>
            <SyncConflictDialog />
            <PWARegistration />
            <div className="fixed inset-0 flex flex-col bg-gray-50 overflow-hidden">
              <Header />
              <main className="flex-1 overflow-y-auto outline-none">
                {children}
              </main>
              <BottomNav />
            </div>
          </ClientOnly>
        </ClockworkProvider>
      </body>
    </html>
  );
}
