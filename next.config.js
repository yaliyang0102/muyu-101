/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // ✅ 允许被任何父页面内嵌（先跑通；确认 OK 再收紧到 warpcast 域名）
          { key: 'Content-Security-Policy', value: "frame-ancestors *" },
          // ❌ 切勿设置 X-Frame-Options: DENY/SAMEORIGIN（会直接阻断）
        ],
      },
    ]
  },
}

export default nextConfig
