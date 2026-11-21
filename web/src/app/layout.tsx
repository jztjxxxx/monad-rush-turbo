import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Monad Rush Turbo | 400ms Dynamic Odds Prediction on Monad',
  description: 'High-speed binary prediction with real-time dynamic odds, win streak jackpot, and 10s lightning rounds on Monad Testnet.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-[#836EF9] selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
