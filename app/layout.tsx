// app/layout.tsx
import type { Metadata } from "next";
import "@/styles/globals.css";
import "@/styles/layout.css";
import Link from "next/link";
import NavAutoClose from "@/components/NavAutoClose"; // ここもエイリアスに統一推奨
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "GenbaNote",
  description: "建設業向け業務管理アプリ。",
  icons: {
    icon: "/favicon.ico",            // 通常のブラウザ用
    shortcut: "/favicon.ico",        // ショートカット
    apple: "/apple-touch-icon.png",  // iPhone/iPad ホーム追加用
  },
  manifest: "/manifest.webmanifest",
  // （任意）テーマカラーを設定しておくとモバイルのUI色が馴染む
  // themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <header className="site-header">
          <div className="container header-bar">
            <div className="logo">
              <Link href="/">GenbaNote</Link>
            </div>

            <input id="nav-toggle" type="checkbox" className="nav-checkbox" />
            <label htmlFor="nav-toggle" aria-controls="site-nav" className="nav-toggle menu-btn">
              メニュー
            </label>

            <nav className="main-nav" id="site-nav">
              <ul>
                <li><Link href="/">ホーム</Link></li>
                <li><Link href="/calendar">カレンダー</Link></li>
                <li><Link href="/schedules">予定一覧</Link></li>
                <li><Link href="/clients">取引先</Link></li>
                <li><Link href="/workers">外注先</Link></li>
              </ul>
            </nav>
          </div>
        </header>

        <NavAutoClose />

        <main className="container main-area">{children}</main>

        <footer className="site-footer">
          <div className="container footer-inner">
            <small>© {new Date().getFullYear()} GenbaNote</small>
          </div>
        </footer>
      </body>
    </html>
  );
}
