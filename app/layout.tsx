// app/layout.tsx
import type { Metadata } from 'next'

const SITE = 'https://muyu-101.vercel.app'

export const metadata: Metadata = {
  title: '木鱼101',
  description: '每天敲 101 下木鱼, 登上功德榜',
  openGraph: {
    title: '木鱼101',
    description: '每天敲 101 下木鱼, 登上功德榜',
    url: SITE,
    images: [`${SITE}/og.png`], // 1200x800 (3:2)
  },
  other: {
    // ✅ Farcaster Mini App 的 Embed 元数据
    'fc:miniapp': JSON.stringify({
      version: '1',
      imageUrl: `${SITE}/og.png`, // 3:2
      button: {
        title: '打开木鱼101',
        action: {
          type: 'launch_miniapp',          // 推荐动作类型
          name: '木鱼101',
          url: `${SITE}/vanilla`,          // ⬅️ 先指向极简就绪页验证；跑通后改回 `${SITE}/`
          splashImageUrl: `${SITE}/splash.png`, // 200x200
          splashBackgroundColor: '#000000',
        },
      },
    }),
    // （可选）兼容旧客户端
    'fc:frame': JSON.stringify({
      version: '1',
      imageUrl: `${SITE}/og.png`,
      button: {
        title: '打开木鱼101',
        action: {
          type: 'launch_frame',
          name: '木鱼101',
          url: `${SITE}/vanilla`,
          splashImageUrl: `${SITE}/splash.png`,
          splashBackgroundColor: '#000000',
        },
      },
    }),
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      {/* 不需要手写 <head>；Next 会根据 metadata 注入 meta 标签 */}
      <body>{children}</body>
    </html>
  )
}
