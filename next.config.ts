import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // kamera za fotografije vozila iz same aplikacije; ostalo isključeno
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // PGlite (lokalna baza za razvoj) učitava svoj WASM sa diska; ne pakuje se u server
  serverExternalPackages: ["@electric-sql/pglite"],
  // PDF kartona čita font i logo sa diska; na Vercelu moraju ući u paket funkcije
  outputFileTracingIncludes: {
    "/api/podeli/[id]/pdf": ["./assets/fonts/*.ttf", "./public/icons/icon-192.png"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // service worker: uvek nova verzija, da izmene stignu odmah
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
      // deljive strane za mušterije i dobavljače: bez indeksiranja i bez keša u posrednicima
      {
        source: "/:prefix(k|n)/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "private, no-store" },
          // token je u putanji: ne šalje se dalje ni kroz Referer
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
