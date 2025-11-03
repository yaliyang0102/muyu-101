'use client'

import { useEffect, useState } from 'react'

// ========== 逻辑：与之前一致（动态导入 SDK + ready() 双保险） ==========
type Leader = { fid: number; count: number }

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
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [loading, setLoading] = useState(true)
  const [tapping, setTapping] = useState(false)
  const [msg, setMsg] = useState<string>('')

  const remaining = Math.max(0, 101 - count)
  const progress = Math.min(100, Math.round((count / 101) * 100))

  useEffect(() => {
    let finished = false
    ;(async () => {
      try {
        const sdk = await getSdk()
        sdk.actions.ready().catch(() => {})
        sdk.back.enableWebNavigation().catch(() => {})

        try {
          const ctx = await sdk.context
          setFid(ctx?.user?.fid ?? null)
        } catch { setFid(null) }

        try {
          let auth = ''
          try { auth = `Bearer ${await sdk.quickAuth.getToken()}` } catch {}
          const res = await fetch('/api/state', { headers: auth ? { Authorization: auth } : {} })
          if (res.ok) {
            const data = await res.json()
            const my = data.myCount ?? 0
            setCount(my)
            setLeaders(data.top10 ?? [])
          } else {
            setCount(0); setLeaders([])
          }
        } catch {
          setCount(0); setLeaders([])
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

      // 确保 fid
      let useFid = fid
      if (useFid == null) {
        try { const ctx = await sdk.context; useFid = ctx?.user?.fid ?? null } catch {}
      }
      if (useFid == null) {
        setMsg('未获取到 FID，请在 Warpcast 内打开重试')
        return
      }

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
      setCount(my)
      setLeaders(data.top10 ?? [])
      setMsg('')
      setTapping(false)
    } finally {
      setTapping(false)
    }
  }

  if (loading) return null

  // ========== UI：紫色渐变 + 卡片 + 进度环 ==========
  return (
    <main className="wrap">
      {/* 顶部渐变 Header */}
      <header className="hero">
        <div className="hero-row">
          <div className="brand">
            <span className="logo">🪵</span>
            <span className="title">木鱼101</span>
          </div>
          <div className="user">
            {fid ? <span className="pill">FID #{fid}</span> : <span className="pill gray">开发模式</span>}
          </div>
        </div>
        <div className="sub">每日目标 101 下 · 今日进度 {count}/101</div>
      </header>

      {/* 状态卡片 */}
      <section className="card">
        <div className="card-row">
          <div>
            <div className="label">今日剩余</div>
            <div className="stat">{remaining}</div>
          </div>
          <div className="divider" />
          <div>
            <div className="label">已累计</div>
            <div className="stat accent">{count}</div>
          </div>
          <div className="divider" />
          <div>
            <div className="label">完成度</div>
            <div className="stat">{progress}%</div>
          </div>
        </div>

        {/* 进度条 */}
        <div className="bar">
          <div className="bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </section>

      {/* 大圆“敲一下”按钮 + 进度环 */}
      <section className="center">
        <button
          onClick={tap}
          disabled={remaining<=0 || tapping}
          className={`gongde ${remaining<=0 ? 'done' : ''}`}
          aria-label="敲一下"
        >
          <div className="ring" style={{
            background: `conic-gradient(var(--ring) ${Math.max(6, progress)}%, rgba(255,255,255,0.12) ${Math.max(6, progress)}%)`
          }} />
          <div className="btn-inner">
            <div className="btn-title">{remaining>0 ? (tapping ? '…' : '敲一下') : '功德已满'}</div>
            <div className="btn-sub">{count}/101</div>
          </div>
        </button>
        {msg && <div className="hint error">{msg}</div>}
        {!msg && remaining>0 && <div className="hint">今天还可以敲 {remaining} 下</div>}
        {!msg && remaining<=0 && <div className="hint">明天再来继续修行</div>}
      </section>

      {/* 排行榜 */}
      <section className="list">
        <div className="list-title">今日排行榜</div>
        {leaders.length>0 ? leaders.map((it, i) => (
          <div key={i} className="row">
            <div className={`rank r${i<3 ? i+1 : 0}`}>{i+1}</div>
            <div className="fid">FID {it.fid}</div>
            <div className="chip">{it.count} 下</div>
          </div>
        )) : <div className="empty">还没有人敲，做第一个吧！</div>}
      </section>

      {/* 底部导航影子（装饰） */}
      <nav className="tab">
        <div className="dot active" />
        <div className="dot" />
        <div className="dot" />
      </nav>

      <style jsx>{`
        :root{
          --bg:#f6f2ff;
          --grad-from:#7b5cff;
          --grad-to:#b488ff;
          --card:#ffffff;
          --text:#1f1247;
          --sub:#7e6aa8;
          --muted:#a39ac4;
          --accent:#7c4dff;
          --ring:#8e6bff;
          --shadow:0 16px 40px rgba(123,92,255,.18);
          --soft:0 8px 24px rgba(31,18,71,.08);
        }
        .wrap{
          min-height:100dvh;
          display:flex; flex-direction:column; align-items:center;
          background:linear-gradient(180deg, #fbf9ff 0%, var(--bg) 100%);
          color:var(--text);
          padding: 12px 14px 24px;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;
        }
        .hero{
          width:100%;
          max-width:420px;
          background:linear-gradient(135deg, var(--grad-from), var(--grad-to));
          color:#fff; border-radius:18px;
          padding:16px; margin-top:6px; box-shadow: var(--shadow);
          position:relative; overflow:hidden;
        }
        .hero::after{
          content:""; position:absolute; inset:0;
          background:radial-gradient(120px 120px at 85% -10%, rgba(255,255,255,.25), transparent 70%);
          pointer-events:none;
        }
        .hero-row{ display:flex; align-items:center; justify-content:space-between; }
        .brand{ display:flex; align-items:center; gap:8px; }
        .logo{ font-size:20px; }
        .title{ font-weight:800; letter-spacing:.3px; }
        .user .pill{
          padding:6px 10px; font-size:12px; border-radius:999px; background:rgba(255,255,255,.22); backdrop-filter: blur(6px);
          border:1px solid rgba(255,255,255,.35);
        }
        .user .pill.gray{ background:rgba(255,255,255,.18); color:#f4f1ff }
        .sub{ margin-top:8px; font-size:12px; opacity:.95 }

        .card{
          width:100%; max-width:420px; background:var(--card); margin-top:14px;
          border-radius:18px; box-shadow: var(--soft); padding:14px;
        }
        .card-row{ display:flex; align-items:center; justify-content:space-between; gap:10px; }
        .divider{ width:1px; height:36px; background:#eee; }
        .label{ font-size:12px; color:var(--muted); }
        .stat{ font-weight:800; font-size:18px; margin-top:2px; }
        .stat.accent{ color: var(--accent); }
        .bar{ height:8px; background:#f1ecff; border-radius:999px; margin-top:12px; overflow:hidden; }
        .bar-fill{ height:100%; background: linear-gradient(90deg, var(--grad-from), var(--grad-to)); border-radius:999px; }

        .center{ display:flex; flex-direction:column; align-items:center; margin:18px 0 6px; }
        .gongde{
          position:relative; width:200px; height:200px; border-radius:999px;
          background: radial-gradient(120px 120px at 50% 35%, #fff, #f3ecff);
          border:none; cursor:pointer; box-shadow: var(--soft), inset 0 -10px 30px rgba(124,77,255,.08);
          transition: transform .08s ease;
        }
        .gongde:not(.done):active{ transform: scale(.98); }
        .gongde.done{ cursor:default; opacity:.9 }
        .ring{
          position:absolute; inset:-8px; border-radius:999px;
          filter: drop-shadow(0 8px 18px rgba(124,77,255,.25));
        }
        .btn-inner{
          position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;
          gap:6px;
        }
        .btn-title{ font-weight:900; font-size:20px; color:#3b2a73; letter-spacing:.2px; }
        .btn-sub{ font-size:13px; color: var(--sub) }

        .hint{ margin-top:10px; font-size:12px; color:var(--sub) }
        .hint.error{ color:#c0392b }

        .list{ width:100%; max-width:420px; margin-top:10px; }
        .list-title{ font-weight:800; font-size:16px; margin:8px 2px; color:#4a3b80 }
        .row{
          display:flex; align-items:center; justify-content:space-between;
          background:#fff; border-radius:14px; padding:10px 12px; margin-bottom:8px; box-shadow: var(--soft);
        }
        .rank{
          width:28px; height:28px; border-radius:999px; display:flex; align-items:center; justify-content:center;
          background:#f1ecff; color:#6b53d6; font-weight:800; font-size:12px;
        }
        .rank.r1{ background:linear-gradient(135deg,#ffe082,#ffd54f); color:#5a4100 }
        .rank.r2{ background:linear-gradient(135deg,#e0e0e0,#fafafa); color:#444 }
        .rank.r3{ background:linear-gradient(135deg,#ffcc80,#ffb74d); color:#6a3f05 }
        .fid{ color:#4f3e90; font-weight:700; font-size:14px; margin-left:6px; flex:1; }
        .chip{
          font-size:12px; padding:6px 10px; background:#f5f1ff; color:#6a52d8; border-radius:999px; font-weight:700;
          border:1px solid #ece6ff;
        }

        .tab{ display:flex; gap:8px; margin:14px 0 4px; }
        .dot{ width:8px; height:8px; border-radius:999px; background:#d9cffc }
        .dot.active{ background:#7b5cff }
      `}</style>
    </main>
  )
}
