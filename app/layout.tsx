import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import AccessibilityLayout from './components/AccessibilityLayout';
import {AccessibilityProvider} from "@/app/components/AccessibilityContext";

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'ClariSign - Accessible contracts',
  description: 'ClariSign',
};

export default function RootLayout({
                                     children,
                                   }: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
    <head>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/opendyslexic@5.1.0/index.min.css" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="manifest" href="/site.webmanifest" />
    </head>
    <body className={`${geistSans.variable} ${geistMono.variable}`}>
    <AccessibilityProvider>
    <AccessibilityLayout>{children}</AccessibilityLayout>
    </AccessibilityProvider>
    </body>
    </html>
  );
}
