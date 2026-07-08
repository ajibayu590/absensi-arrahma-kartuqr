import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

// Declare a global variable for deferredPrompt
declare global {
  interface Window {
    deferredPrompt: any;
  }
}

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  title: "Sistem Absensi Siswa - SMK AR-RAHMA MANDIRI INDONESIA",
  description: "Aplikasi Absensi Mandiri Siswa berbasis QR Code dan Notifikasi WhatsApp Real-time SMK AR-RAHMA MANDIRI INDONESIA",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${plusJakartaSans.variable} h-full`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Absensi" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="theme-color" content="#059669" />
        <link rel="manifest" href="/manifest.json" />
        <script id="service-worker-registration" dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/service-worker.js').then(function(registration) {
                  console.log('ServiceWorker registration successful with scope: ', registration.scope);
                }, function(err) {
                  console.log('ServiceWorker registration failed: ', err);
                });
              });
            }
          `
        }} />
      </head>
        <body className="h-full bg-zinc-50 dark:bg-zinc-950 font-sans antialiased text-zinc-900 dark:text-zinc-50">
          {children}
          <Toaster position="top-center" reverseOrder={false} />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.addEventListener('beforeinstallprompt', (e) => {
                  e.preventDefault();
                  window.deferredPrompt = e;
                  console.log('beforeinstallprompt fired');
                  // Optionally, show a custom install button here
                });

                window.addEventListener('appinstalled', () => {
                  console.log('PWA installed successfully!');
                });
              `,
            }}
          />
        </body>
    </html>
  );
}
