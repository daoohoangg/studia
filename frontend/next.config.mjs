/** @type {import('next').NextConfig} */
function toOrigin(raw) {
  try {
    return raw ? new URL(raw).origin : "";
  } catch {
    return "";
  }
}

const apiOrigin = toOrigin(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1");
const audioOrigin = toOrigin(process.env.NEXT_PUBLIC_AUDIO_BASE_URL || "");
const supabaseOrigin = toOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
const isDev = process.env.NODE_ENV !== "production";

const connectSources = [
  "'self'",
  apiOrigin,
  supabaseOrigin,
  isDev ? "http://localhost:8000 http://127.0.0.1:8000 ws://localhost:3000 ws://127.0.0.1:3000" : "",
  "https://*.supabase.co",
  "wss://*.supabase.co",
  "https://accounts.google.com",
  "https://www.googleapis.com",
].filter(Boolean).join(" ");

const mediaSources = [
  "'self'",
  "blob:",
  "data:",
  apiOrigin,
  audioOrigin,
  supabaseOrigin,
  "https://*.supabase.co",
].filter(Boolean).join(" ");

const imgSources = [
  "'self'",
  "data:",
  "blob:",
  apiOrigin,
  supabaseOrigin,
  "https://*.supabase.co",
  "https://img.vietqr.io",
  "https://lh3.googleusercontent.com",
  "https://i.ytimg.com",
].filter(Boolean).join(" ");

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://accounts.google.com https://apis.google.com https://www.youtube.com https://s.ytimg.com`.replace(/\s+/g, " ").trim(),
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  `img-src ${imgSources}`,
  `media-src ${mediaSources}`,
  `connect-src ${connectSources}`,
  "frame-src 'self' https://accounts.google.com https://www.youtube.com https://www.youtube-nocookie.com",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Micro cho luyện nói, camera để chụp khoảnh khắc học trong Lịch học; định vị không dùng
  { key: "Permissions-Policy", value: "microphone=(self), camera=(self), geolocation=()" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: { optimizePackageImports: ["lucide-react"] },
  images: { formats: ["image/avif", "image/webp"], minimumCacheTTL: 31536000 },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
