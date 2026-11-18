"use client";

import { useState } from "react";
import type { Backup } from "@/lib/types";
import { imageKeys, parseBackup } from "@/lib/backup";
import { exportImages, putImages } from "@/lib/idb";
import { downloadFile } from "@/lib/csv";
import { useStore } from "./store-provider";
import { ErrorMessage, PageTitle } from "./ui";

export function BackupPage() {
  const { data, now, replace, notify } = useStore();
  const [pending, setPending] = useState<Backup | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function exportBackup() {
    setBusy(true);
    setError("");
    try {
      const backup: Backup = {
        format: "lfm-backup",
        version: 1,
        data,
        images: await exportImages(imageKeys(data)),
      };
      downloadFile(
        JSON.stringify(backup),
        `拾得物バックアップ_${now.slice(0, 10)}.json`,
        "application/json",
      );
      notify("写真・署名を含むバックアップを書き出しました。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "書き出しに失敗しました。");
    } finally {
      setBusy(false);
    }
  }
  async function readFile(file?: File) {
    if (!file) return;
    setError("");
    setPending(null);
    setBusy(true);
    try {
      if (file.size > 100 * 1024 * 1024)
        throw new Error("100MB以下のJSONファイルを選択してください。");
      setPending(parseBackup(await file.text()));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ファイルを読み込めません。");
    } finally {
      setBusy(false);
    }
  }
  async function restore() {
    if (!pending) return;
    setBusy(true);
    try {
      // キーを振り直して既存写真を上書きせず、メタデータ保存成功後に切り替える。
      const backup = structuredClone(pending);
      const mapping = Object.fromEntries(
        Object.keys(backup.images).map((key) => [key, `restored-${crypto.randomUUID()}`]),
      );
      const images = Object.fromEntries(
        Object.entries(backup.images).map(([key, image]) => [mapping[key], image]),
      );
      for (const item of [
        ...backup.data.items,
        ...backup.data.handovers.flatMap((record) => record.items),
      ]) {
        item.photos = item.photos.map((key) => mapping[key]);
        if (item.returned) item.returned.signature = mapping[item.returned.signature];
      }
      await putImages(images);
      replace(backup.data);
      setPending(null);
      notify("バックアップを復元しました。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "復元できませんでした。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="LOCAL BACKUP"
        title="バックアップ"
        description="この端末の記録を、写真・署名も含めてJSONに保存します。"
      />
      <div className="two-panels">
        <section className="panel">
          <h2>バックアップを書き出す</h2>
          <p>
            拾得物 {data.items.length} 件、問い合わせ {data.inquiries.length}{" "}
            件と、施設設定・引き渡し履歴を含みます。
          </p>
          <p className="muted">
            ブラウザのデータを削除する前や、別の端末へ移す際に保存してください。
          </p>
          <button disabled={busy} className="button primary" onClick={exportBackup}>
            {busy ? "処理しています…" : "バックアップを書き出す（JSON）"}
          </button>
        </section>
        <section className="panel">
          <h2>バックアップを読み込む</h2>
          <p>ファイルの内容を検証してから、現在のデータを置き換えます。</p>
          <div className="upload-control">
            <input
              className="visually-hidden"
              id="backup-file"
              type="file"
              accept=".json,application/json"
              disabled={busy}
              onChange={(event) => {
                void readFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <label htmlFor="backup-file" className="button secondary">
              バックアップを読み込む（JSON）
            </label>
          </div>
          {pending && (
            <div className="confirm-box">
              <p>
                {pending.data.settings.facility}
                <br />
                拾得物 {pending.data.items.length} 件・写真と署名{" "}
                {Object.keys(pending.images).length} 点
              </p>
              <p>現在の記録を置き換えます。必要なデータは先に書き出してください。</p>
              <div className="button-row">
                <button disabled={busy} onClick={() => setPending(null)}>
                  キャンセル
                </button>
                <button disabled={busy} className="button primary" onClick={restore}>
                  この内容で復元する
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
      <ErrorMessage message={error} />
      <p className="notice-neutral">
        バックアップには氏名・連絡先・署名が含まれます。保管先と共有範囲にご注意ください。外部サービスには送信しません。
      </p>
    </>
  );
}
