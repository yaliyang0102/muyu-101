export const metadata = {
  title: '木鱼101',
  description: '每天敲 101 下木鱼，登上功德榜',
  themeColor: '#0a0f1b',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body style={{
        margin:0, background:'#0a0f1b', color:'#e8edf6',
        fontFamily:'ui-sans-serif, system-ui, -apple-system, "Inter", "SF Pro", "Segoe UI", Roboto, Arial'
      }}>
        {children}
      </body>
    </html>
  )
}
