import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@farcaster/quick-auth'

// --- 可选：Postgres（生产用） ---
import postgres from 'postgres'
const sql = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, { ssl: 'require' })
  : null

// 开发模式下的内存存储（无 DATABASE_URL 时启用）
const mem = (global as any)._muyuMem ?? new Map<string, { count: number, ts: number }>()
;(global as any)._muyuMem = mem

export const runtime = 'nodejs' // 用 Node runtime（便于使用 pg）

const qa = createClient()

export async function GET(req: NextRequest) {
  const fid = await getFidOrDev(req)

  const today = new Date().toISOString().slice(0,10) // YYYY-MM-DD (UTC)

  if (!sql) {
    // --- 开发模式（无 DB） ---
    const key = `${fid}:${today}`
    const my = mem.get(key)?.count ?? 0
    const top = Array.from(mem.entries())
      .filter(([k]) => k.endsWith(`:${today}`))
      .map(([k, v]) => ({ fid: Number(k.split(':')[0]), count: v.count }))
      .sort((a,b) => b.count - a.count)
      .slice(0,10)
    return NextResponse.json({ myCount: my, remaining: 101 - my, top10: top })
  }

  // --- 生产：Postgres ---
  const myRow = await sql<{ count: number }[]>`
    select count from taps_daily where fid=${fid} and day=${today}::date
  `
  const my = myRow[0]?.count ?? 0

  const top = await sql<{ fid: number, count: number }[]>`
    select fid, count from taps_daily
    where day=${today}::date
    order by count desc
    limit 10
  `
  return NextResponse.json({ myCount: my, remaining: 101 - my, top10: top })
}

async function getFidOrDev(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.split(' ')[1]
  if (token) {
    const payload = await qa.verifyJwt({
      token,
      domain: process.env.QUICKAUTH_DOMAIN || '' // 例如 your-app.vercel.app
    })
    return Number(payload.sub)
  }
  // 本地/开发模式：没有 token 也能访问
  if (process.env.NODE_ENV !== 'production') return 999999
  throw new Response('Unauthorized', { status: 401 })
}
