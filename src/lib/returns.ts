import type { Item, ReturnRecord } from "./types";
import { documents } from "./types";
import { transition } from "./items";
import { validDateTime } from "./dates";

export function validReturn(value: unknown): value is ReturnRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as ReturnRecord;
  const keys = ["document", "matched", "answer", "recipient", "at", "staff", "signature"];
  return (
    Object.keys(value).length === keys.length &&
    Object.keys(value).every((key) => keys.includes(key)) &&
    documents.some((document) => document === record.document) &&
    record.matched === true &&
    [record.answer, record.recipient, record.staff, record.signature].every(
      (text) => typeof text === "string" && text.trim().length > 0,
    ) &&
    validDateTime(record.at)
  );
}

export function returnItem(item: Item, record: ReturnRecord, now: string): Item {
  if (!validReturn(record))
    throw new Error(
      "本人確認・特徴の一致・氏名・スタッフ・署名を確認してください。書類番号は保存できません。",
    );
  if (record.at > now) throw new Error("受取日時は現在以前にしてください。");
  return {
    ...transition(item, "返却済み", record.at, `${record.staff}が本人確認のうえ返却`),
    returned: record,
  };
}
