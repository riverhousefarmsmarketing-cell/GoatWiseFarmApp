import type { Metadata, Viewport } from 'next';
import { DM_Sans, DM_Serif_Display } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { OfflineIndicator } from '@/components/OfflineIndicator';

const dmSans = DM_Sans({ 
  subsets: ['latin'],
  variable: '--font-sans',
});

const dmSerif = DM_Serif_Display({ 
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://goatwise.app'),
  title: 'GoatWise — Farm Management Built by a Goat Farmer',
  description: 'Track your herd\'s health, breeding, milk production, and finances. FAMACHA scoring, kidding calendars, Schedule F tax export, and 14 breed profiles — built by a goat farmer, for goat farmers.',
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'GoatWise',
    statusBarStyle: 'default',
  },
  openGraph: {
    title: 'GoatWise — Farm Management Built by a Goat Farmer',
    description: 'Track your herd\'s health, breeding, milk production, and finances with the only app built specifically for goat farmers.',
    url: 'https://www.goatwise.app',
    siteName: 'GoatWise',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#105040',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${dmSerif.variable} font-sans`}>
        <OfflineIndicator />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
