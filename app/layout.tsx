import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { THEME_INIT_SCRIPT } from '@/lib/theme'
import './globals.css'

export const metadata: Metadata = {
  title: '우리 가계부',
  description: '둘이서 함께 쓰는 가계부',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '우리 가계부',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F8FA' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0E14' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className="h-dvh overflow-hidden overscroll-none" suppressHydrationWarning>
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body className="h-dvh overflow-hidden overscroll-none bg-[#F7F8FA] dark:bg-[#0A0E14] antialiased" suppressHydrationWarning>
        {children}
        <Script
          id="sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').catch(console.error);
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
