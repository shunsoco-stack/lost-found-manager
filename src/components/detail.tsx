"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { displayDate } from "@/lib/dates";
import { deadline, urgency } from "@/lib/retention";
import { useStore } from "./store-provider";
import { ItemForm } from "./item-form";
import { Empty, PageTitle, Photo, ValuableBadge, itemUrl } from "./ui";

export function useItemId(): string {
  const params = useParams<{ id?: string }>();
  const search = useSearchParams();
  return params.id || search.get("id") || "";
}

export function DetailRoute() {
  const id = useItemId();
  const { data, now } = useStore();
  const [editing, setEditing] = useState(false);
  const item = data.items.find((row) => row.id === id);
  if (!item)
    return (
      <Empty>
        拾得物が見つかりません。
        <Link href="/items" className="text-link">
          一覧に戻る
        </Link>
      </Empty>
    );
  if (editing) return <ItemForm existing={item} onCancel={() => setEditing(false)} />;
  const fields = [
    ["状態", item.status],
    ["分類", item.category],
    ["色", item.colors.join("・") || "未指定"],
    ["ブランド", item.brand || "不明"],
    ["拾得日時", displayDate(item.foundAt)],
    ["拾得場所", `${item.location} ${item.locationDetail}`],
    ["受付日時", displayDate(item.registeredAt)],
    ["保管場所", item.storage],
    ["中身の概要", `${item.contents || "未確認"}／現金 ${item.cash}円・カード ${item.cards}枚`],
    ["拾得者", item.finder],
    ["拾得者の氏名", item.finderName || "記録なし"],
    ["連絡先", item.finderContact || "記録なし"],
    [
      "権利放棄",
      item.finder === "スタッフ" ? "スタッフ拾得" : item.waived ? "放棄する" : "放棄しない",
    ],
    ["保管期限", deadline(item, data.settings)],
    [
      "期限後の運用",
      item.valuable ? "警察へ引き渡し" : data.settings.retention[item.category].action,
    ],
  ];
  return (
    <>
      <Link href="/items" className="text-link back-link">
        ← 拾得物一覧
      </Link>
      <PageTitle
        eyebrow={item.number}
        title={item.features.split("、")[0]}
        description={item.features}
        action={
          item.status === "保管中" && (
            <div className="button-row">
              <button className="button secondary" onClick={() => setEditing(true)}>
                登録内容を編集
              </button>
              <Link className="button primary" href={itemUrl(item.id, true)}>
                本人確認・返却へ
              </Link>
            </div>
          )
        }
      />
      <div className="detail-badges">
        <span className="badge">{item.status}</span>
        {item.valuable && <ValuableBadge />}
        {item.status === "保管中" && (
          <span className="badge warning">◷ {urgency(item, data.settings, now.slice(0, 10))}</span>
        )}
      </div>
      <div className="detail-layout">
        <section className="panel">
          <h2>写真</h2>
          <div className="detail-photos">
            {item.photos.length ? (
              item.photos.map((key) => <Photo key={key} imageKey={key} alt={item.features} />)
            ) : (
              <Empty>写真は登録されていません。</Empty>
            )}
          </div>
        </section>
        <section className="panel">
          <h2>受付情報</h2>
          <dl className="details-list">
            {fields.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      {item.returned && (
        <section className="panel">
          <h2>本人確認・返却の記録</h2>
          <dl className="details-list">
            <div>
              <dt>受取人</dt>
              <dd>{item.returned.recipient}</dd>
            </div>
            <div>
              <dt>本人確認</dt>
              <dd>{item.returned.document}（番号は記録していません）</dd>
            </div>
            <div>
              <dt>一致した特徴</dt>
              <dd>{item.returned.answer}</dd>
            </div>
            <div>
              <dt>受取日時・担当</dt>
              <dd>
                {displayDate(item.returned.at)} ／ {item.returned.staff}
              </dd>
            </div>
          </dl>
          <Photo
            imageKey={item.returned.signature}
            alt="受取人の署名"
            className="saved-signature"
          />
        </section>
      )}
      <section className="panel">
        <h2>履歴</h2>
        <ol className="timeline">
          {item.history.map((event, index) => (
            <li key={`${event.at}-${index}`}>
              <time>{displayDate(event.at)}</time>
              <span>{event.text}</span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
