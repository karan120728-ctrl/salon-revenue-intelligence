import type { Metadata } from 'next';
import { Inter, Fraunces, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', axes: ['SOFT', 'WONK', 'opsz'] });
const ibmPlexMono = IBM_Plex_Mono({ weight: ['400', '500', '600'], subsets: ['latin'], variable: '--font-ibm-plex' });

export const metadata: Metadata = {
  metadataBase: new URL('https://salon-revenue-intelligence.vercel.app'),
  title: {
    default: 'Marlowe & Rose — AI Revenue Intelligence for Salons',
    template: '%s | Marlowe & Rose',
  },
  description: 'Stop losing revenue to no-shows, slow months, and inactive clients. Marlowe & Rose uses AI to predict no-shows, identify at-risk clients, and give your salon a daily briefing — before your first client sits down.',
  keywords: [
    'salon revenue software',
    'salon management AI',
    'no-show prediction salon',
    'hair salon analytics UK',
    'salon churn reduction',
    'Fresha alternative',
    'Timely alternative',
    'salon business intelligence',
    'independent salon software UK',
    'beauty salon AI assistant',
  ],
  authors: [{ name: 'Marlowe & Rose', url: 'https://salon-revenue-intelligence.vercel.app' }],
  creator: 'Marlowe & Rose',
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: 'https://salon-revenue-intelligence.vercel.app',
    siteName: 'Marlowe & Rose',
    title: 'Marlowe & Rose — AI Revenue Intelligence for Salons',
    description: 'Predict no-shows, win back lost clients, and grow salon profits with the AI advisor that knows your numbers better than you do.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Marlowe & Rose — Salon Revenue Intelligence Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marlowe & Rose — AI Revenue Intelligence for Salons',
    description: 'Predict no-shows, win back lost clients, and grow salon profits with the AI advisor that knows your numbers.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${fraunces.variable} ${ibmPlexMono.variable}`}>
        {/* Grain overlay */}
        <div className="grain" />
        {children}
      </body>
    </html>
  );
}
