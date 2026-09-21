import type { NextConfig } from 'next'

const config: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: '2mb' } },
  // Hide the dev-only on-screen route indicator. Compile and runtime errors
  // are still surfaced.
  devIndicators: false,
}

export default config
