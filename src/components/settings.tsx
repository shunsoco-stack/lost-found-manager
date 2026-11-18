"use client";

import { useState } from "react";
import { categories } from "@/lib/types";
import type { Settings } from "@/lib/types";
import { useStore } from "./store-provider";
import { ErrorMessage, Field, PageTitle } from "./ui";

export function SettingsPage() {
  const { data, commit, notify } = useStore();
  const [error, setError] = useState("");
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const lines = (name: string) => [
      ...new Set(
        String(form.get(name) || "")
          .split("\n")
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ];
    try {
      const settings: Settings = {
        facility: String(form.get("facility") || "").trim(),
        locations: lines("locations"),
        storage: lines("storage"),
        staff: lines("staff"),
        retention: Object.fromEntries(
          categories.map((category) => [
            category,
            {
              days: Number(form.get(`days-${category}`)),
              action: String(form.get(`action-${category}`)),
            },
          ]),
        ) as Settings["retention"],
      };
      if (![settings.locations, settings.storage, settings.staff].every((list) => list.length > 0))
        throw new Error("各リストには少なくとも1件登録してください。");
      commit((store) => ({ ...store, settings }));
      notify("施設・保管設定を保存しました。保管中の品にも新しい期限が適用されます。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "設定を保存できません。");
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="FACILITY SETTINGS"
        title="施設・保管設定"
        description="施設の受付場所と、分類ごとの保管ルールを設定します。"
      />
      <form onSubmit={submit} className="form-layout">
        <section className="panel">
          <h2>施設情報</h2>
          <Field label="施設名 *">
            <input name="facility" required maxLength={150} defaultValue={data.settings.facility} />
          </Field>
          <div className="form-grid">
            <Field label="拾得場所（1行に1か所）">
              <textarea
                name="locations"
                required
                rows={10}
                defaultValue={data.settings.locations.join("\n")}
              />
            </Field>
            <Field label="保管場所（1行に1か所）">
              <textarea
                name="storage"
                required
                rows={6}
                defaultValue={data.settings.storage.join("\n")}
              />
            </Field>
            <Field label="対応スタッフ（1行に1名）">
              <textarea
                name="staff"
                required
                rows={5}
                defaultValue={data.settings.staff.join("\n")}
              />
            </Field>
          </div>
        </section>
        <section className="panel">
          <h2>分類ごとの保管期限</h2>
          <p className="notice-neutral">
            警察へ引き渡す分類は初期値7日。傘・衣類はデモ用に14日で施設処分としています。いずれも運用の目安です。処分の可否・届出の手続きは施設と警察署で確認してください。変更は既存の保管中の品にも適用されます。
          </p>
          <div className="retention-settings">
            {categories.map((category) => (
              <div key={category}>
                <strong>{category}</strong>
                <Field label="拾得日からの日数">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    required
                    name={`days-${category}`}
                    defaultValue={data.settings.retention[category].days}
                  />
                </Field>
                <Field label="期限後の運用">
                  <select
                    name={`action-${category}`}
                    defaultValue={data.settings.retention[category].action}
                  >
                    <option>警察へ引き渡し</option>
                    <option>施設で処分</option>
                  </select>
                </Field>
              </div>
            ))}
          </div>
          <p className="muted small">
            貴重品は、分類設定にかかわらず警察への引き渡しを案内します。
          </p>
        </section>
        <ErrorMessage message={error} />
        <div className="form-actions">
          <button type="submit" className="button primary">
            設定を保存
          </button>
        </div>
      </form>
    </>
  );
}
