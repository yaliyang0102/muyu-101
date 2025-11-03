import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@farcaster/quick-auth'
import postgres from 'postgres'

export const runtime = 'nodejs'

const qa = createClient()
const sql = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, { ssl: 'require' })
  : null

// 开发模式下的内存存储
const mem = (global as any)._muyuMem ?? new Map<string, { count: number, ts: number }>()
;(global as any)._muyuMem = mem

export async function POST(req: NextRequest) {
  const fid = await getFidOrDev(req)
  const today = new Date().toISOString().slice(0,10) // YYYY-MM-DD (UTC)

  // --- 无 DB：内存 + 限速 80ms ---
  if (!sql) {
    const key = `${fid}:${today}`
    const now = Date.now()
    const rec = mem.get(key) ?? { count: 0, ts: 0 }
    if (rec.count < 101 && now - rec.ts > 80) {
      rec.count += 1
      rec.ts = now
      mem.set(key, rec)
    }
    const top = Array.from(mem.entries())
      .filter(([k]) => k.endsWith(`:${today}`))
      .map(([k, v]) => ({ fid: Number(k.split(':')[0]), count: v.count }))
      .sort((a,b) => b.count - a.count)
      .slice(0,10)

    return NextResponse.json({ myCount: rec.count, top10: top })
  }

  // --- 有 DB：Upsert + 限速（80ms） + 上限（101） ---
  // 1) 确保有行
  await sql`insert into taps_daily (fid, day, count)
            values (${fid}, ${today}::date, 0)
            on conflict (fid, day) do nothing`

  // 2) 仅当未超上限且超过限速窗口才 +1
  await sql`update taps_daily
            set count = count + 1,
                updated_at = now()
            where fid=${fid} and day=${today}::date
              and count < 101
              and (now() - updated_at) > interval '80 milliseconds'`

  // 3) 查询我的最新 count 与今日 top10
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

  return NextResponse.json({ myCount: my, top10: top })
}

async function getFidOrDev(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.split(' ')[1]
  if (token) {
    const payload = await qa.verifyJwt({
      token,
      domain: process.env.QUICKAUTH_DOMAIN || ''
    })
    return Number(payload.sub)
  }
  if (process.env.NODE_ENV !== 'production') return 999999
  throw new Response('Unauthorized', { status: 401 })
}
