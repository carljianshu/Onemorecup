import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Providers } from "@/components/Providers";
import { readServerLocale } from "@/lib/locale-cookies";
import "./globals.css";

export const metadata: Metadata = {
  title: "2026世界杯淘汰赛竞猜",
  description: "世界杯淘汰赛竞猜小游戏"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialLocale = readServerLocale(await cookies());

  return (
    <html lang={initialLocale === "zh" ? "zh-CN" : "en"}>
      <body>
        <Providers initialLocale={initialLocale}>{children}</Providers>
      </body>
    </html>
  );
}
