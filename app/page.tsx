'use client'

import { useEffect, useState } from 'react'

type Leader = { fid: number; count: number }

// ---- Farcaster SDK（动态导入 + ready 双保险）----
let _sdk: any
async function getSdk() {
  if (_sdk) return _sdk
  const mod = await import('@farcaster/miniapp-sdk')
  _sdk = mod.sdk
  return _sdk
}
if (typeof window !== 'undefined') {
  Promise.resolve().then(async () => {
    try { const sdk = await getSdk(); sdk.actions.ready().catch(()=>{}) } catch {}
  })
}

export default function Page() {
  const [fid, setFid] = useState<number | null>(null)
  const [count, setCount] = useState(0)
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [loading, setLoading] = useState(true)
  const [tapping, setTapping] = useState(false)
  const [msg, setMsg] = useState<string>('')

  const remaining = Math.max(0, 101 - count)
  const progress = Math.min(100, Math.round((count / 101) * 100))

  useEffect(() => {
    let done = false
    ;(async () => {
      try {
        const sdk = await getSdk()
        sdk.actions.ready().catch(()=>{})
        sdk.back.enableWebNavigation().catch(()=>{})

        try { const ctx = await sdk.context; setFid(ctx?.user?.fid ?? null) } catch { setFid(null) }

        try {
          let auth = ''
          try { auth = `Bearer ${await sdk.quickAuth.getToken()}` } catch {}
          const r = await fetch('/api/state', { headers: auth ? { Authorization: auth } : {} })
          if (r.ok) {
            const d = await r.json()
            setCount(d.myCount ?? 0)
            setLeaders(d.top10 ?? [])
          } else { setCount(0); setLeaders([]) }
        } catch { setCount(0); setLeaders([]) }
      } finally { done = true; setLoading(false) }
    })()
    const t = setTimeout(()=>{ if(!done) setLoading(false) }, 2000)
    return ()=>clearTimeout(t)
  }, [])

  const tap = async () => {
    if (tapping || remaining<=0) return
    setTapping(true); setMsg('')
    try {
      const sdk = await getSdk()
      sdk.haptics.impactOccurred('light').catch(()=>{})
      let useFid = fid
      if (useFid==null) { try { const ctx = await sdk.context; useFid = ctx?.user?.fid ?? null } catch {} }
      if (useFid==null) { setMsg('未获取到 FID，请在 Warpcast 内打开重试'); return }

      let auth = ''
      try { auth = `Bearer ${await sdk.quickAuth.getToken()}` } catch {}

      const r = await fetch('/api/tap', {
        method:'POST',
        headers:{ 'content-type':'application/json', ...(auth?{Authorization:auth}:{}) },
        body: JSON.stringify({ fid: useFid })
      })
      const data = await r.json().catch(()=>({}))
      if (!r.ok || data?.ok===false) { setMsg(`未计数：${data?.reason || r.status}`); return }
      const my = data.myCount ?? 0
      setCount(my); setLeaders(data.top10 ?? []); setMsg('')
    } finally { setTapping(false) }
  }

  if (loading) return null

  return (
    <main className="wrap">
      {/* 顶部大字标题（参照图：大字号、左对齐、暗黑背景） */}
      <header className="hero">
        <div className="headline">
          <div className="h1">What do you want</div>
          <div className="h1">to tap today?</div>
        </div>
        <div className="meta">
          <span className="pill">{fid ? `FID #${fid}` : 'Dev Mode'}</span>
          <span className="sep">•</span>
          <span className="pill ghost">今日进度 {count}/101</span>
        </div>
      </header>

      {/* 霓虹卡片：进度与统计 */}
      <section className="card">
        <div className="card-bg" />
        <div className="stats">
          <div className="col">
            <div className="label">剩余</div>
            <div className="num">{remaining}</div>
          </div>
          <div className="col">
            <div className="label">已敲</div>
            <div className="num accent">{count}</div>
          </div>
          <div className="col">
            <div className="label">完成度</div>
            <div className="num">{progress}%</div>
          </div>
        </div>
        {/* 进度条：按真实进度渲染 */}
        <div className="bar">
          <div className="fill" style={{ width: `${progress}%` }} />
        </div>
      </section>

      {/* 大号霓虹按钮 */}
      <section className="center">
        <button
          onClick={tap}
          disabled={remaining<=0 || tapping}
          className={`cta ${remaining<=0 ? 'done' : ''}`}
        >
          <span className="cta-inner">{remaining>0 ? (tapping ? '…' : '敲一下') : '功德已满'}</span>
        </button>
        {msg && <div className="hint err">{msg}</div>}
        {!msg && remaining>0 && <div className="hint">今天还可以敲 {remaining} 下</div>}
        {!msg && remaining<=0 && <div className="hint">明天再来继续修行</div>}
      </section>

      {/* 排行榜 */}
      <section className="list">
        <div className="list-title">今日排行榜</div>
        {leaders.length>0 ? leaders.map((it, i)=>(
          <div key={i} className="row">
            <div className={`rank ${i===0?'g':i===1?'s':i===2?'b':''}`}>{i+1}</div>
            <div className="fid">FID {it.fid}</div>
            <div className="chip">{it.count} 下</div>
          </div>
        )) : <div className="empty">还没有人敲，做第一个吧！</div>}
      </section>

      {/* 去掉底部三个点（无分页） */}

      <style jsx>{`
        :root{
          --bg:#0b0b10;
          --panel:#111219;
          --ink:#dfe0ff;
          --muted:#8a90a5;
          --grad1:#00e5ff;
          --grad2:#ff3cac;
          --grad3:#ffb234;
          --accent:#9a7bff;
          --glass:rgba(255,255,255,.06);
          --cardGlow: 0 24px 60px rgba(155,120,255,.18);
          --soft: 0 12px 28px rgba(0,0,0,.35);
        }
        .wrap{
          min-height:100dvh; padding: 18px 16px 28px;
          background:
            radial-gradient(600px 300px at 100% -80%, rgba(255,60,172,.22), transparent 60%),
            radial-gradient(500px 260px at -20% 0%, rgba(0,229,255,.18), transparent 55%),
            var(--bg);
          color:var(--ink);
          font-family: ui-sans-serif, system-ui, -apple-system, "SF Pro Display", "Inter", "Poppins", "Segoe UI", Roboto, Arial;
        }
        .hero{ max-width:480px; margin: 4px auto 10px; }
        .headline .h1{
          font-weight:900; line-height:1.06; letter-spacing:.2px;
          font-size:32px;
        }
        @media (min-width:420px){ .headline .h1{ font-size:36px; } }
        .meta{ margin-top:10px; display:flex; align-items:center; gap:8px; color:var(--muted) }
        .pill{ padding:6px 10px; border-radius:999px; background:var(--glass); font-size:12px; }
        .pill.ghost{ background:transparent; border:1px solid rgba(255,255,255,.12) }
        .sep{ opacity:.5 }

        .card{
          position:relative; max-width:480px; margin: 10px auto 16px;
          background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
          border:1px solid rgba(255,255,255,.10);
          border-radius:20px; padding:14px; box-shadow: var(--soft), var(--cardGlow);
          overflow:hidden;
        }
        .card-bg{
          position:absolute; inset: -40% -20% auto auto; height:260px; width:260px; filter: blur(60px); opacity:.45;
          background: conic-gradient(from 180deg, var(--grad2), var(--grad3), var(--grad1), var(--grad2));
          pointer-events:none;
        }
        .stats{ position:relative; display:flex; justify-content:space-between; gap:10px; }
        .label{ font-size:12px; color:var(--muted) }
        .num{ margin-top:2px; font-weight:900; font-size:22px }
        .num.accent{ color:#c9b5ff }
        .bar{ margin-top:14px; height:10px; background:rgba(255,255,255,.08); border-radius:999px; overflow:hidden; }
        .fill{
          height:100%; border-radius:999px;
          background: linear-gradient(90deg, var(--grad1), var(--grad2), var(--grad3));
          transition: width .25s ease;
        }

        .center{ display:flex; flex-direction:column; align-items:center; margin: 12px 0 6px; }
        .cta{
          width:220px; height:64px; border-radius:20px; border:none; cursor:pointer;
          background: radial-gradient(120px 60px at 30% 0%, rgba(255,255,255,.18), transparent 55%),
                      linear-gradient(135deg, var(--grad2), var(--grad1));
          box-shadow: 0 16px 40px rgba(0,229,255,.25), inset 0 -10px 30px rgba(0,0,0,.25);
          transition: transform .08s ease, filter .2s ease, opacity .2s ease;
        }
        .cta:hover{ filter: brightness(1.05) }
        .cta:active{ transform: translateY(1px) scale(.99) }
        .cta.done{ opacity:.7; cursor:default; background:linear-gradient(135deg, #444, #666) }
        .cta-inner{ font-weight:900; font-size:18px; letter-spacing:.3px; color:#0b0b10 }

        .hint{ margin-top:10px; font-size:12px; color:var(--muted) }
        .hint.err{ color:#ff6b6b }

        .list{ max-width:480px; margin: 10px auto 0; }
        .list-title{ font-weight:900; font-size:16px; margin: 8px 2px 10px; color:#e5e7ff }
        .row{
          display:flex; align-items:center; justify-content:space-between;
          padding:10px 12px; background:rgba(255,255,255,.04);
          border:1px solid rgba(255,255,255,.08); border-radius:14px; margin-bottom:8px;
        }
        .rank{
          width:28px;height:28px;border-radius:999px;display:flex;align-items:center;justify-content:center;
          background:rgba(255,255,255,.08); font-weight:800; font-size:12px; color:#fff;
        }
        .rank.g{ background:linear-gradient(135deg,#ffd05a,#ffb200); color:#2a1b00 }
        .rank.s{ background:linear-gradient(135deg,#e8ecf0,#cfd6de); color:#253247 }
        .rank.b{ background:linear-gradient(135deg,#ffb36b,#ff9955); color:#3a1e07 }
        .fid{ flex:1; margin-left:8px; font-weight:700; color:#e6e1ff }
        .chip{ font-size:12px; padding:6px 10px; border-radius:999px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12) }
        .empty{ color:var(--muted); padding:10px 2px }
      `}</style>
    </main>
  )
}
