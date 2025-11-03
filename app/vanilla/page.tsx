'use client'

export default function Vanilla() {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        {/* 直接用 CDN 版 SDK，确保立即可用 */}
        <script
          type="module"
          dangerouslySetInnerHTML={{
            __html: `
              import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';
              // 尽快发 ready 信号（不 await）
              try { sdk.actions.ready(); } catch (e) {}
              // 可选：再补一次，防极端时机问题
              setTimeout(() => { try { sdk.actions.ready(); } catch(e) {} }, 300);
            `,
          }}
        />
        <title>Vanilla Ready Test</title>
      </head>
      <body style={{margin:0,padding:24,fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, Arial'}}>
        <h1 style={{fontSize:18,margin:0}}>✅ Vanilla Ready</h1>
        <p style={{color:'#666'}}>如果这个页面在 Warpcast 里能秒开，说明问题在你的 React 页执行时机。</p>
      </body>
    </html>
  )
}
