import type { Store } from "./types";
import { validateStore } from "./validation";
import { createSeed } from "./seed";
import { seedImages } from "./samples";
import { putImages } from "./idb";

export const storageKey = "lfm:v1";

export function saveStore(data: Store): void {
  if (!validateStore(data)) throw new Error("データに不正な項目があります。保存できません。");
  localStorage.setItem(storageKey, JSON.stringify(data));
}

export async function resetStore(): Promise<Store> {
  const data = createSeed(new Date());
  await putImages(seedImages(data.items));
  saveStore(data);
  return data;
}

export async function loadStore(): Promise<{ data: Store; message: string }> {
  const raw = localStorage.getItem(storageKey);
  if (raw) {
    try {
      const value: unknown = JSON.parse(raw);
      if (validateStore(value)) return { data: value, message: "" };
    } catch {
      /* 破損データは既定データで復旧する。 */
    }
  }
  return {
    data: await resetStore(),
    message: raw ? "保存データが破損していたため、既定の架空データに戻しました。" : "",
  };
}
