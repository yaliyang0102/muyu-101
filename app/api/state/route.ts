// app/api/tap/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@farcaster/quick-auth'
import postgres from 'postgres'

export const runtime = 'nodejs'

// ---------- Quick Auth ----------
const qa = createClient()

// ---------- Postgres (生产环境可用；本地没配 DATABASE_URL 会退回内存存储) ----------
const sql = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, { ssl: 'require' })
  : null

// ---------- 开发模式：内存存储（无 DATABASE_URL 时启用） ----------
type MemVal = { count: number; ts: number }
const g = globalThis as any
const mem: Map<string, MemVal> = g._muyuMem ?? new Map<string, MemVal>()
g._muyuMem = mem

export async function POST(req: NextRequest) {
  const fid = await getFidOrDev(req)
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD (UTC)

  // ===== 无数据库：使用内存 Map（仅用于本地/演示，不持久） =====
  if (!sql) {
    const key = `${fid}:${today}`
    const now = Date.now()
    const rec: MemVal = mem.get(key) ?? { count: 0, ts: 0 }

    // 简单限速：两次点击间隔至少 80ms；并且每日最多 101 次
    if (rec.count < 101 && now - rec.ts > 80) {
      rec.count += 1
      rec.ts = now
      mem.set(key, rec)
    }

    const entries: [string, MemVal][] = Array.from(mem.entries())
    const top = entries
      .filter(([k]) => k.endsWith(`:${today}`))
      .map(([k, v]) => ({ fid: Number(k.split(':')[0]), count: v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return NextResponse.json({ myCount: rec.count, top10: top })
  }

  // ===== 有数据库：Postgres 持久化 =====

  // 1) 确保当日行存在
  await sql`
    insert into taps_daily (fid, day, count)
    values (${fid}, ${today}::date, 0)
    on conflict (fid, day) do nothing
  `

  // 2) 条件自增：未达上限且与上次更新时间相隔 > 80ms
  await sql`
    update taps_daily
       set count = count + 1,
           updated_at = now()
     where fid = ${fid}
       and day = ${today}::date
       and count < 101
       and (now() - updated_at) > interval '80 milliseconds'
  `

  // 3) 查询我的最新计数
  const myRow = await sql<{ count: number }[]>`
    select count from taps_daily
     where fid = ${fid} and day = ${today}::date
  `
  const my = myRow[0]?.count ?? 0

  // 4) 今日 Top 10
  const top = await sql<{ fid: number; count: number }[]>`
    select fid, count
      from taps_daily
     where day = ${today}::date
     order by count desc
     limit 10
  `

  return NextResponse.json({ myCount: my, top10: top })
}

// ---------- 辅助：取 fid（生产必须校验；本地无 token 走演示 fid） ----------
async function getFidOrDev(req: NextRequest): Promise<number> {
  const auth = req.headers.get('authorization') || ''
  const token = auth.split(' ')[1]
  if (token) {
    const payload = await qa.verifyJwt({
      token,
      domain: process.env.QUICKAUTH_DOMAIN || '', // 例如 your-app.vercel.app（不含协议）
    })
    return Number(payload.sub)
  }
  // 本地开发/预览：无 token 时给一个演示 fid
  if (process.env.NODE_ENV !== 'production') return 999999
  throw new Response('Unauthorized', { status: 401 })
}
