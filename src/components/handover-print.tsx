import type { Handover } from "@/lib/types";
import { paginate } from "@/lib/retention";
import { displayDate } from "@/lib/dates";

export function HandoverPrint({ record }: { record: Handover }) {
  const pages = paginate(record.items);
  return (
    <div className="print-document">
      {pages.map((items, page) => (
        <section key={page} className="print-page">
          <div className="print-header">
            <span>拾得物届出用・施設控え</span>
            <span>
              {page + 1} / {pages.length}
            </span>
          </div>
          <h1>警察への引き渡しリスト</h1>
          <dl className="print-meta">
            <div>
              <dt>施設名</dt>
              <dd>{record.facility}</dd>
            </div>
            <div>
              <dt>担当者</dt>
              <dd>{record.staff}</dd>
            </div>
            <div>
              <dt>引き渡し日</dt>
              <dd>{record.date}</dd>
            </div>
          </dl>
          <p>
            対象 {record.items.length} 件（このページ {items.length} 件）
          </p>
          <table className="print-table">
            <thead>
              <tr>
                <th>受付番号・拾得日時</th>
                <th>拾得場所・分類</th>
                <th>特徴・中身の概要</th>
                <th>権利放棄・保管場所</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.number}</strong>
                    <br />
                    {displayDate(item.foundAt)}
                  </td>
                  <td>
                    {item.location}
                    <br />
                    {item.locationDetail}
                    <hr />
                    {item.category}
                  </td>
                  <td>
                    {item.colors.join("・")} {item.brand}
                    <br />
                    {item.features}
                    <hr />
                    {item.contents}
                    <br />
                    現金 {item.cash} 円／カード {item.cards} 枚
                  </td>
                  <td>
                    {item.finder === "スタッフ"
                      ? "スタッフ拾得"
                      : item.waived
                        ? "権利を放棄する"
                        : "権利を放棄しない"}
                    <hr />
                    {item.storage}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="receipt-area">
            <p>
              受領確認
              <br />
              <small>受領日：　　　　年　　　月　　　日</small>
            </p>
            <div>受領印</div>
          </div>
          <p className="print-footnote">
            デモ用の架空データです。期限・手続きは目安です。実際の運用は各施設・警察署で確認してください。
          </p>
        </section>
      ))}
    </div>
  );
}
