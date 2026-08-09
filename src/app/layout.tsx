import type { Metadata } from 'next';
import { Inter, Fraunces, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', axes: ['SOFT', 'WONK', 'opsz'] });
const ibmPlexMono = IBM_Plex_Mono({ weight: ['400', '500', '600'], subsets: ['latin'], variable: '--font-ibm-plex' });

export const metadata: Metadata = {
  title: 'Marlowe & Rose — Salon Revenue Intelligence',
  description: 'Predictive revenue and staffing intelligence for modern salons.',
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
