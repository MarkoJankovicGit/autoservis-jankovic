import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/pwa";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const montserrat = Montserrat({
  subsets: ["latin", "latin-ext"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Automehaničar Janković", template: "%s · Janković" },
  description: "Evidencija vozila, naloga i finansija",
  applicationName: "Automehaničar Janković",
  appleWebApp: { capable: true, title: "Janković", statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#3e3e3f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sr-Latn" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="min-h-dvh">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
