import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { ClientProviders } from "@/components/ClientProviders";
import { PushInitializer } from "@/components/push/PushInitializer";
import { Toaster } from "sonner";
import { Suspense } from "react"; // Added for safety
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Espirito Goals & Habits",
  description: "A personal app for couples & partners to share goals, plan, and connect",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Espirito",
    startupImage: [
      {
        url: "/icon-512.png",
        media: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
    ],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Espirito",
    "format-detection": "telephone=no",
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563eb",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 1. suppressHydrationWarning is required on <html> for next-themes
    <html lang="en" suppressHydrationWarning>
      <body 
        className={`${geistSans.className} antialiased`}
        // 2. suppressHydrationWarning is required on <body> to ignore extension-injected attributes
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClientProviders>
            {/* 3. Wrap in Suspense to prevent Push registration from blocking hydration */}
            <Suspense fallback={null}>
              <PushInitializer /> 
            </Suspense>
            {children}
          </ClientProviders>
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}