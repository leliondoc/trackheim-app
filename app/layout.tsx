import type { Metadata } from 'next';
import {
  Geist,
  Geist_Mono,
  IM_Fell_English,
  Pirata_One,
} from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const fell = IM_Fell_English({
  variable: '--font-fell',
  subsets: ['latin'],
  weight: '400',
});

const pirata = Pirata_One({
  variable: '--font-pirata',
  subsets: ['latin'],
  weight: '400',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://registre-des-ruines.leliondoc.chatgpt.site'),
  title: 'Trackheim — créateur de bande et tracker de campagne Mordheim',
  description:
    'Créateur de bande et tracker de campagne Mordheim alimenté par la Grande Librairie de Mordheim.',
  openGraph: {
    title: 'Trackheim',
    description: 'Créez votre bande. Survivez à la campagne.',
    type: 'website',
    locale: 'fr_FR',
    images: [
      {
        url: '/og.png',
        width: 1731,
        height: 909,
        alt: 'Trackheim — créateur de bande et tracker Mordheim',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trackheim',
    description: 'Créez votre bande. Survivez à la campagne.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fell.variable} ${pirata.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
