'use client'

import { useEffect } from 'react'

// 极简：只负责尽快调用 ready()，用于验证宿主能否正常加载
export default function Vanilla() {
  useEffect(() => {
    (async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk')
        // 立刻发 ready（不 await），并补一次双保险
        sdk.actions.ready().catch(() => {})
        setTimeout(() => { try { sdk.actions.ready() } catch {} }, 300)
      } catch {}
    })()
  }, [])

  return (
    <main style={{
      padding: 24,
      fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,Arial'
    }}>
      <h1 style={{fontSize: 18, margin: 0}}>✅ Vanilla Ready</h1>
      <p style={{color: '#666', marginTop: 8}}>
        如果这个页面在 Warpcast 里能秒开，说明问题在你的 React 首页执行时机，
        按我们给的 <code>app/page.tsx</code>（动态导入 SDK + ready() 双保险）即可。
      </p>
    </main>
  )
}
