import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Mets la gomme ! — Gestion de tournées à domicile',
  description: 'Application professionnelle pour organiser vos visites à domicile, optimiser vos tournées et calculer vos frais kilométriques.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Mets la gomme !' },
  formatDetection: { telephone: false },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="font-sans">
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body className="min-h-screen">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'text-sm font-medium',
            duration: 3000,
            style: { borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
          }}
        />
      </body>
    </html>
  );
}
