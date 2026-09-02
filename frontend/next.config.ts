import type { NextConfig } from 'next'

/** Express keeper API (Prisma `/api/tokens/*`) — NOT the Lambda reserves/price functions. */
const keeperApiBase =
  process.env.KEEPER_API_URL ||
  process.env.NEXT_PUBLIC_KEEPER_API_URL ||
  'http://ec2-13-62-20-115.eu-north-1.compute.amazonaws.com:3000'

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false }
    config.externals.push('pino-pretty', 'encoding')
    return config
  },
  images: {
    remotePatterns: [
      {
        hostname: 'logo.moralis.io',
      },
      {
        hostname: 'coin-images.coingecko.com',
      },
      {
        hostname: 'assets.coingecko.com',
      },
    ],
  },
  async rewrites() {
    if (!keeperApiBase) return []
    const base = keeperApiBase.replace(/\/$/, '')
    return [
      {
        source: '/api/:path*',
        destination: `${base}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
