'use client'

import { useEffect, useState } from 'react'

type Leader = { fid: number; count: number }

// --- 懒加载 miniapp sdk，避免执行时机问题 ---
let _sdk: any
async function getSdk() {
  if (_sdk) return _sdk
  const mod = await import('@farcaster/miniapp-sdk')
  _sdk = mod.sdk
  return _sdk
}

// ✅ 模块级：页面一加载（客户端）就尽快发 ready（不 await）
if (typeof window !== 'undefined') {
  Promise.resolve().then(async () => {
    try {
      const sdk = await getSdk()
      sdk.actions.ready().catch(() => {})
    } catch {}
  })
}

export default function Page() {
  const [fid, setFid] = useState<number | null>(null)
  const [count, setCount] = useState(0)
  const [remaining, setRemaining] = useState(101)
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [loading, setLoading] = useState(true)
  const [tapping, setTapping] = useState(false)

  useEffect(() => {
    let finished = false
    ;(async () => {
      try {
        const sdk = await getSdk()

        // ✅ 再发一次 ready（不 await）
        sdk.actions.ready().catch(() => {})
        sdk.back.enableWebNavigation().catch(() => {})

        // 取上下文（失败兜底）
        try {
          const ctx = await sdk.context
          setFid(ctx?.user?.fid ?? null)
        } catch { setFid(null) }

        // 拉一次状态（无 token/401 兜底；1.5s 超时）
        let auth = ''
        try { auth = `Bearer ${await sdk.quickAuth.getToken()}` } catch { auth = '' }

        const ctrl = new AbortController()
        const to = setTimeout(() => ctrl.abort(), 1500)
        try {
          const res = await fetch('/api/state', {
            headers: auth ? { Authorization: auth } : {},
            signal: ctrl.signal,
          })
          if (res.ok) {
            const data = await res.json()
            const my = data.myCount ?? 0
            setCount(my)
            setRemaining(101 - my)
            setLeaders(data.top10 ?? [])
          } else {
            setCount(0); setRemaining(101); setLeaders([])
          }
        } catch {
          setCount(0); setRemaining(101); setLeaders([])
        } finally { clearTimeout(to) }
      } finally {
        finished = true
        setLoading(false)
      }
    })()
