import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CageClock',
  description: 'Real-time MMA fight tracking',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-white">
        {children}
      </body>
    </html>
  )
}