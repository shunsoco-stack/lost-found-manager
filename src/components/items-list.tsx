"use client";

import Link from "next/link";
import { useState } from "react";
import { categories, colors, statuses } from "@/lib/types";
import type { Status } from "@/lib/types";
import { itemsCsv, csvFilename, downloadFile } from "@/lib/csv";
import { useStore } from "./store-provider";
import { Empty, Field, ItemCard, PageTitle } from "./ui";
import { Icon } from "./icons";

export function ItemsList() {
  const { data, now } = useStore();
  const [status, setStatus] = useState<Status>("保管中");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [keyword, setKeyword] = useState("");
  const filtered = data.items
    .filter(
      (item) =>
        item.status === status &&
        (!category || item.category === category) &&
        (!color || item.colors.includes(color)) &&
        (!from || item.foundAt.slice(0, 10) >= from) &&
        (!to || item.foundAt.slice(0, 10) <= to) &&
        `${item.number} ${item.features} ${item.brand}`.includes(keyword),
    )
    .sort((a, b) => b.foundAt.localeCompare(a.foundAt));
  return (
    <>
      <PageTitle
        eyebrow="FOUND ITEMS"
        title="拾得物一覧"
        description="お預かりしたものと、その後の記録を確認できます。"
        action={
          <Link href="/items/new" className="button primary">
            <Icon name="plus" />
            拾得物を登録
          </Link>
        }
      />
      <div className="tabs" role="tablist" aria-label="拾得物の状態">
        {statuses.map((value) => (
          <button
            role="tab"
            aria-selected={value === status}
            key={value}
            onClick={() => setStatus(value)}
            className={status === value ? "selected" : ""}
          >
            {value}
            <span>{data.items.filter((item) => item.status === value).length}</span>
          </button>
        ))}
      </div>
      <section className="panel filters">
        <div className="form-grid filters-grid">
          <Field label="分類">
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">すべての分類</option>
              {categories.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
          <Field label="色">
            <select value={color} onChange={(event) => setColor(event.target.value)}>
              <option value="">すべての色</option>
              {colors.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
          <Field label="拾得日（開始）">
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </Field>
          <Field label="拾得日（終了）">
            <input
              type="date"
              value={to}
              min={from}
              onChange={(event) => setTo(event.target.value)}
            />
          </Field>
          <Field label="受付番号・特徴">
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="例：長財布、月のシール"
            />
          </Field>
        </div>
      </section>
      <div className="section-heading result-heading">
        <p>
          <strong>{filtered.length}</strong> 件の拾得物
        </p>
        <button
          className="button secondary"
          onClick={() =>
            downloadFile(
              itemsCsv(filtered),
              csvFilename(
                "items",
                from || filtered.at(-1)?.foundAt.slice(0, 10) || now.slice(0, 10),
                to || now.slice(0, 10),
              ),
              "text/csv;charset=utf-8",
            )
          }
        >
          <Icon name="backup" size={17} />
          CSVを書き出す
        </button>
      </div>
      {from && to && from > to && (
        <p role="alert" className="error-message">
          開始日を終了日以前にしてください。
        </p>
      )}
      <div className="items-grid">
        {filtered.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
      {!filtered.length && (
        <Empty>条件に合う拾得物はありません。絞り込み条件を変更してください。</Empty>
      )}
    </>
  );
}
