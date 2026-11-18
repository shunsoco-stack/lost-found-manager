import type { Metadata } from "next";
import { StoreProvider } from "@/components/store-provider";
import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "忘れ物・落とし物管理",
  description:
    "拾得物の登録から特徴の照合、本人確認と返却、警察への引き渡しまでを支える受付管理デモ。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <a href="#main-content" className="skip-link">
          本文へ移動
        </a>
        <StoreProvider>
          <Shell>{children}</Shell>
        </StoreProvider>
      </body>
    </html>
  );
}
