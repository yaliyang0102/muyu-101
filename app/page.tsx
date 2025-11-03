'use client'

import { useEffect, useState } from 'react'

type Leader = { fid: number; count: number }

// 懒加载 miniapp sdk，避免执行时机问题
let _sdk: any
async function getSdk() {
  if (_sdk) return _sdk
  const mod = await import('@farcaster/miniapp-sdk')
  _sdk = mod.sdk
  return _sdk
}

// 模块级：尽快发 ready（不 await）
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
  const [msg, setMsg] = useState<string>('') // 简单调试信息

  useEffect(() => {
    let finished = false
    ;(async () => {
      try {
        const sdk = await getSdk()
        sdk.actions.ready().catch(() => {})
        sdk.back.enableWebNavigation().catch(() => {})

        // 取上下文（失败兜底）
        try {
          const ctx = await sdk.context
          setFid(ctx?.user?.fid ?? null)
        } catch { setFid(null) }

        // 拉一次状态（直开浏览器可能 401，兜底即可）
        try {
          let auth = ''
          try { auth = `Bearer ${await sdk.quickAuth.getToken()}` } catch {}
          const res = await fetch('/api/state', { headers: auth ? { Authorization: auth } : {} })
          if (res.ok) {
            const data = await res.json()
            const my = data.myCount ?? 0
            setCount(my); setRemaining(101 - my); setLeaders(data.top10 ?? [])
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

    const t = setTimeout(() => { if (!finished) setLoading(false) }, 2000)
    return () => clearTimeout(t)
  }, [])

  const tap = async () => {
    if (tapping || remaining <= 0) return
    setTapping(true)
    setMsg('')

    try {
      const sdk = await getSdk()
      sdk.haptics.impactOccurred('light').catch(() => {})

      // 确保 fid 不为空：没有就再取一次
      let useFid = fid
      if (useFid == null) {
        try { const ctx = await sdk.context; useFid = ctx?.user?.fid ?? null } catch {}
      }
      if (useFid == null) {
        setMsg('未获取到 FID，请在 Warpcast 内打开重试')
        return
      }

      // 有 token 带 token，没有也继续（后端演示期以 fid 为准）
      let auth = ''
      try { auth = `Bearer ${await sdk.quickAuth.getToken()}` } catch {}

      const res = await fetch('/api/tap', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', ...(auth ? { Authorization: auth } : {}) },
        body: JSON.stringify({ fid: useFid }),
      })
      const data = await res.json().catch(() => ({} as any))
      if (!res.ok || data?.ok === false) {
        setMsg(`未计数：${data?.reason || res.status}`)
        return
      }

      const my = data.myCount ?? 0
      setCount(my); setRemaining(101 - my); setLeaders(data.top10 ?? [])
      setFid(useFid)
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
      <div style={{fontSize:14,color:'#666',marginBottom:8}}>
        {fid ? `FID #${fid}` : '开发模式'} 今天已敲 {count} / 101
      </div>
      {msg && <div style={{fontSize:12,color:'#c00',marginBottom:8}}>{msg}</div>}

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
