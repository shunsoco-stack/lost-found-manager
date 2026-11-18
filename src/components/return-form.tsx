"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { documents } from "@/lib/types";
import type { ReturnRecord } from "@/lib/types";
import { returnItem } from "@/lib/returns";
import { japanDateTime } from "@/lib/dates";
import { putImages } from "@/lib/idb";
import { useItemId } from "./detail";
import { useStore } from "./store-provider";
import { Empty, ErrorMessage, Field, PageTitle, Photo, itemUrl } from "./ui";
import { Signature } from "./signature";

export function ReturnRoute() {
  const id = useItemId();
  const { data, now, commit, notify } = useStore();
  const item = data.items.find((row) => row.id === id);
  const router = useRouter();
  const [signature, setSignature] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!item) return <Empty>対象の拾得物が見つかりません。</Empty>;
  const target = item;
  if (item.status !== "保管中")
    return (
      <Empty>
        この拾得物は{item.status}です。二重に返却できません。
        <Link href={itemUrl(id)}>詳細を確認</Link>
      </Empty>
    );
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      if (!signature) throw new Error("受取人の署名が必要です。");
      const signatureKey = `signature-${crypto.randomUUID()}`;
      const record: ReturnRecord = {
        document: String(form.get("document")),
        matched: form.get("matched") === "on",
        answer: String(form.get("answer") || "").trim(),
        recipient: String(form.get("recipient") || "").trim(),
        at: String(form.get("at")),
        staff: String(form.get("staff")),
        signature: signatureKey,
      };
      returnItem(target, record, japanDateTime());
      await putImages({ [signatureKey]: signature });
      commit((store) => ({
        ...store,
        items: store.items.map((row) =>
          row.id === id ? returnItem(row, record, japanDateTime()) : row,
        ),
      }));
      notify("本人確認と返却の記録を保存しました。");
      router.push(itemUrl(id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "返却記録を保存できません。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link href={itemUrl(id)} className="text-link back-link">
        ← 拾得物の詳細
      </Link>
      <PageTitle
        eyebrow="RETURN TO OWNER"
        title="本人確認・返却"
        description="特徴と本人確認書類を確認してから、受取人にお渡ししてください。"
      />
      <div className="return-summary panel">
        <Photo imageKey={item.photos[0]} alt={item.features} />
        <div>
          <span className="item-number">{item.number}</span>
          <h2>{item.features}</h2>
          <p>保管場所：{item.storage}</p>
        </div>
      </div>
      <form onSubmit={submit} className="form-layout">
        <section className="panel">
          <h2>
            <span className="step">1</span>本人確認
          </h2>
          <div className="form-grid">
            <Field label="確認した書類の種類 *" hint="書類番号・コピーは保存しません。">
              <select name="document" required defaultValue="">
                <option value="" disabled>
                  選択してください
                </option>
                {documents.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </Field>
            <Field label="受取人の氏名 *">
              <input name="recipient" required maxLength={100} />
            </Field>
            <Field label="本人が答えた特徴 *" wide>
              <textarea
                name="answer"
                required
                maxLength={1000}
                placeholder="写真を見せる前に、中身・目印などを確認してください。"
              />
            </Field>
          </div>
          <label className="check-row">
            <input type="checkbox" name="matched" required />
            本人が答えた特徴が、拾得物の特徴と一致しました
          </label>
        </section>
        <section className="panel">
          <h2>
            <span className="step">2</span>受取日時・署名
          </h2>
          <div className="form-grid">
            <Field label="受取日時 *">
              <input
                type="datetime-local"
                name="at"
                required
                min={item.foundAt}
                max={now}
                defaultValue={now}
              />
            </Field>
            <Field label="対応スタッフ *">
              <select name="staff">
                {data.settings.staff.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </Field>
          </div>
          <h3>受取人の署名 *</h3>
          <Signature onChange={setSignature} />
        </section>
        <ErrorMessage message={error} />
        <div className="form-actions">
          <Link href={itemUrl(id)} className="button secondary">
            キャンセル
          </Link>
          <button type="submit" disabled={busy} className="button primary">
            {busy ? "保存しています…" : "確認して返却を記録"}
          </button>
        </div>
      </form>
    </>
  );
}
