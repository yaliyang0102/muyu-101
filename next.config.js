/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // 先放开内嵌，确认能跑通；之后再收紧白名单
          { key: 'Content-Security-Policy', value: "frame-ancestors *" },
          // 切勿设置 X-Frame-Options: DENY/SAMEORIGIN
        ],
      },
    ]
  },
}
export default nextConfig
