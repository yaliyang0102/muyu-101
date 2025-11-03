export const runtime = 'edge'

type C = { count: number }
const g = globalThis as any
const mem: Map<string, C> = g.__MUYU__ ?? (g.__MUYU__ = new Map())

function today() {
  const d = new Date(); const y=d.getFullYear()
  const m=String(d.getMonth()+1).padStart(2,'0')
  const dd=String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${dd}`
}

function decodeFIDFromAuth(auth?: string) {
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  const b = token.split('.')[1]; if (!b) return null
  try {
    const json = JSON.parse(atob(b.replace(/-/g,'+').replace(/_/g,'/')))
    const env = (process.env.QUICKAUTH_DOMAIN||'').toLowerCase()
    if (json?.domain && env && String(json.domain).toLowerCase() !== env) return null
    const fid = Number(json?.fid)
    return Number.isFinite(fid) ? fid : null
  } catch { return null }
}

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const body = await req.json().catch(()=> ({}))
  const fid = decodeFIDFromAuth(auth) ?? (Number(body?.fid) || null) // ⬅️ 无 token 用 body.fid 兜底（仅演示用）

  if (fid == null) {
    return new Response(JSON.stringify({ error:'unauthorized' }), { status: 401 })
  }

  const k = `${fid}:${today()}`
  const cur = mem.get(k)?.count ?? 0
  const next = Math.min(101, cur + 1)
  mem.set(k, { count: next })

  const top = Array.from(mem.entries())
    .filter(([kk]) => kk.endsWith(`:${today()}`))
    .map(([kk,v]) => ({ fid:Number(kk.split(':')[0]), count:v.count }))
    .sort((a,b)=>b.count-a.count)
    .slice(0,10)

  return new Response(JSON.stringify({ ok:true, myCount: next, top10: top }), {
    headers: { 'content-type':'application/json' }
  })
}
