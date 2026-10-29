import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Automehaničar Janković",
    short_name: "Janković",
    description: "Evidencija vozila, naloga i finansija",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#3e3e3f",
    theme_color: "#3e3e3f",
    lang: "sr-Latn",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Novi prijem", url: "/nalozi/novi", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Kalendar", url: "/kalendar", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Finansije", url: "/finansije", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
