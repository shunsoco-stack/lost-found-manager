import type { Item } from "./types";

export function csvCell(value: unknown): string {
  let text = String(value ?? "");
  if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function itemRows(items: Item[]): string[][] {
  return items.map((item) => [
    item.number,
    item.foundAt.replace("T", " "),
    `${item.location} ${item.locationDetail}`,
    item.category,
    `${item.colors.join("・")} ${item.brand} ${item.features}`,
    `${item.contents}／現金${item.cash}円・カード${item.cards}枚`,
    item.finder === "スタッフ" ? "スタッフ拾得" : item.waived ? "権利放棄する" : "権利放棄しない",
    item.storage,
    item.status,
  ]);
}

export function itemsCsv(items: Item[]): string {
  return (
    "\uFEFF" +
    [
      [
        "受付番号",
        "拾得日時",
        "拾得場所",
        "分類",
        "特徴",
        "中身の概要",
        "権利放棄",
        "保管場所",
        "状態",
      ],
      ...itemRows(items),
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n")
  );
}

export function csvFilename(kind: "items" | "handover", from: string, to: string): string {
  return kind === "items" ? `拾得物一覧_${from}_${to}.csv` : `警察引き渡しリスト_${to}.csv`;
}

export function downloadFile(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
