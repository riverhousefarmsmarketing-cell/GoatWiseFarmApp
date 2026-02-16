import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GoatWise — Farm Management Built by a Goat Farmer',
  description: 'Track your herd\'s health, breeding, milk production, and finances. FAMACHA scoring, kidding calendars, Schedule F tax export, and 14 breed profiles — built by a goat farmer, for goat farmers.',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'GoatWise — Farm Management Built by a Goat Farmer',
    description: 'Track your herd\'s health, breeding, milk production, and finances with the only app built specifically for goat farmers.',
    url: 'https://www.goatwise.app',
    siteName: 'GoatWise',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
