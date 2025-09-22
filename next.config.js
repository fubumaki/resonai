const isProd = process.env.NODE_ENV === "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Expose selected Vercel build metadata to the client
  env: {
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || "local-dev",
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV || "development",
  },
  
  // Webpack config for ONNX Runtime Web and SharedArrayBuffer support
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        path: false,
        crypto: false,
      };
    }
    
    // Exclude ONNX Runtime Web from build since it's dynamically imported
    config.externals = config.externals || [];
    config.externals.push({
      'onnxruntime-web': 'commonjs onnxruntime-web',
    });
    
    // Handle ONNX Runtime Web module files
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules\/onnxruntime-web/,
      type: 'javascript/auto',
    });
    
    // Ensure SharedArrayBuffer support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    
    return config;
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      // Allow 'unsafe-eval' and 'unsafe-inline' in development for Next.js HMR, React DevTools, and test stubs
      isProd ? "script-src 'self'" : "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self'",                 // strict: no 'unsafe-inline'
      "connect-src 'self' https://*.vercel.app https://*.vercel-insights.com",
      "worker-src 'self' blob:",
    ].join("; ");

    const security = [
      { key: "Content-Security-Policy", value: csp },
      // Enable cross-origin isolation for SAB/Worklets reliability
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), geolocation=(), gyroscope=(), microphone=(), " +
          "payment=(), usb=()"
      },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
      ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }] : []),
    ];

    return [
      { source: "/(.*)", headers: security },
    ];
  },
};

module.exports = nextConfig;
