export const metadata = { title: '木鱼101', description: '每天敲 101 下木鱼，登上功德榜' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
