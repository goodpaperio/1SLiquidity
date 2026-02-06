import type { NextConfig } from 'next'

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
    return [
      {
        source: '/api/:path*',
        // destination: 'http://localhost:3000/api/:path*',
        destination:
          'http://ec2-13-62-20-115.eu-north-1.compute.amazonaws.com:3000/api/:path*',
      },
    ]
  },
}

export default nextConfig
