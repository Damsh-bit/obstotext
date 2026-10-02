import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "ObsToText · Reunión a formulario",
  description: "Transcribe la grabación de OBS de una reunión comercial y responde el formulario de calificación.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <nav className="topbar">
          <span className="brand">
            <span className="brand-mark" aria-hidden="true">
              ●
            </span>
            ObsToText
          </span>
        </nav>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
