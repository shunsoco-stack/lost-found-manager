"use client";

import Link from "next/link";
import { useStore } from "./store-provider";
import { PageTitle, ItemCard, Empty, itemUrl } from "./ui";
import { Icon } from "./icons";
import { addDays, displayDate } from "@/lib/dates";
import { urgency, deadline } from "@/lib/retention";
import { possibleMatches } from "@/lib/search";

export function Dashboard() {
  const { data, now } = useStore();
  const today = now.slice(0, 10);
  const holding = data.items.filter((item) => item.status === "保管中");
  const todayItems = data.items.filter((item) => item.foundAt.startsWith(today));
  const yesterdayItems = data.items.filter((item) => item.foundAt.startsWith(addDays(today, -1)));
  const overdue = holding.filter((item) => urgency(item, data.settings, today) === "期限切れ");
  const soon = holding.filter((item) => urgency(item, data.settings, today) === "3日以内");
  const matches = possibleMatches(data.items, data.inquiries);
  const recent = [...todayItems, ...yesterdayItems].slice(0, 6);
  const stats = [
    {
      label: "今日の拾得",
      value: todayItems.length,
      unit: "件",
      note: `昨日は ${yesterdayItems.length} 件`,
      icon: "items",
      className: "",
    },
    {
      label: "保管中の拾得物",
      value: holding.length,
      unit: "件",
      note: "持ち主からの連絡を待っています",
      icon: "home",
      className: "",
    },
    {
      label: "保管中の貴重品",
      value: holding.filter((item) => item.valuable).length,
      unit: "件",
      note: "鍵・財布・電子機器など",
      icon: "shield",
      className: "amber",
    },
    {
      label: "保管期限が近いもの",
      value: overdue.length + soon.length,
      unit: "件",
      note: `期限切れ ${overdue.length} 件・3日以内 ${soon.length} 件`,
      icon: "clock",
      className: "coral",
    },
  ];
  return (
    <>
      <PageTitle
        eyebrow="TODAY'S RECEPTION"
        title="今日の受付"
        description={`${today.replaceAll("-", ".")}　｜　お預かりしたものを、持ち主のもとへ。`}
        action={
          <Link href="/items/new" className="button primary">
            <Icon name="plus" />
            拾得物を登録
          </Link>
        }
      />
      <div className="stats-grid">
        {stats.map((stat) => (
          <div className={`stat-card ${stat.className}`} key={stat.label}>
            <div className="stat-label">
              {stat.label}
              <span className="stat-icon">
                <Icon name={stat.icon} />
              </span>
            </div>
            <div className="stat-value">
              {stat.value}
              <span>{stat.unit}</span>
            </div>
            <small>{stat.note}</small>
          </div>
        ))}
      </div>
      {matches.length > 0 && (
        <Link href="/inquiries" className="match-notice">
          <span className="notice-icon">
            <Icon name="bell" />
          </span>
          <div>
            <strong>お探しのものが、届いているかもしれません</strong>
            <p>過去の問い合わせに「該当の可能性あり」が {matches.length} 件あります。</p>
          </div>
          <span className="notice-link">
            照合する <Icon name="arrow" size={18} />
          </span>
        </Link>
      )}
      <div className="dashboard-columns">
        <section>
          <div className="section-heading">
            <div>
              <h2>
                最近お預かりしたもの{" "}
                <span className="count-pill">{todayItems.length + yesterdayItems.length}</span>
              </h2>
              <p>今日・昨日の拾得物</p>
            </div>
            <Link href="/items" className="text-link">
              すべて見る <Icon name="arrow" size={16} />
            </Link>
          </div>
          {!todayItems.length && (
            <p className="quiet-note">
              今日の拾得はまだありません。昨日の受付記録を表示しています。
            </p>
          )}
          <div className="cards-grid">
            {recent.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
          {!recent.length && <Empty>今日・昨日の拾得物はありません。</Empty>}
        </section>
        <aside className="dashboard-aside">
          <section className="panel deadline-panel">
            <div className="section-heading">
              <h2>
                <Icon name="clock" size={19} />
                期限の確認
              </h2>
              <span className="badge danger">! 要確認</span>
            </div>
            <p className="muted small">引き渡し・処分の準備をお願いします。</p>
            {[...overdue, ...soon].slice(0, 4).map((item) => (
              <Link href={itemUrl(item.id)} key={item.id} className="deadline-row">
                <div>
                  <span
                    className={`badge ${urgency(item, data.settings, today) === "期限切れ" ? "danger" : "warning"}`}
                  >
                    {urgency(item, data.settings, today) === "期限切れ"
                      ? "! 期限切れ"
                      : "◷ 3日以内"}
                  </span>
                  <small>{deadline(item, data.settings)}</small>
                </div>
                <strong>{item.features.split("、")[0]}</strong>
                <span className="item-number">{item.number}</span>
              </Link>
            ))}
            <Link href="/handover" className="button full secondary">
              期限・引き渡しを確認 <Icon name="arrow" size={16} />
            </Link>
          </section>
          <section className="help-panel">
            <span className="eyebrow">COUNTER GUIDE</span>
            <h3>問い合わせがあったら</h3>
            <p>持ち主の方が覚えている色や特徴から、拾得物を探せます。</p>
            <Link href="/inquiries" className="text-link">
              <Icon name="search" size={17} />
              特徴から照合する
            </Link>
          </section>
          <p className="side-caption">
            <Icon name="shield" size={17} />
            本人確認書類の番号は記録しません。
          </p>
        </aside>
      </div>
      <section className="activity-strip">
        <span className="online-dot" />
        <strong>受付メモ</strong>
        <p>貴重品は施錠できる場所へ。返却時は特徴の一致と本人確認を忘れずに。</p>
        <span className="muted">
          最終受付 {data.items[0] ? displayDate(data.items[0].registeredAt) : "—"}
        </span>
      </section>
    </>
  );
}
