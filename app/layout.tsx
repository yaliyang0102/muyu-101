// app/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '木鱼101',
  description: '每天敲 101 下木鱼, 登上功德榜',
  openGraph: {
    title: '木鱼101',
    description: '每天敲 101 下木鱼, 登上功德榜',
    images: ['https://muyu-101.vercel.app/og.png'], // 3:2
  },
  other: {
    'fc:miniapp': JSON.stringify({
      version: '1',
      imageUrl: 'https://muyu-101.vercel.app/og.png', // 3:2，例如 1200x800
      button: {
        title: '打开木鱼101',
        action: {
          type: 'launch_frame',                 // ✅ 规范要求
          name: '木鱼101',
          url: 'https://muyu-101.vercel.app',
          splashImageUrl: 'https://muyu-101.vercel.app/splash.png', // ✅ 200x200
          splashBackgroundColor: '#000000',
        },
      },
    }),
    // 可选：向后兼容旧客户端
    'fc:frame': JSON.stringify({
      version: '1',
      imageUrl: 'https://muyu-101.vercel.app/og.png',
      button: {
        title: '打开木鱼101',
        action: {
          type: 'launch_frame',
          name: '木鱼101',
          url: 'https://muyu-101.vercel.app',
          splashImageUrl: 'https://muyu-101.vercel.app/splash.png',
          splashBackgroundColor: '#000000',
        },
      },
    }),
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
