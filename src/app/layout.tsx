import './globals.css';
import type { Metadata, Viewport } from 'next';
import { StoreProvider } from '@/components/store-provider';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { bodyFont, titleFont } from '@/lib/fonts';
const publicUrl = process.env.NEXT_PUBLIC_SITE_URL;
export const metadata: Metadata = {
  title: { default: 'Gaindé Sportif — La fierté se porte.', template: '%s · Gaindé Sportif' },
  description:
    'Dakar dans le cœur, le Sénégal dans l’âme. Découvrez les collections Gaindé Sportif et parlons de votre projet d’équipe.',
  metadataBase: publicUrl ? new URL(publicUrl) : undefined,
  applicationName: 'Gaindé Sportif',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Gaindé' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
  robots: {
    index: process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true',
    follow: process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true',
  },
  ...(publicUrl
    ? {
        openGraph: {
          title: 'Gaindé Sportif — La fierté se porte.',
          description: 'À chacun son Gaindé.',
          type: 'website',
          locale: 'fr_SN',
          images: ['/images/social.webp'],
        },
      }
    : {}),
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#123c2d' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${bodyFont.variable} ${titleFont.variable}`}>
      <body className="bg-ivory font-sans text-gainde antialiased">
        <a href="#main" className="skip-link">
          Aller au contenu
        </a>
        <StoreProvider>
          <Header />
          <main id="main" tabIndex={-1} className="min-h-[60svh] focus:outline-none">
            {children}
          </main>
          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}
