import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const archivo = localFont({
  src: [
    { path: "./fonts/archivo-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/archivo-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "DMC · Sistema de cotizaciones", template: "%s · DMC" },
  description: "Sistema de gestión comercial de Comercializadora DMC S.P.A.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#f3f2f2" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={archivo.variable}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
