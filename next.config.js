/** @type {import('next').NextConfig} */
const nextConfig = {
  // 保持默认即可；不要主动设置 X-Frame-Options
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // 允许在 Warpcast/Farcaster 内嵌（iframe/webview）
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://warpcast.com https://*.warpcast.com https://*.farcaster.xyz",
          },
          // 刻意不设置 X-Frame-Options，避免 DENY/SAMEORIGIN 阻止内嵌
        ],
      },
    ]
  },

  // 你也可以继续保留/添加其它 Next 配置
}

export default nextConfig
