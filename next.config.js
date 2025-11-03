/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // 显式允许被 Warpcast/Farcaster 内嵌（iframe/webview）
          { key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://warpcast.com https://*.warpcast.com https://*.farcaster.xyz" },
          // 不要设置 X-Frame-Options=DENY/SAMEORIGIN；保持不设置或移除冲突值
        ],
      },
    ]
  },
}
export default nextConfig
