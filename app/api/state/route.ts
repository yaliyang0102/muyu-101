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
    // 校验 domain（可选）
    const env = (process.env.QUICKAUTH_DOMAIN||'').toLowerCase()
    if (json?.domain && env && String(json.domain).toLowerCase() !== env) return null
    const fid = Number(json?.fid)
    return Number.isFinite(fid) ? fid : null
  } catch { return null }
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const fid = decodeFIDFromAuth(auth) // 浏览器直开可能为 null
  const day = today()

  let my = 0
  if (fid != null) {
    const k = `${fid}:${day}`
    my = mem.get(k)?.count ?? 0
  }

  const top = Array.from(mem.entries())
    .filter(([k]) => k.endsWith(`:${day}`))
    .map(([k,v]) => ({ fid:Number(k.split(':')[0]), count:v.count }))
    .sort((a,b)=>b.count-a.count)
    .slice(0,10)

  return new Response(JSON.stringify({ myCount: my, remaining: 101 - my, top10: top }), {
    headers: { 'content-type':'application/json' }
  })
}
