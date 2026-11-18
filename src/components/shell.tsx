"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "./store-provider";
import { Icon } from "./icons";

const navigation = [
  { href: "/", title: "今日の受付", icon: "home" },
  { href: "/items", title: "拾得物一覧", icon: "items" },
  { href: "/inquiries", title: "問い合わせと照合", icon: "search" },
  { href: "/handover", title: "保管期限・引き渡し", icon: "handover" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { data, now } = useStore();
  return (
    <div className="app-shell">
      <aside className="sidebar no-print">
        <Link className="brand" href="/">
          <span className="brand-mark">⌑</span>
          <span>
            おかえりカウンター<small>忘れ物・落とし物管理</small>
          </span>
        </Link>
        <div className="workspace">
          <span className="eyebrow">RECEPTION DESK</span>
          <strong>みなとみらいテラス</strong>
          <span>
            2F 総合案内 <i className="online-dot" /> 受付中
          </span>
        </div>
        <p className="nav-label">受付業務</p>
        <nav>
          {navigation.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                (link.href === "/" ? path === "/" : path.startsWith(link.href)) ? "active" : ""
              }
            >
              <Icon name={link.icon} />
              {link.title}
            </Link>
          ))}
        </nav>
        <Link href="/items/new" className="button primary sidebar-register">
          <Icon name="plus" />
          拾得物を登録
        </Link>
        <div className="sidebar-bottom">
          <nav>
            <Link href="/settings" className={path === "/settings" ? "active" : ""}>
              <Icon name="settings" />
              施設・保管設定
            </Link>
            <Link href="/backup" className={path === "/backup" ? "active" : ""}>
              <Icon name="backup" />
              バックアップ
            </Link>
            <Link href="/about" className={path === "/about" ? "active" : ""}>
              <Icon name="info" />
              このデモについて
            </Link>
          </nav>
          <div className="local-note">
            <i className="online-dot" />
            この端末に保存<small>データを外部へ送信しません</small>
          </div>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar no-print">
          <div className="facility">
            <Icon name="home" size={18} />
            <span>{data.settings.facility}</span>
          </div>
          <div className="demo-badge">デモ用の架空データです</div>
          <span className="avatar">受</span>
        </header>
        <main id="main-content">{children}</main>
        <footer className="app-footer no-print">
          <span>
            おかえりカウンター <span className="muted">／ 持ち主へ、きちんとつなぐ。</span>
          </span>
          <span>日本時間 {now.replace("T", " ")}</span>
          <div className="mobile-utilities">
            <Link href="/settings">設定</Link>
            <Link href="/backup">バックアップ</Link>
            <Link href="/about">デモについて</Link>
          </div>
        </footer>
      </div>
      <nav className="bottom-tabs no-print">
        {navigation.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              path === link.href || (link.href !== "/" && path.startsWith(link.href))
                ? "active"
                : ""
            }
          >
            <Icon name={link.icon} />
            <span>
              {link.href === "/inquiries"
                ? "照合"
                : link.href === "/handover"
                  ? "期限管理"
                  : link.title}
            </span>
          </Link>
        ))}
        <Link href="/items/new">
          <Icon name="plus" />
          <span>登録</span>
        </Link>
      </nav>
    </div>
  );
}
