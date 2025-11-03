'use client'

import { useEffect, useState } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'

// ✅ 模块级：页面一加载就尽快告诉宿主“我准备好了”
if (typeof window !== 'undefined') {
  Promise.resolve().then(() => {
    sdk.actions.ready().catch(() => {})
  })
}

type Leader = { fid: number; count: number }

export default function Page() {
  const [fid, setFid] = useState<number | null>(null)
  const [count, setCount] = useState(0)
  const [remaining, setRemaining] = useState(101)
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [loading, setLoading] = useState(true)
  const [tapping, setTapping] = useState(false)

  useEffect(() => {
    // ✅ 再发一次 ready（不 await），双保险
    sdk.actions.ready().catch(() => {})
    sdk.back.enableWebNavigation().catch(() => {})

    let finished = false
    ;(async () => {
      try {
        // 拿上下文（在非 Farcaster 环境下可能取不到，需 try/catch）
        try {
          const ctx = await sdk.context
          setFid(ctx?.user?.fid ?? null)
        } catch {
          setFid(null)
        }

        // 拉一次状态（无 token/401 也要优雅降级）
        try {
          const auth = await authHeader()
          const res = await fetch('/api/state', { headers: { Authorization: auth } })
          if (res.ok) {
            const data = await res.json()
            setCount(data.myCount ?? 0)
            setRemaining(101 - (data.myCount ?? 0))
            setLeaders(data.top10 ?? [])
          } else {
            setCount(0); setRemaining(101); setLeaders([])
          }
        } catch {
          setCount(0); setRemaining(101); setLeaders([])
        }
      } finally {
        finished = true
        setLoading(false)
      }
    })()

    // 防极端场景：2s 后强制结束 loading，避免宿主里卡转圈
    const t = setTimeout(() => { if (!finished) setLoading(false) }, 2000)
    return () => clearTimeout(t)
  }, [])

  const tap = async () => {
    if (tapping || remaining <= 0) return
    setTapping(true)
    try {
      sdk.haptics.impactOccurred('light').catch(() => {})
      const res = await fetch('/api/tap', {
        method: 'POST',
        headers: { Authorization: await authHeader() }
      })
      if (res.ok) {
        const data = await res.json()
        const my = data.myCount ?? 0
        setCount(my)
        setRemaining(101 - my)
        setLeaders(data.top10 ?? [])
      }
    } finally {
      setTapping(false)
    }
  }

  if (loading) return null

  return (
    <main style={{
      padding:'24px',
      fontFamily:'system-ui,-apple-system,Segoe UI,Roboto,Arial',
      display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center'
    }}>
      <h1 style={{fontSize:20,marginBottom:8}}>木鱼101 🪵</h1>
      <div style={{fontSize:14,color:'#666',marginBottom:16}}>
        {fid ? `FID #${fid}` : '开发模式'} 今天已敲 {count} / 101
      </div>

      <button
        onClick={tap}
        disabled={remaining<=0 || tapping}
        style={{
          width:160,height:160,borderRadius:'100%',border:'none',
          background: remaining>0 ? '#ffd983' : '#bbb',
          fontSize:18,fontWeight:700,boxShadow:'0 8px 24px rgba(0,0,0,.16)', cursor:'pointer'
        }}
      >
        {remaining>0 ? (tapping ? '……' : '敲一下') : '功德已满'}
      </button>

      <div style={{marginTop:12,fontSize:14,color:'#555'}}>
        {remaining>0 ? `今天还可以敲 ${remaining} 下` : '明天再来继续修行'}
      </div>

      <section style={{width:'100%',maxWidth:360,marginTop:28,textAlign:'left'}}>
        <div style={{fontWeight:700,marginBottom:8,fontSize:16}}>今日排行榜</div>
        {leaders.length>0 ? leaders.map((it, i) => (
          <div key={i} style={{
            display:'flex',justifyContent:'space-between',
            padding:'8px 12px',borderRadius:8,background:'#f5f5f5',
            marginBottom:6,fontSize:14
          }}>
            <span>#{i+1} FID {it.fid}</span>
            <span>{it.count} 下</span>
          </div>
        )) : <div style={{color:'#888'}}>还没有人敲，做第一个吧！</div>}
      </section>
    </main>
  )
}

async function authHeader() {
  try {
    const token = await sdk.quickAuth.getToken()
    return `Bearer ${token}`
  } catch {
    // 非 Farcaster 宿主环境下（浏览器直开）没有 token：返回空串
    return ''
  }
}
