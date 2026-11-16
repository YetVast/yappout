import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'YappOut — Audio-first Synchronized Reader',
  description:
    'Convert text and Markdown into synchronized speech with non-mutating visual tracking and interactive seeking.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light">
      <body>{children}</body>
    </html>
  );
}
