/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... your existing config
  
  // Add COOP/COEP headers for cross-origin isolation
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
  
  // Ensure experimental features are enabled for SharedArrayBuffer
  experimental: {
    // ... your existing experimental features
  },
  
  // Webpack config for SharedArrayBuffer support
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Add SharedArrayBuffer support
    config.module.rules.push({
      test: /\.(js|mjs|jsx|ts|tsx)$/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['next/babel'],
          plugins: [
            // Add any plugins needed for SharedArrayBuffer
          ],
        },
      },
    });
    
    return config;
  },
};

module.exports = nextConfig;

