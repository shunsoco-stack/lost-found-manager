"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { categories, colors } from "@/lib/types";
import type { Item, Category } from "@/lib/types";
import { nextNumber, isValuable, validateItemInput } from "@/lib/items";
import { japanDateTime } from "@/lib/dates";
import { shrinkPhoto } from "@/lib/photos";
import { putImages } from "@/lib/idb";
import { useStore } from "./store-provider";
import { ErrorMessage, Field, PageTitle, Photo, itemUrl } from "./ui";

export function ItemForm({ existing, onCancel }: { existing?: Item; onCancel?: () => void }) {
  const { data, now, commit, notify } = useStore();
  const router = useRouter();
  const [selectedColors, setSelectedColors] = useState(existing?.colors || []);
  const [finder, setFinder] = useState(existing?.finder || "スタッフ");
  const [photos, setPhotos] = useState<string[]>(existing?.photos || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function handlePhotos(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    setError("");
    try {
      if (photos.length + files.length > 6) throw new Error("写真は6枚まで登録できます。");
      const images: Record<string, string> = {};
      for (const file of files) images[`photo-${crypto.randomUUID()}`] = await shrinkPhoto(file);
      await putImages(images);
      setPhotos((previous) => [...previous, ...Object.keys(images)]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "写真を処理できません。");
    } finally {
      setBusy(false);
    }
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) || "").trim();
    const current = japanDateTime();
    try {
      const item: Item = {
        id: existing?.id || crypto.randomUUID(),
        number: existing?.number || nextNumber(data.items, current),
        foundAt: value("foundAt"),
        registeredAt: existing?.registeredAt || current,
        location: value("location"),
        locationDetail: value("locationDetail"),
        finder: finder as Item["finder"],
        finderName: value("finderName"),
        finderContact: value("finderContact"),
        waived: value("waived") !== "no",
        category: value("category") as Category,
        colors: selectedColors,
        brand: value("brand"),
        features: value("features"),
        contents: value("contents"),
        cash: Number(value("cash")),
        cards: Number(value("cards")),
        storage: value("storage"),
        photos,
        valuable: false,
        status: existing?.status || "保管中",
        history: [
          ...(existing?.history || []),
          { at: current, text: existing ? "登録内容を編集" : "拾得物を登録" },
        ],
      };
      item.valuable = isValuable(item);
      validateItemInput(item, current);
      if (existing && item.foundAt > existing.registeredAt)
        throw new Error("拾得日時は受付日時以前にしてください。");
      commit((store) => {
        if (existing && store.items.find((row) => row.id === existing.id)?.status !== "保管中")
          throw new Error("保管中の拾得物だけ編集できます。");
        if (!existing) item.number = nextNumber(store.items, current);
        return {
          ...store,
          items: existing
            ? store.items.map((row) => (row.id === item.id ? item : row))
            : [item, ...store.items],
        };
      });
      notify(existing ? "登録内容を更新しました。" : `拾得物 ${item.number} を登録しました。`);
      if (onCancel) onCancel();
      else router.push(itemUrl(item.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存できませんでした。");
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="REGISTER FOUND ITEM"
        title={existing ? "拾得物の編集" : "拾得物の登録"}
        description="持ち主が見つけられるよう、見た目の特徴を記録しましょう。"
      />
      <form onSubmit={submit} className="form-layout">
        <section className="panel">
          <h2>
            <span className="step">1</span>拾得したときの情報
          </h2>
          <div className="form-grid">
            <Field label="受付番号">
              <input
                value={existing?.number || `${nextNumber(data.items, now)}（保存時に採番）`}
                readOnly
              />
            </Field>
            <Field label="拾得日時 *">
              <input
                type="datetime-local"
                name="foundAt"
                required
                max={now}
                defaultValue={existing?.foundAt || now}
              />
            </Field>
            <Field label="拾得場所 *">
              <select name="location" defaultValue={existing?.location}>
                {data.settings.locations.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </Field>
            <Field label="場所の詳細">
              <input
                name="locationDetail"
                defaultValue={existing?.locationDetail}
                placeholder="例：窓際のベンチの下"
                maxLength={200}
              />
            </Field>
            <Field label="拾得者">
              <select
                value={finder}
                onChange={(event) => setFinder(event.target.value as Item["finder"])}
              >
                <option>スタッフ</option>
                <option>来館者</option>
              </select>
            </Field>
            {finder === "来館者" && (
              <>
                <Field label="拾得者の氏名（任意）">
                  <input name="finderName" defaultValue={existing?.finderName} maxLength={100} />
                </Field>
                <Field label="拾得者の連絡先（任意）">
                  <input
                    name="finderContact"
                    defaultValue={existing?.finderContact}
                    maxLength={200}
                  />
                </Field>
                <Field label="拾得者の権利">
                  <select name="waived" defaultValue={existing?.waived === false ? "no" : "yes"}>
                    <option value="yes">権利を放棄する</option>
                    <option value="no">権利を放棄しない</option>
                  </select>
                </Field>
              </>
            )}
          </div>
        </section>
        <section className="panel">
          <h2>
            <span className="step">2</span>ものの特徴
          </h2>
          <div className="form-grid">
            <Field label="分類 *">
              <select name="category" defaultValue={existing?.category || "傘"}>
                {categories.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </Field>
            <Field label="ブランド">
              <input
                name="brand"
                defaultValue={existing?.brand}
                placeholder="わかる範囲で記入"
                maxLength={100}
              />
            </Field>
            <fieldset className="wide color-field">
              <legend>色（複数選択）</legend>
              <div className="color-options">
                {colors.map((color) => (
                  <label key={color} className={selectedColors.includes(color) ? "checked" : ""}>
                    <input
                      type="checkbox"
                      checked={selectedColors.includes(color)}
                      onChange={(event) =>
                        setSelectedColors((previous) =>
                          event.target.checked
                            ? [...previous, color]
                            : previous.filter((value) => value !== color),
                        )
                      }
                    />
                    {color}
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label="特徴 *" wide>
              <textarea
                name="features"
                required
                maxLength={1000}
                defaultValue={existing?.features}
                placeholder="形、模様、傷、目印など。例：紺色の折りたたみ傘、持ち手に月のシール"
              />
            </Field>
            <Field
              label="中身の概要"
              wide
              hint="個人情報やカード番号・本人確認書類の番号は記録しないでください。"
            >
              <textarea
                name="contents"
                maxLength={500}
                defaultValue={existing?.contents}
                placeholder="例：ハンカチ、レシート"
              />
            </Field>
            <Field label="現金（円）">
              <input
                name="cash"
                type="number"
                min="0"
                step="1"
                defaultValue={existing?.cash || 0}
              />
            </Field>
            <Field label="カード類（枚数のみ）">
              <input
                name="cards"
                type="number"
                min="0"
                step="1"
                defaultValue={existing?.cards || 0}
              />
            </Field>
          </div>
          <p className="quiet-note">
            ◇ 財布・カード類・電子機器・鍵、現金またはカードが入ったものは貴重品として表示します。
          </p>
        </section>
        <section className="panel">
          <h2>
            <span className="step">3</span>写真・保管場所
          </h2>
          <div className="photo-previews">
            {photos.map((key) => (
              <div key={key}>
                <Photo imageKey={key} alt="登録する拾得物" />
                <button
                  type="button"
                  onClick={() => setPhotos((previous) => previous.filter((value) => value !== key))}
                >
                  写真を外す
                </button>
              </div>
            ))}
          </div>
          <div className="upload-control">
            <input
              className="visually-hidden"
              id="item-photos"
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              disabled={busy}
              onChange={(event) => {
                void handlePhotos(event.target.files);
                event.target.value = "";
              }}
            />
            <label htmlFor="item-photos" className="button secondary">
              {busy ? "写真を縮小しています…" : "写真を撮る・選ぶ"}
            </label>
            <p className="muted small">6枚まで・長辺1600pxに縮小してこの端末に保存</p>
          </div>
          <Field label="保管場所 *">
            <select name="storage" defaultValue={existing?.storage}>
              {data.settings.storage.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
        </section>
        <ErrorMessage message={error} />
        <div className="form-actions">
          {onCancel && (
            <button type="button" onClick={onCancel}>
              編集をやめる
            </button>
          )}
          <button className="button primary" disabled={busy} type="submit">
            {existing ? "変更を保存" : "拾得物を登録する"}
          </button>
        </div>
      </form>
    </>
  );
}
