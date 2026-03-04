import { Auth0Provider } from '@auth0/nextjs-auth0/client';
import '../styles/globals.css';
import { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GPT Clone',
  description: 'ChatGPT clone',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#343541]" suppressHydrationWarning>
        <Auth0Provider>
          {children}
        </Auth0Provider>
      </body>
    </html>
  );
}
