import type { Metadata } from 'next';
import { EarlyAccessProvider } from '@/components/early-access/early-access-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'CoachOS — The Operating System for Online Fitness Coaches',
  description:
    'Manage clients, create workout programs, track progress, and run your online fitness coaching business from one place.',
  openGraph: {
    title: 'CoachOS — The Operating System for Online Fitness Coaches',
    description:
      'Manage clients, create workout programs, track progress, and run your online fitness coaching business from one place.',
    type: 'website',
    url: 'https://coachos.example.com',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'CoachOS' }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CoachOS — The Operating System for Online Fitness Coaches',
    description:
      'Manage clients, create workout programs, track progress, and run your online fitness coaching business from one place.'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* One early-access modal for every call to action on the page. */}
        <EarlyAccessProvider>{children}</EarlyAccessProvider>
      </body>
    </html>
  );
}
