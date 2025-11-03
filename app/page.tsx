'use client'

import { useEffect, useState } from 'react'

type Leader = { fid: number; count: number }

// —— Farcaster SDK（动态导入 + ready 双保险）——
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
      {/* 标题区（暗黑、低饱和） */}
      <header className="head">
        <div className="title">木鱼 101</div>
        <div className="sub">Select your daily practice</div>
        <div className="meta">
          <span className="pill">{fid ? `FID #${fid}` : 'Dev Mode'}</span>
          <span className="dot">•</span>
          <span className="muted">今日进度 {count}/101</span>
        </div>
      </header>

      {/* 三个柔光圆形信息块（Puzzle/Strategy 的拟物风格） */}
      <section className="grid">
        <div className="bubble">
          <div className="emoji">🔔</div>
          <div className="name">剩余</div>
          <div className="val">{remaining}</div>
        </div>
        <div className="bubble">
          <div className="emoji">🪵</div>
          <div className="name">已敲</div>
          <div className="val accent">{count}</div>
        </div>
        <div className="bubble">
          <div className="emoji">✅</div>
          <div className="name">完成度</div>
          <div className="val">{progress}%</div>
        </div>
      </section>

      {/* 真实进度条（细、柔和阴影） */}
      <div className="bar">
        <div className="fill" style={{ width: `${progress}%` }} />
      </div>

      {/* 底部大号黄色按钮（参照图的 Next 按钮） */}
      <section className="ctaWrap">
        <button
          onClick={tap}
          disabled={remaining<=0 || tapping}
          className={`cta ${remaining<=0 ? 'disabled' : ''}`}
        >
          {remaining>0 ? (tapping ? '……' : '敲一下') : '功德已满'}
        </button>
        {msg && <div className="hint err">{msg}</div>}
        {!msg && remaining>0 && <div className="hint">今天还可以敲 {remaining} 下</div>}
        {!msg && remaining<=0 && <div className="hint">明天再来继续修行</div>}
      </section>

      {/* 排行榜（深色卡片 + 轻投影） */}
      <section className="list">
        <div className="listTitle">今日排行榜</div>
        {leaders.length>0 ? leaders.map((it, i)=>(
          <div key={i} className="row">
            <div className={`rank ${i===0?'g':i===1?'s':i===2?'b':''}`}>{i+1}</div>
            <div className="fid">FID {it.fid}</div>
            <div className="chip">{it.count} 下</div>
          </div>
        )) : <div className="empty">还没有人敲，做第一个吧！</div>}
      </section>

      <style jsx>{`
        :root{
          --bg:#0a0f1b;
          --panel:#0f1524;
          --panel-hi:#141c2f;
          --text:#e8edf6;
          --muted:#9aa3b2;
          --bubble:#121a2b;
          --shadow: 0 10px 28px rgba(0,0,0,.45);
          --inner: inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.35);
          --yellow:#ffd24d; /* 主按钮 */
          --yellow-press:#ffcc33;
          --accent:#b6c7ff;
        }
        .wrap{
          min-height:100dvh; padding: 20px 16px 28px;
          background: radial-gradient(420px 240px at 85% -60%, rgba(255,210,77,.06), transparent 60%) , var(--bg);
          color: var(--text);
          font-family: ui-sans-serif, system-ui, -apple-system, "Inter", "SF Pro Display", "Segoe UI", Roboto, Arial;
          display:flex; flex-direction:column; align-items:center;
        }
        .head{ width:100%; max-width:420px; text-align:left; margin: 6px 0 14px; }
        .title{ font-size:22px; font-weight:800; letter-spacing:.2px }
        .sub{ margin-top:6px; font-size:13px; color:var(--muted) }
        .meta{ margin-top:8px; display:flex; align-items:center; gap:8px; color:var(--muted) }
        .pill{ padding:6px 10px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.06); border-radius:999px; font-size:12px }
        .dot{ opacity:.45 }
        .muted{ color:var(--muted) }

        .grid{
          width:100%; max-width:420px;
          display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-top:6px;
        }
        .bubble{
          background: var(--bubble);
          box-shadow: var(--inner), var(--shadow);
          border-radius:18px; padding:14px 10px; text-align:center;
          border:1px solid rgba(255,255,255,.04);
        }
        .emoji{ width:56px; height:56px; border-radius:50%;
          margin: 2px auto 8px;
          background: linear-gradient(145deg, #16223a, #0e1628);
          box-shadow: inset 0 6px 14px rgba(255,255,255,.04), inset 0 -8px 16px rgba(0,0,0,.35), 0 6px 14px rgba(0,0,0,.35);
          display:flex; align-items:center; justify-content:center; font-size:24px;
        }
        .name{ font-size:12px; color:var(--muted) }
        .val{ font-size:18px; font-weight:800; margin-top:2px }
        .val.accent{ color: var(--accent) }

        .bar{
          width:100%; max-width:420px; height:10px; margin:16px 0 6px;
          background:#0e1628; border-radius:999px; overflow:hidden;
          box-shadow: var(--inner), 0 6px 16px rgba(0,0,0,.4);
          border:1px solid rgba(255,255,255,.04);
        }
        .fill{
          height:100%; background: linear-gradient(90deg, #7aa7ff, #b6c7ff);
          border-radius:999px; transition: width .25s ease;
        }

        .ctaWrap{ width:100%; max-width:420px; margin: 8px 0 12px; display:flex; flex-direction:column; align-items:center }
        .cta{
          width:100%; height:52px; border:none; border-radius:12px; cursor:pointer;
          background: var(--yellow);
          box-shadow: 0 10px 24px rgba(255,210,77,.25), inset 0 -6px 12px rgba(0,0,0,.25);
          font-weight:900; font-size:16px; color:#2a1e00; letter-spacing:.3px;
          transition: transform .06s ease, filter .15s ease, background .15s ease;
        }
        .cta:hover{ filter: brightness(1.03) }
        .cta:active{ transform: translateY(1px); background: var(--yellow-press) }
        .cta.disabled{ opacity:.7; cursor:default; background:#4b4b4b; color:#ddd; box-shadow:none }

        .hint{ margin-top:10px; font-size:12px; color:var(--muted) }
        .hint.err{ color:#ff8080 }

        .list{ width:100%; max-width:420px; margin-top:8px }
        .listTitle{ font-weight:800; font-size:14px; color:#dfe6f5; margin: 6px 2px 10px; }
        .row{
          display:flex; align-items:center; justify-content:space-between;
          padding:10px 12px; background: var(--panel); border:1px solid rgba(255,255,255,.05);
          border-radius:14px; margin-bottom:10px; box-shadow: var(--shadow);
        }
        .rank{
          width:28px; height:28px; border-radius:999px; display:flex; align-items:center; justify-content:center;
          background:#141c2f; color:#fff; font-weight:800; font-size:12px; box-shadow: var(--inner);
        }
        .rank.g{ background:linear-gradient(135deg,#ffd05a,#ffb200); color:#2a1b00 }
        .rank.s{ background:linear-gradient(135deg,#e8ecf0,#cfd6de); color:#253247 }
        .rank.b{ background:linear-gradient(135deg,#ffb36b,#ff9955); color:#3a1e07 }
        .fid{ flex:1; margin-left:8px; font-weight:700; color:#e6edf8 }
        .chip{ font-size:12px; padding:6px 10px; border-radius:999px; background: #141c2f; border:1px solid rgba(255,255,255,.06) }
        .empty{ color:var(--muted); padding:10px 2px }
      `}</style>
    </main>
  )
}
