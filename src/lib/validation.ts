import { categories, colors, statuses } from "./types";
import type { Store, Item, Settings, Query } from "./types";
import { validDate, validDateTime } from "./dates";
import { validReturn } from "./returns";
import { isValuable } from "./items";

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.length <= 10000;
}

function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 100 && value.every(text);
}

function validSettings(value: unknown): value is Settings {
  if (!object(value) || !text(value.facility) || !value.facility.trim() || !object(value.retention))
    return false;
  if (
    ![value.locations, value.storage, value.staff].every(
      (list) => strings(list) && list.length > 0 && list.every((entry) => entry.trim().length > 0),
    )
  )
    return false;
  const retention = value.retention;
  return categories.every((category) => {
    const rule = retention[category];
    return (
      object(rule) &&
      Number.isInteger(rule.days) &&
      Number(rule.days) >= 1 &&
      Number(rule.days) <= 365 &&
      ["警察へ引き渡し", "施設で処分"].includes(String(rule.action))
    );
  });
}

export function validItem(value: unknown): value is Item {
  if (!object(value)) return false;
  if (
    ![
      "id",
      "number",
      "location",
      "locationDetail",
      "finderName",
      "finderContact",
      "brand",
      "features",
      "contents",
      "storage",
    ].every((key) => text(value[key]))
  )
    return false;
  if (!value.id || !value.features || !/^L-\d{4}-\d{3,}$/.test(String(value.number))) return false;
  if (
    !validDateTime(value.foundAt) ||
    !validDateTime(value.registeredAt) ||
    value.registeredAt < value.foundAt
  )
    return false;
  if (
    !categories.some((category) => category === value.category) ||
    !statuses.some((status) => status === value.status) ||
    !["来館者", "スタッフ"].includes(String(value.finder))
  )
    return false;
  if (
    typeof value.waived !== "boolean" ||
    typeof value.valuable !== "boolean" ||
    !strings(value.colors) ||
    !value.colors.every((color) => colors.includes(color)) ||
    !strings(value.photos)
  )
    return false;
  if (
    typeof value.cash !== "number" ||
    !Number.isFinite(value.cash) ||
    value.cash < 0 ||
    !Number.isInteger(value.cards) ||
    Number(value.cards) < 0
  )
    return false;
  if (
    !Array.isArray(value.history) ||
    !value.history.length ||
    !value.history.every(
      (event) =>
        object(event) &&
        validDateTime(event.at) &&
        text(event.text) &&
        event.at >= String(value.foundAt),
    )
  )
    return false;
  if (value.valuable !== isValuable(value as unknown as Item)) return false;
  return value.status === "返却済み"
    ? validReturn(value.returned) && value.returned.at >= value.foundAt
    : value.returned === undefined;
}

function validQuery(value: unknown): value is Query {
  return (
    object(value) &&
    (value.from === "" || validDate(value.from)) &&
    (value.to === "" || validDate(value.to)) &&
    (!value.from || !value.to || String(value.from) <= String(value.to)) &&
    text(value.location) &&
    text(value.words) &&
    (value.category === "" || categories.some((category) => category === value.category)) &&
    strings(value.colors) &&
    value.colors.every((color) => colors.includes(color))
  );
}

export function validateStore(value: unknown): value is Store {
  if (!object(value) || value.version !== 1 || !validSettings(value.settings)) return false;
  if (!Array.isArray(value.items) || value.items.length > 10000 || !value.items.every(validItem))
    return false;
  if (
    new Set(value.items.map((item) => item.id)).size !== value.items.length ||
    new Set(value.items.map((item) => item.number)).size !== value.items.length
  )
    return false;
  const items = value.items;
  if (
    !Array.isArray(value.inquiries) ||
    value.inquiries.length > 10000 ||
    !value.inquiries.every(
      (inquiry) =>
        object(inquiry) &&
        text(inquiry.id) &&
        validDateTime(inquiry.at) &&
        text(inquiry.name) &&
        text(inquiry.contact) &&
        text(inquiry.content) &&
        ["見つかった", "該当なし", "後日連絡"].includes(String(inquiry.result)) &&
        validQuery(inquiry.query) &&
        (inquiry.itemId === undefined || items.some((item: Item) => item.id === inquiry.itemId)),
    )
  )
    return false;
  if (new Set(value.inquiries.map((inquiry) => inquiry.id)).size !== value.inquiries.length)
    return false;
  return (
    Array.isArray(value.handovers) &&
    new Set(value.handovers.map((record) => (object(record) ? record.id : undefined))).size ===
      value.handovers.length &&
    value.handovers.every(
      (record) =>
        object(record) &&
        text(record.id) &&
        validDate(record.date) &&
        text(record.staff) &&
        text(record.facility) &&
        Array.isArray(record.items) &&
        record.items.length > 0 &&
        record.items.every(validItem) &&
        new Set(record.items.map((item: Item) => item.id)).size === record.items.length &&
        record.items.every(
          (item: Item) =>
            item.foundAt.slice(0, 10) <= String(record.date) &&
            items.some((stored: Item) => stored.id === item.id && stored.status === "引き渡し済み"),
        ),
    )
  );
}
