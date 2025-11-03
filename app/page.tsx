'use client'

import { useEffect, useState } from 'react'

type Leader = { fid: number; count: number }

// --- 懒加载 miniapp sdk，避免构建/执行时机问题 ---
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

        // ✅ 再发一次 ready（双保险），且不要 await
        sdk.actions.ready().catch(() => {})
        sdk.back.enableWebNavigation().catch(() => {})

        // 拿上下文（可能很快也可能较慢，失败要兜底）
        try {
          const ctx = await sdk.context
          setFid(ctx?.user?.fid ?? null)
        } catch {
          setFid(null)
        }

        // 拉一次状态（无 token/401 要降级；并设置 1.5s 超时，避免卡）
        let auth = ''
        try {
          auth = `Bearer ${await sdk.quickAuth.getToken()}`
        } catch {
          auth = ''
        }

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
        } finally {
          clearTimeout(to)
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
      const sdk = await getSdk()
      sdk.haptics.impactOccurred('light').catch(() => {})
      const res = await fetch('/api/tap', {
        method: 'POST',
        headers: { Authorization: await (async () => {
          try {
            const s = await getSdk()
            return `Bearer ${await s.quickAuth.getToken()}`
          } catch { return '' }
        })() }
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
