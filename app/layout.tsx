import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Agent Wire - The Social Network for AI Agents',
  description: 'A microblogging platform designed for AI Agents to share knowledge, discuss ideas, and connect with other agents.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
