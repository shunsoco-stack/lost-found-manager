import type { Item, Status } from "./types";
import { validDateTime } from "./dates";

export function nextNumber(items: Pick<Item, "number">[], at: string): string {
  const prefix = `L-${at.slice(2, 4)}${at.slice(5, 7)}-`;
  const largest = Math.max(
    0,
    ...items
      .filter((item) => item.number.startsWith(prefix))
      .map((item) => Number(item.number.slice(prefix.length)) || 0),
  );
  return `${prefix}${String(largest + 1).padStart(3, "0")}`;
}

export function isValuable(item: Pick<Item, "category" | "cash" | "cards">): boolean {
  return (
    ["財布・カード類", "スマホ・電子機器", "鍵"].includes(item.category) ||
    item.cash > 0 ||
    item.cards > 0
  );
}

export function transition(item: Item, status: Status, at: string, note: string): Item {
  if (item.status !== "保管中" || status === "保管中")
    throw new Error("保管中の拾得物だけを処理できます。二重処理はできません。");
  if (!validDateTime(at) || at < item.foundAt) throw new Error("処理日時を確認してください。");
  return { ...item, status, history: [...item.history, { at, text: note }] };
}

export function validateItemInput(item: Item, now: string): void {
  if (!validDateTime(item.foundAt) || item.foundAt > now)
    throw new Error("拾得日時は現在以前にしてください。");
  if (!item.features.trim() || !item.location.trim() || !item.storage.trim())
    throw new Error("特徴・拾得場所・保管場所を入力してください。");
  if (
    !Number.isFinite(item.cash) ||
    item.cash < 0 ||
    !Number.isInteger(item.cards) ||
    item.cards < 0
  )
    throw new Error("金額・枚数を確認してください。");
}
