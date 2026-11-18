import type { Item, Settings, Handover } from "./types";
import { addDays, dayDifference, validDate } from "./dates";
import { transition } from "./items";

export function deadline(item: Item, settings: Settings): string {
  return addDays(item.foundAt, settings.retention[item.category].days);
}

export function urgency(item: Item, settings: Settings, today: string) {
  const days = dayDifference(today, deadline(item, settings));
  return days < 0 ? "期限切れ" : days <= 3 ? "3日以内" : "余裕あり";
}

export function paginate<T>(rows: T[], size = 5): T[][] {
  if (!Number.isInteger(size) || size < 1) throw new Error("ページ件数が不正です。");
  const pages: T[][] = [];
  for (let start = 0; start < rows.length; start += size)
    pages.push(rows.slice(start, start + size));
  return pages;
}

export function makeHandover(
  items: Item[],
  ids: string[],
  date: string,
  staff: string,
  facility: string,
  now: string,
): Handover {
  const selected = items.filter((item) => ids.includes(item.id));
  if (
    !selected.length ||
    new Set(ids).size !== ids.length ||
    selected.length !== ids.length ||
    selected.some((item) => item.status !== "保管中")
  )
    throw new Error("保管中の拾得物を選択してください。");
  if (
    !validDate(date) ||
    date > now.slice(0, 10) ||
    selected.some((item) => date < item.foundAt.slice(0, 10)) ||
    !staff.trim() ||
    !facility.trim()
  )
    throw new Error("引き渡し日・施設名・担当者を確認してください。");
  return {
    id: `handover-${date}-${ids.join("-")}`,
    date,
    staff,
    facility,
    items: structuredClone(selected),
  };
}

export function completeHandover(items: Item[], record: Handover, now: string): Item[] {
  return items.map((item) =>
    record.items.some((row) => row.id === item.id)
      ? transition(item, "引き渡し済み", now, `${record.date} 警察へ引き渡し／${record.staff}`)
      : item,
  );
}

export function disposeItem(item: Item, settings: Settings, now: string): Item {
  if (
    settings.retention[item.category].action !== "施設で処分" ||
    deadline(item, settings) >= now.slice(0, 10) ||
    item.valuable
  )
    throw new Error("処分対象の期限切れ品だけを処理できます。貴重品は警察へ引き渡してください。");
  return transition(item, "処分済み", now, "施設の運用に従い処分");
}
