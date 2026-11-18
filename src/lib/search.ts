import type { Item, Query, Inquiry } from "./types";
import { dayDifference } from "./dates";

export function scoreMatch(item: Item, query: Query) {
  let score = 0;
  const reasons: string[] = [];
  if (query.category && item.category === query.category) {
    score += 30;
    reasons.push("分類一致 +30");
  }
  const sameColors = query.colors.filter((color) => item.colors.includes(color));
  if (sameColors.length) {
    score += 20;
    reasons.push(`色一致（${sameColors.join("・")}）+20`);
  }
  if (query.from || query.to) {
    const date = item.foundAt.slice(0, 10);
    const from = query.from || query.to;
    const to = query.to || query.from;
    const gap = date < from ? dayDifference(date, from) : date > to ? dayDifference(to, date) : 0;
    if (gap === 0) {
      score += 20;
      reasons.push("日付範囲内 +20");
    } else if (gap <= 2) {
      score += 10;
      reasons.push("日付が近い +10");
    }
  }
  if (query.location && item.location === query.location) {
    score += 15;
    reasons.push("場所一致 +15");
  } else if (query.location && item.location.slice(0, 2) === query.location.slice(0, 2)) {
    score += 5;
    reasons.push("同じフロア +5");
  }
  const words = [
    ...new Set(
      query.words
        .normalize("NFKC")
        .toLowerCase()
        .split(/[\s、,]+/)
        .filter(Boolean),
    ),
  ];
  const haystack = `${item.features} ${item.brand} ${item.contents}`
    .normalize("NFKC")
    .toLowerCase();
  const matches = words.filter((word) => haystack.includes(word));
  if (matches.length) {
    const points = Math.round((15 * matches.length) / words.length);
    score += points;
    reasons.push(`特徴語「${matches.join("・")}」+${points}`);
  }
  return { item, score, reasons };
}

export function findMatches(items: Item[], query: Query) {
  return items
    .filter((item) => item.status === "保管中")
    .map((item) => scoreMatch(item, query))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || b.item.foundAt.localeCompare(a.item.foundAt));
}

export function possibleMatches(items: Item[], inquiries: Inquiry[]) {
  return inquiries
    .filter((inquiry) => inquiry.result === "該当なし")
    .flatMap((inquiry) =>
      findMatches(
        items.filter((item) => item.registeredAt > inquiry.at),
        inquiry.query,
      )
        .filter((match) => match.score >= 65)
        .map((match) => ({ inquiry, ...match })),
    );
}
