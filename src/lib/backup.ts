import type { Store, Backup } from "./types";
import { validateStore } from "./validation";

export function imageKeys(data: Store): string[] {
  return [
    ...new Set(
      [...data.items, ...data.handovers.flatMap((record) => record.items)].flatMap((item) => [
        ...item.photos,
        ...(item.returned ? [item.returned.signature] : []),
      ]),
    ),
  ];
}

export function validateBackup(value: unknown): value is Backup {
  if (!value || typeof value !== "object") return false;
  const backup = value as Backup;
  if (
    backup.format !== "lfm-backup" ||
    backup.version !== 1 ||
    !validateStore(backup.data) ||
    !backup.images ||
    typeof backup.images !== "object" ||
    Array.isArray(backup.images)
  )
    return false;
  const keys = imageKeys(backup.data);
  return (
    Object.keys(backup.images).length === keys.length &&
    keys.every(
      (key) =>
        typeof backup.images[key] === "string" &&
        backup.images[key].length < 15000000 &&
        /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(backup.images[key]),
    )
  );
}

export function parseBackup(text: string): Backup {
  if (text.length > 100 * 1024 * 1024) throw new Error("バックアップは100MB以下にしてください。");
  const value: unknown = JSON.parse(text);
  if (!validateBackup(value))
    throw new Error("バックアップの形式・項目・写真が不正です。現在のデータは変更していません。");
  return value;
}
