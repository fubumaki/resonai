const isProd = process.env.NODE_ENV === "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "script-src 'self'",
      "style-src 'self'",                 // strict: no 'unsafe-inline'
      "connect-src 'self' https://*.vercel.app https://*.vercel-insights.com",
      "worker-src 'self' blob:",
    ].join("; ");

    const security = [
      { key: "Content-Security-Policy", value: csp },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy",
        value: "camera=(), geolocation=(), gyroscope=(), microphone=(), " +
               "payment=(), usb=()" },
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
