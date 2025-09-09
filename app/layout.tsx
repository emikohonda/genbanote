import "../styles/globals.css";
import '../styles/layout.css';
import Link from "next/link";
import { ReactNode } from "react";
import NavAutoClose from "../components/NavAutoClose";

export const metadata = {
  title: 'GenbaNote',
  description: '現場データを集計して請求書を作成するWebアプリです。',
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

            {/* ← 先にチェックボックスとラベル */}
            <input id="nav-toggle" type="checkbox" className="nav-checkbox" />
            <label htmlFor="nav-toggle" aria-controls="site-nav" className="nav-toggle menu-btn">
              メニュー
            </label>

            {/* ← nav はこの後ろ（兄弟セレクタが効くように） */}
            <nav className="main-nav" id="site-nav">
              <ul>
                <li><Link href="/">ホーム</Link></li>
                <li><Link href="/calendar">カレンダー</Link></li>
                <li><Link href="/schedules">予定一覧</Link></li>
                <li><Link href="/clients">取引先</Link></li>
                <li><Link href="/workers">外注先</Link></li>
                {/* <li><Link href="/settings">設定</Link></li> */}
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