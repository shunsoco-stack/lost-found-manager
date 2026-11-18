import { categories } from "./types";
import type { Store, Settings, Item } from "./types";
import { japanDateTime, addDays } from "./dates";
import { isValuable, nextNumber } from "./items";
import { catalog, names } from "./seed-catalog";
import { createSeedInquiries } from "./seed-inquiries";

export function defaultSettings(): Settings {
  return {
    facility: "（架空）みなとみらいテラス 2F総合案内",
    locations: [
      "1F 正面入口",
      "1F フードコート",
      "1F 食品売場",
      "2F 総合案内",
      "2F カフェ",
      "2F 書店",
      "2F 化粧室",
      "3F シネマ",
      "3F キッズ広場",
      "B1 駐車場",
    ],
    storage: ["受付裏 棚B-2", "受付裏 傘ラック", "事務室 金庫A", "受付裏 衣類ボックス"],
    staff: ["水野", "倉持", "藤岡", "成瀬", "岸本"],
    retention: Object.fromEntries(
      categories.map((category) => [
        category,
        {
          days: ["傘", "衣類・帽子"].includes(category) ? 14 : 7,
          action: ["傘", "衣類・帽子"].includes(category) ? "施設で処分" : "警察へ引き渡し",
        },
      ]),
    ) as Settings["retention"],
  };
}

function randomGenerator(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function createSeed(now: Date): Store {
  const current = japanDateTime(now);
  const today = current.slice(0, 10);
  const settings = defaultSettings();
  const random = randomGenerator(Number(today.replaceAll("-", "")));
  const choose = <T>(values: T[]): T => values[Math.floor(random() * values.length)];
  const recentAges = [18, 17, 10, 9, 12, 5, 4, 1, 1, 2, 3, 1, 2, 1, 0, 1, 2, 3];
  const rainyDays = [8, 16, 23, 31, 38];
  const olderDays: number[] = [];
  for (let age = 8; age <= 41; age++) {
    olderDays.push(age);
    if ([0, 6].includes(new Date(addDays(today, -age)).getUTCDay())) olderDays.push(age, age);
  }
  const items: Item[] = [];
  catalog.forEach((entry, index) => {
    const age =
      index < 18
        ? recentAges[index]
        : index >= 55
          ? choose(olderDays.filter((days) => days >= 16))
          : entry.category === "傘" && random() < 0.7
            ? choose(rainyDays)
            : choose(olderDays);
    let day = addDays(today, -age);
    const location = choose(settings.locations);
    const closing = location === "3F シネマ" ? 22 * 60 + 30 : 21 * 60;
    const minutes = 10 * 60 + Math.floor(random() * (closing - 10 * 60 + 1));
    const hour = Math.floor(minutes / 60);
    const minute = minutes - hour * 60;
    let foundAt = `${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const delay = 3 + Math.floor(random() * 58);
    let registeredAt = new Date(Date.parse(`${foundAt}:00Z`) + delay * 60000)
      .toISOString()
      .slice(0, 16);
    if (registeredAt >= current) {
      day = addDays(day, -1);
      foundAt = `${day}${foundAt.slice(10)}`;
      registeredAt = `${addDays(registeredAt, -1)}${registeredAt.slice(10)}`;
    }
    const status =
      index < 18 ? "保管中" : index < 46 ? "返却済み" : index < 55 ? "引き渡し済み" : "処分済み";
    const valuable = isValuable({ category: entry.category, cash: 0, cards: 0 });
    const item: Item = {
      id: `demo-${index + 1}`,
      number: nextNumber(items, foundAt),
      foundAt,
      registeredAt,
      location,
      locationDetail: choose([
        "ベンチの座面",
        "通路の壁際",
        "カウンター付近",
        "入口の右側",
        "椅子の下",
        "エスカレーター横",
      ]),
      finder: random() < 0.55 ? "スタッフ" : "来館者",
      finderName: "",
      finderContact: "",
      waived: random() < 0.8,
      category: entry.category,
      colors: [entry.color],
      brand: "",
      features: entry.features,
      contents: entry.category === "バッグ" ? "小さなタオルと未開封の菓子" : "外観のみ確認",
      cash: entry.category === "財布・カード類" ? choose([1200, 3450, 8600]) : 0,
      cards: entry.category === "財布・カード類" ? choose([2, 3, 5]) : 0,
      storage: valuable
        ? settings.storage[2]
        : entry.category === "傘"
          ? settings.storage[1]
          : entry.category === "衣類・帽子"
            ? settings.storage[3]
            : settings.storage[0],
      photos: [`photo-demo-${index + 1}`],
      valuable,
      status,
      history: [
        { at: registeredAt, text: `${entry.features}を${choose(settings.staff)}が受け付け` },
      ],
    };
    if (status === "返却済み") {
      const returnMinutes = 10 * 60 + Math.floor(random() * 660);
      const at = `${addDays(day, 1)}T${String(Math.floor(returnMinutes / 60)).padStart(2, "0")}:${String(returnMinutes % 60).padStart(2, "0")}`;
      item.returned = {
        at,
        document: "運転免許証",
        matched: true,
        answer: entry.features,
        recipient: names[index - 18],
        staff: choose(settings.staff),
        signature: `sign-demo-${index + 1}`,
      };
      item.history.push({
        at,
        text: `${entry.features}の申告を確認し、${item.returned.recipient}へ返却`,
      });
    }
    if (status === "処分済み")
      item.history.push({
        at: `${addDays(today, -1)}T15:42`,
        text: `${entry.features}：施設で処分を記録`,
      });
    if (status === "引き渡し済み")
      item.history.push({
        at: `${addDays(today, -2)}T14:35`,
        text: `${entry.features}を警察への引き渡し台帳に記載`,
      });
    items.push(item);
  });
  const chronological = [...items].sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));
  const numbered: Item[] = [];
  for (const item of chronological) {
    item.number = nextNumber(numbered, item.registeredAt);
    numbered.push(item);
  }
  const inquiries = createSeedInquiries(items, random, current);
  return {
    version: 1,
    settings,
    items: items.sort((a, b) => b.foundAt.localeCompare(a.foundAt)),
    inquiries: inquiries.sort((a, b) => b.at.localeCompare(a.at)),
    handovers: [
      {
        id: "handover-demo",
        date: addDays(today, -2),
        staff: "倉持",
        facility: settings.facility,
        items: items
          .filter((item) => item.status === "引き渡し済み")
          .map((item) => ({ ...item, status: "保管中" })),
      },
    ],
  };
}
