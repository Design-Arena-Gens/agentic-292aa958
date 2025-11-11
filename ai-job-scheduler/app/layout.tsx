import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI Job Scheduler',
  description:
    'Intelligent job scheduling platform combining classic OS algorithms with ML-driven predictions.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-950">
      <body className={`${inter.className} h-full text-slate-100`}>{children}</body>
    </html>
  );
}
