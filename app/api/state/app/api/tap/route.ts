// app/api/tap/route.ts
export const runtime = 'edge'

type C = { count: number }
const g = globalThis as any
const mem: Map<string, C> = g.__MUYU__ ?? (g.__MUYU__ = new Map())

function today() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

// （可选）从 QuickAuth JWT 里解析 fid；现在不强制，用作辅助
function decodeFIDFromAuth(auth?: string) {
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  const b = token.split('.')[1]
  if (!b) return null
  try {
    const json = JSON.parse(atob(b.replace(/-/g, '+').replace(/_/g, '/')))
    const fid = Number(json?.fid)
    return Number.isFinite(fid) ? fid : null
  } catch { return null }
}

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const body = await req.json().catch(() => ({}))

  // 规则：优先用 token 里的 fid；没有就用 body.fid（演示期放行）
  const fid = decodeFIDFromAuth(auth) ?? (Number(body?.fid) || null)

  if (fid == null) {
    return new Response(JSON.stringify({ ok: false, reason: 'missing_fid' }), {
      status: 200, headers: { 'content-type': 'application/json' }
    })
  }

  const key = `${fid}:${today()}`
  const prev = mem.get(key)?.count ?? 0
  const next = Math.min(101, prev + 1)
  mem.set(key, { count: next })

  const top = Array.from(mem.entries())
    .filter(([k]) => k.endsWith(`:${today()}`))
    .map(([k, v]) => ({ fid: Number(k.split(':')[0]), count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return new Response(JSON.stringify({ ok: true, myCount: next, top10: top }), {
    headers: { 'content-type': 'application/json' }
  })
}
