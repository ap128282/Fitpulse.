import type { Metadata, Viewport } from 'next';
import { Barlow_Condensed, DM_Sans } from 'next/font/google';
import './globals.css';
import BottomNav from '@/components/BottomNav';
import AuthSync from '@/components/AuthSync';
import OnboardingGate from '@/components/OnboardingGate';
import SWRegister from '@/components/SWRegister';

const display = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});
const body = DM_Sans({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata: Metadata = {
  title: 'FitPulse',
  description: 'Coach de musculation IA : séances sur mesure, surcharge progressive au RIR, suivi.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'FitPulse', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
};

export const viewport: Viewport = {
  themeColor: '#0B0C10',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${display.variable} ${body.variable} min-h-screen bg-ink font-sans text-white antialiased`}>
        <main className="mx-auto min-h-screen w-full max-w-md px-4 pb-32 pt-6">{children}</main>
        <BottomNav />
        <OnboardingGate />
        <AuthSync />
        <SWRegister />
      </body>
    </html>
  );
}
