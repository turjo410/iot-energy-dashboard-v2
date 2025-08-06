/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/iot-energy-dashboard-v2',  // Your repo name
  assetPrefix: '/iot-energy-dashboard-v2/',
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig
