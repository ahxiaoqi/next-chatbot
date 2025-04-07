

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack:(config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // 添加自定义规则
    config.module.rules.push({
      test: /\.html$/,
      use: 'html-loader', // 添加 html-loader 来处理 HTML 文件
    });

    // 返回修改后的配置
    return config;
  },
  serverExternalPackages: ['sequelize'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
}


export default nextConfig;
