export default {
  async redirects() {
    return [
      {
        source: '/.well-known/farcaster.json',
        destination: 'https://api.farcaster.xyz/miniapps/hosted-manifest/499406',
        permanent: false, // 临时 307
      },
    ]
  },
}
