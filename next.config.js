/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // 用于 Docker 部署
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // 确保 standalone 输出包含所有必要的文件
  experimental: {
    // 如果需要，可以添加实验性配置
  },
}

module.exports = nextConfig

