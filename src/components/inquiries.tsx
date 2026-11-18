"use client";

import Link from "next/link";
import { useState } from "react";
import { categories, colors } from "@/lib/types";
import type { Inquiry, Query } from "@/lib/types";
import { findMatches, possibleMatches } from "@/lib/search";
import { displayDate, japanDateTime } from "@/lib/dates";
import { useStore } from "./store-provider";
import { Empty, ErrorMessage, Field, PageTitle, Photo, itemUrl } from "./ui";
import { Icon } from "./icons";

const emptyQuery: Query = { from: "", to: "", location: "", category: "", colors: [], words: "" };

export function Inquiries() {
  const { data, commit, notify, now } = useStore();
  const [query, setQuery] = useState<Query>(emptyQuery);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const matches = searched ? findMatches(data.items, query) : [];
  const notifications = possibleMatches(data.items, data.inquiries);
  const update = (key: keyof Query, value: string | string[]) => {
    setQuery((previous) => ({ ...previous, [key]: value }));
    setSelected("");
    setSearched(false);
  };
  function record(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      if (!searched) throw new Error("先に特徴を入力して照合してください。");
      const result = String(form.get("result")) as Inquiry["result"];
      if (result === "見つかった" && !selected)
        throw new Error("見つかった拾得物を候補から選んでください。");
      const inquiry: Inquiry = {
        id: crypto.randomUUID(),
        at: japanDateTime(),
        name: String(form.get("name") || "").trim(),
        contact: String(form.get("contact") || "").trim(),
        content: String(form.get("content") || "").trim(),
        result,
        query,
        itemId: selected || undefined,
      };
      commit((store) => ({ ...store, inquiries: [inquiry, ...store.inquiries] }));
      notify("問い合わせと照合結果を記録しました。");
      formElement.reset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "問い合わせを保存できません。");
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="FIND A MATCH"
        title="問い合わせと照合"
        description="なくしたものの特徴を聞き取り、候補を絞り込みます。スコアは一致の目安です。"
      />
      {notifications.length > 0 && (
        <section className="panel notification-panel">
          <h2>
            <Icon name="bell" />
            該当の可能性あり
          </h2>
          <p className="muted">「該当なし」の問い合わせ後に、似た拾得物が届いています。</p>
          {notifications.slice(0, 5).map((match) => (
            <div className="notification-row" key={`${match.inquiry.id}-${match.item.id}`}>
              <div>
                <strong>{match.inquiry.name || "お名前の記録なし"}</strong>
                <small>
                  {displayDate(match.inquiry.at)} ／ {match.inquiry.contact}
                </small>
                <p>{match.inquiry.content}</p>
                <Link href={itemUrl(match.item.id)} className="text-link">
                  {match.item.number}：{match.item.features}
                </Link>
              </div>
              <button
                className="button secondary"
                onClick={() => {
                  setQuery(match.inquiry.query);
                  setSearched(true);
                  setSelected(match.item.id);
                }}
              >
                候補を照合
              </button>
              <button
                className="button secondary"
                onClick={() => {
                  try {
                    commit((store) => ({
                      ...store,
                      inquiries: store.inquiries.map((row) =>
                        row.id === match.inquiry.id ? { ...row, result: "後日連絡" } : row,
                      ),
                    }));
                    notify("後日連絡として更新しました。");
                  } catch {
                    notify("更新できませんでした。");
                  }
                }}
              >
                後日連絡にする
              </button>
            </div>
          ))}
        </section>
      )}
      <section className="panel">
        <h2>なくしたものの特徴</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (query.from && query.to && query.from > query.to) {
              setError("日付の開始と終了を確認してください。");
              return;
            }
            setError("");
            setSearched(true);
          }}
        >
          <div className="form-grid three-columns">
            <Field label="なくした日（開始）">
              <input
                type="date"
                value={query.from}
                max={now.slice(0, 10)}
                onChange={(event) => update("from", event.target.value)}
              />
            </Field>
            <Field label="なくした日（終了）">
              <input
                type="date"
                value={query.to}
                min={query.from}
                max={now.slice(0, 10)}
                onChange={(event) => update("to", event.target.value)}
              />
            </Field>
            <Field label="場所">
              <select
                value={query.location}
                onChange={(event) => update("location", event.target.value)}
              >
                <option value="">わからない</option>
                {data.settings.locations.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </Field>
            <Field label="分類">
              <select
                value={query.category}
                onChange={(event) => update("category", event.target.value)}
              >
                <option value="">指定しない</option>
                {categories.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </Field>
            <Field label="特徴の言葉" hint="空白で区切って複数入力できます。">
              <input
                value={query.words}
                onChange={(event) => update("words", event.target.value)}
                placeholder="例：丸い 金具"
              />
            </Field>
            <fieldset className="wide color-field">
              <legend>色（複数選択）</legend>
              <div className="color-options">
                {colors.map((color) => (
                  <label key={color} className={query.colors.includes(color) ? "checked" : ""}>
                    <input
                      type="checkbox"
                      checked={query.colors.includes(color)}
                      onChange={(event) =>
                        update(
                          "colors",
                          event.target.checked
                            ? [...query.colors, color]
                            : query.colors.filter((value) => value !== color),
                        )
                      }
                    />
                    {color}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setQuery(emptyQuery);
                setSearched(false);
                setSelected("");
              }}
            >
              条件をクリア
            </button>
            <button type="submit" className="button primary">
              <Icon name="search" />
              特徴から照合する
            </button>
          </div>
        </form>
      </section>
      {searched && (
        <section>
          <div className="section-heading">
            <h2>
              照合候補 <span className="count-pill">{matches.length}</span>
            </h2>
            <span className="muted small">照合スコアが高い順 ／ 100点満点</span>
          </div>
          {matches.map((match) => (
            <article
              className={`match-card ${selected === match.item.id ? "chosen" : ""}`}
              key={match.item.id}
            >
              <Photo imageKey={match.item.photos[0]} alt={match.item.features} />
              <div>
                <Link href={itemUrl(match.item.id)}>
                  <span className="item-number">{match.item.number}</span>
                  <h3>{match.item.features}</h3>
                </Link>
                <p>
                  {match.item.location} ／ {displayDate(match.item.foundAt)}
                </p>
                <div className="reason-badges">
                  {match.reasons.map((reason) => (
                    <span className="badge" key={reason}>
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
              <div className="match-score">
                <strong>
                  {match.score}
                  <small>点</small>
                </strong>
                <button className="button secondary" onClick={() => setSelected(match.item.id)}>
                  {selected === match.item.id ? "✓ 選択中" : "この候補を選ぶ"}
                </button>
              </div>
            </article>
          ))}
          {!matches.length && (
            <Empty>
              一致する候補はありません。問い合わせを記録しておくと、新着の拾得物と自動で照合します。
            </Empty>
          )}
        </section>
      )}
      <section className="panel">
        <h2>問い合わせを記録する</h2>
        <form onSubmit={record}>
          <div className="form-grid">
            <Field label="問い合わせ者の名前（任意）">
              <input name="name" maxLength={100} />
            </Field>
            <Field label="連絡方法 *">
              <input name="contact" required maxLength={200} placeholder="電話・窓口・再来館など" />
            </Field>
            <Field label="内容 *" wide>
              <textarea name="content" required maxLength={1000} />
            </Field>
            <Field label="結果">
              <select name="result">
                <option>該当なし</option>
                <option>見つかった</option>
                <option>後日連絡</option>
              </select>
            </Field>
            <p className="muted">
              {selected
                ? `選択中：${data.items.find((item) => item.id === selected)?.number}`
                : "見つかった場合は、候補の拾得物を選択してください。"}
            </p>
          </div>
          <ErrorMessage message={error} />
          <div className="form-actions">
            <button type="submit" className="button primary">
              問い合わせを記録
            </button>
          </div>
        </form>
      </section>
      <section className="panel">
        <h2>
          問い合わせの記録 <span className="count-pill">{data.inquiries.length}</span>
        </h2>
        <div className="inquiry-history">
          {data.inquiries.map((inquiry) => (
            <article key={inquiry.id}>
              <div className="section-heading">
                <strong>{inquiry.name || "お名前の記録なし"}</strong>
                <span className="badge">{inquiry.result}</span>
              </div>
              <small className="muted">
                {displayDate(inquiry.at)} ／ {inquiry.contact}
              </small>
              <p>{inquiry.content}</p>
              {inquiry.itemId && (
                <Link href={itemUrl(inquiry.itemId)} className="text-link">
                  関連する拾得物を見る →
                </Link>
              )}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
