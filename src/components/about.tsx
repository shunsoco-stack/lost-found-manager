"use client";

import { useState } from "react";
import { resetStore } from "@/lib/storage";
import { useStore } from "./store-provider";
import { PageTitle, ErrorMessage } from "./ui";

export function AboutPage() {
  const { replace, notify } = useStore();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function reset() {
    setBusy(true);
    try {
      replace(await resetStore());
      setConfirm(false);
      notify("現在の日本時間を基準に、既定データと画像を作り直しました。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "初期化できませんでした。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="ABOUT THIS DEMO"
        title="このデモについて"
        description="受付から持ち主への返却まで、拾得物を大切につなぐためのアプリです。"
      />
      <section className="panel prose">
        <h2>デモ用の架空データです</h2>
        <p>
          施設・拾得物・人物・問い合わせ・署名はすべて架空です。写真はcanvasで描いたイラスト風サンプルで、実在の写真は使用していません。
        </p>
        <h2>この端末の中に保存します</h2>
        <p>
          記録はlocalStorage（lfm:v1）、写真と署名はIndexedDB（lfm-photos）に保存します。サーバー保存、警察や外部サービスとの連携、メール通知、AI画像認識はありません。ブラウザの保存データを削除すると記録も消えます。
        </p>
        <h2>保管期限と手続き</h2>
        <p>
          期限は遺失物法の運用を参考にした目安です。施設内での保管は1週間を基本とし、デモでは傘・衣類は14日で施設処分する設定です。実際の期限・権利・処分の可否・警察への届出については、各施設・警察署で確認してください。
        </p>
        <h2>備品の貸出管理との違い</h2>
        <p>
          扱うのは持ち主不明の拾得物です。施設の資産・在庫や貸出予定は管理しません。問い合わせは拾得物との特徴照合のために記録し、返却時は本人確認と署名を残します。
        </p>
        <h2>日付とデモデータ</h2>
        <p>
          初回起動とリセットの時点の日本時間から、過去約6週間分のデータを生成します。深夜に開いた場合は今日の拾得を作らず、昨日の受付が自然に表示されます。日付が変わっても保存済み記録は維持します。
        </p>
      </section>
      <section className="panel">
        <h2>既定データに戻す</h2>
        <p>
          追加・編集した記録を置き換え、デモデータと画像を作り直します。必要な記録は先にバックアップしてください。
        </p>
        {confirm ? (
          <div className="confirm-box">
            <p>現在の記録を既定の架空データに置き換えますか？</p>
            <div className="button-row">
              <button onClick={() => setConfirm(false)} disabled={busy}>
                キャンセル
              </button>
              <button className="button danger-button" onClick={reset} disabled={busy}>
                {busy ? "作り直しています…" : "既定データに戻す"}
              </button>
            </div>
          </div>
        ) : (
          <button className="button secondary" onClick={() => setConfirm(true)}>
            既定データに戻す
          </button>
        )}
        <ErrorMessage message={error} />
      </section>
    </>
  );
}
