// app/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '木鱼101',
  description: '每天敲 101 下木鱼, 登上功德榜',
  openGraph: {
    title: '木鱼101',
    description: '每天敲 101 下木鱼, 登上功德榜',
    images: ['https://muyu-101.vercel.app/og.png'], // 3:2, 建议 1200x800
  },
  // 关键：嵌入 Farcaster Mini App 的 meta
  other: {
    'fc:miniapp': JSON.stringify({
      version: '1',
      imageUrl: 'https://muyu-101.vercel.app/og.png', // 3:2 图片
      button: {
        title: '打开木鱼101',
        action: {
          type: 'launch_miniapp', // 规范推荐，兼容也支持 launch_frame
          name: '木鱼101',
          url: 'https://muyu-101.vercel.app',
          splashImageUrl: 'https://muyu-101.vercel.app/icon.png', // 200x200 建议
          splashBackgroundColor: '#000000',
        },
      },
    }),
    // （可选）向后兼容旧客户端
    'fc:frame': JSON.stringify({
      version: '1',
      imageUrl: 'https://muyu-101.vercel.app/og.png',
      button: {
        title: '打开木鱼101',
        action: {
          type: 'launch_frame',
          name: '木鱼101',
          url: 'https://muyu-101.vercel.app',
          splashImageUrl: 'https://muyu-101.vercel.app/icon.png',
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
