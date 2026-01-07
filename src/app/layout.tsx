import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ExamPrep Pro',
  description: 'Professional exam preparation platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}