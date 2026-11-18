"use client";

import Link from "next/link";
import { useState } from "react";
import type { Handover } from "@/lib/types";
import { completeHandover, deadline, disposeItem, makeHandover, urgency } from "@/lib/retention";
import { japanDateTime } from "@/lib/dates";
import { csvFilename, downloadFile, itemsCsv } from "@/lib/csv";
import { useStore } from "./store-provider";
import { Empty, ErrorMessage, Field, PageTitle, ValuableBadge, itemUrl } from "./ui";
import { HandoverPrint } from "./handover-print";

export function HandoverPage() {
  const { data, now, commit, notify } = useStore();
  const [selected, setSelected] = useState<string[]>([]);
  const [date, setDate] = useState(now.slice(0, 10));
  const [staff, setStaff] = useState(data.settings.staff[0]);
  const [preview, setPreview] = useState<Handover | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState("");
  const [disposeId, setDisposeId] = useState("");
  const holding = data.items.filter((item) => item.status === "保管中");
  const rows = holding
    .filter((item) => showAll || urgency(item, data.settings, now.slice(0, 10)) !== "余裕あり")
    .sort((a, b) => deadline(a, data.settings).localeCompare(deadline(b, data.settings)));
  function createList() {
    try {
      const record = makeHandover(
        data.items,
        selected,
        date,
        staff,
        data.settings.facility,
        japanDateTime(),
      );
      setPreview(record);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "一覧を生成できません。");
    }
  }
  function complete() {
    if (!preview) return;
    try {
      commit((store) => ({
        ...store,
        items: completeHandover(store.items, preview, japanDateTime()),
        handovers: [...store.handovers, preview],
      }));
      setSelected([]);
      notify("警察への引き渡しを記録しました。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存できません。");
    }
  }
  function dispose() {
    try {
      commit((store) => ({
        ...store,
        items: store.items.map((item) =>
          item.id === disposeId ? disposeItem(item, store.settings, japanDateTime()) : item,
        ),
      }));
      setDisposeId("");
      notify("施設での処分を記録しました。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "処分を記録できません。");
    }
  }
  return (
    <>
      <div className="no-print">
        <PageTitle
          eyebrow="RETENTION & HANDOVER"
          title="保管期限と警察への引き渡し"
          description="期限を確認して、引き渡しリストを作成・印刷します。"
        />
        <div className="notice-neutral">
          期限・手続きは遺失物法の運用を参考にした目安です。実際の運用は各施設・警察署で確認してください。
        </div>
        <section className="panel">
          <div className="section-heading">
            <h2>
              期限の確認 <span className="count-pill">{rows.length}</span>
            </h2>
            <label className="check-row">
              <input
                type="checkbox"
                checked={showAll}
                onChange={(event) => setShowAll(event.target.checked)}
              />
              保管中をすべて表示
            </label>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>選択</th>
                  <th>拾得物</th>
                  <th>期限</th>
                  <th>運用</th>
                  <th>保管場所</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <label className="table-checkbox">
                        <input
                          type="checkbox"
                          aria-label={`${item.number}を選択`}
                          checked={selected.includes(item.id)}
                          onChange={(event) => {
                            setPreview(null);
                            setSelected((previous) =>
                              event.target.checked
                                ? [...previous, item.id]
                                : previous.filter((id) => id !== item.id),
                            );
                          }}
                        />
                      </label>
                    </td>
                    <td>
                      <Link href={itemUrl(item.id)}>
                        <small className="item-number">{item.number}</small>
                        <strong>{item.features.split("、")[0]}</strong>
                      </Link>
                      {item.valuable && <ValuableBadge />}
                    </td>
                    <td>
                      <span
                        className={`badge ${urgency(item, data.settings, now.slice(0, 10)) === "期限切れ" ? "danger" : "warning"}`}
                      >
                        ◷ {urgency(item, data.settings, now.slice(0, 10))}
                      </span>
                      <small>{deadline(item, data.settings)}</small>
                    </td>
                    <td>
                      {item.valuable
                        ? "警察へ引き渡し"
                        : data.settings.retention[item.category].action}
                    </td>
                    <td>{item.storage}</td>
                    <td>
                      {!item.valuable &&
                        data.settings.retention[item.category].action === "施設で処分" &&
                        urgency(item, data.settings, now.slice(0, 10)) === "期限切れ" && (
                          <button onClick={() => setDisposeId(item.id)}>処分を記録</button>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && <Empty>期限が近い拾得物はありません。</Empty>}
          <p className="muted small">
            選択中 {selected.length} 件。施設で処分する設定の品も、警察への引き渡しを選べます。
          </p>
          {disposeId && (
            <div className="confirm-box" role="alert">
              <p>施設での処分が完了していることを確認してください。この記録は取り消せません。</p>
              <div className="button-row">
                <button onClick={() => setDisposeId("")}>キャンセル</button>
                <button className="button danger-button" onClick={dispose}>
                  処分済みとして記録
                </button>
              </div>
            </div>
          )}
          <div className="form-grid">
            <Field label="施設名">
              <input readOnly value={data.settings.facility} />
            </Field>
            <Field label="引き渡し日">
              <input
                type="date"
                max={now.slice(0, 10)}
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  setPreview(null);
                }}
              />
            </Field>
            <Field label="担当者">
              <select
                value={staff}
                onChange={(event) => {
                  setStaff(event.target.value);
                  setPreview(null);
                }}
              >
                {data.settings.staff.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </Field>
          </div>
          <ErrorMessage message={error} />
          <div className="form-actions">
            <button className="button primary" onClick={createList} disabled={!selected.length}>
              引き渡しリストを作成
            </button>
          </div>
        </section>
        {preview && (
          <div className="panel">
            <h2>印刷プレビュー</h2>
            <p>
              {preview.items.length} 件 ／ {preview.date} ／ {preview.staff}
            </p>
            <div className="button-row">
              <button className="button secondary" onClick={() => window.print()}>
                A4縦で印刷
              </button>
              <button
                className="button secondary"
                onClick={() =>
                  downloadFile(
                    itemsCsv(preview.items),
                    csvFilename("handover", preview.date, preview.date),
                    "text/csv;charset=utf-8",
                  )
                }
              >
                引き渡しリストをCSV出力
              </button>
              <button
                className="button primary"
                disabled={data.handovers.some((record) => record.id === preview.id)}
                onClick={complete}
              >
                {data.handovers.some((record) => record.id === preview.id)
                  ? "引き渡し記録済み"
                  : "引き渡し済みとして記録"}
              </button>
            </div>
            <p className="muted small">
              印刷だけでは状態は変わりません。実際に引き渡した後に記録してください。
            </p>
          </div>
        )}
        <section className="panel">
          <h2>引き渡しの履歴</h2>
          {data.handovers.map((record) => (
            <div className="history-row" key={record.id}>
              <span>
                {record.date} ／ {record.staff} ／ {record.items.length} 件
              </span>
              <button
                onClick={() => {
                  setPreview(record);
                  setError("");
                }}
              >
                リストを再表示
              </button>
            </div>
          ))}
        </section>
      </div>
      {preview && <HandoverPrint record={preview} />}
    </>
  );
}
