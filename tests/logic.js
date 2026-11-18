import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const test = require("node:test");
const assert = require("node:assert/strict");
const { createSeed, defaultSettings } = require("../src/lib/seed.ts");
const { nextNumber, transition, isValuable, validateItemInput } = require("../src/lib/items.ts");
const {
  addDays,
  dayDifference,
  japanDateTime,
  validDate,
  validDateTime,
} = require("../src/lib/dates.ts");
const { scoreMatch, findMatches, possibleMatches } = require("../src/lib/search.ts");
const { returnItem, validReturn } = require("../src/lib/returns.ts");
const {
  deadline,
  urgency,
  paginate,
  makeHandover,
  completeHandover,
  disposeItem,
} = require("../src/lib/retention.ts");
const { resizedDimensions } = require("../src/lib/photos.ts");
const { csvCell, itemsCsv, csvFilename } = require("../src/lib/csv.ts");

const now = "2026-11-18T15:00";
const seed = createSeed(new Date("2026-11-18T06:00:00Z"));
const item = {
  ...seed.items.find((row) => row.id === "demo-14"),
  foundAt: "2026-11-17T12:15",
  registeredAt: "2026-11-17T12:16",
};
const query = {
  from: "2026-11-17",
  to: "2026-11-18",
  location: item.location,
  category: item.category,
  colors: item.colors,
  words: "丸い 金具",
};

for (const [date, expected] of [
  ["2026-11-18", "L-2611-001"],
  ["2026-12-01", "L-2612-001"],
  ["2027-01-01", "L-2701-001"],
]) {
  test(`採番：空の台帳 ${date}`, () => assert.equal(nextNumber([], date), expected));
}

test("採番：削除の穴を埋めず最大値に加算", () =>
  assert.equal(
    nextNumber([{ number: "L-2611-001" }, { number: "L-2611-009" }], now),
    "L-2611-010",
  ));
test("採番：前月の番号を引き継がない", () =>
  assert.equal(nextNumber([{ number: "L-2610-999" }], now), "L-2611-001"));
test("採番：1000件目でも桁を失わない", () =>
  assert.equal(nextNumber([{ number: "L-2611-999" }], now), "L-2611-1000"));

for (const [date, offset, expected] of [
  ["2026-01-31", 1, "2026-02-01"],
  ["2026-12-31", 1, "2027-01-01"],
  ["2028-02-28", 1, "2028-02-29"],
  ["2026-03-01", -1, "2026-02-28"],
  ["2027-01-01", -7, "2026-12-25"],
]) {
  test(`日付加算：${date} ${offset}`, () => assert.equal(addDays(date, offset), expected));
}

test("日本時間への変換はUTCの日付境界を越える", () =>
  assert.equal(japanDateTime(new Date("2026-11-18T15:03:00Z")), "2026-11-19T00:03"));
test("日付差分は時刻を無視する", () =>
  assert.equal(dayDifference("2026-11-18T23:00", "2026-11-19T00:01"), 1));
test("存在しない暦日を拒否", () => assert.equal(validDate("2026-02-30"), false));
test("存在しない時刻を拒否", () => assert.equal(validDateTime("2026-11-18T25:00"), false));

test("照合：全条件一致で100点", () => assert.equal(scoreMatch(item, query).score, 100));
test("照合：一致理由が5条件分ある", () => assert.equal(scoreMatch(item, query).reasons.length, 5));
test("照合：分類一致の理由", () =>
  assert.ok(scoreMatch(item, query).reasons.includes("分類一致 +30")));
test("照合：色一致の理由", () =>
  assert.ok(scoreMatch(item, query).reasons.some((reason) => reason.includes("色一致"))));
test("照合：日付範囲内の理由", () =>
  assert.ok(scoreMatch(item, query).reasons.includes("日付範囲内 +20")));
test("照合：日付2日差は近接点", () =>
  assert.ok(
    scoreMatch(item, { ...query, from: "2026-11-19", to: "2026-11-19" }).reasons.includes(
      "日付が近い +10",
    ),
  ));
test("照合：日付3日差は加点なし", () =>
  assert.equal(scoreMatch(item, { ...query, from: "2026-11-20", to: "2026-11-20" }).score, 80));
test("照合：別分類は減点ではなく加点なし", () =>
  assert.equal(scoreMatch(item, { ...query, category: "傘" }).score, 70));
test("照合：検索語重複は得点を増やさない", () =>
  assert.equal(scoreMatch(item, { ...query, words: "丸い 丸い 金具" }).score, 100));
test("照合：空条件は0点", () =>
  assert.equal(
    scoreMatch(item, { from: "", to: "", location: "", category: "", colors: [], words: "" }).score,
    0,
  ));
test("照合：順位が高い一致から並ぶ", () => {
  const rows = findMatches([{ ...item, id: "less", category: "傘" }, item], query);
  assert.equal(rows[0].item.id, item.id);
  assert.ok(rows[0].score > rows[1].score);
});
test("照合：返却済みは候補にしない", () =>
  assert.equal(findMatches([{ ...item, status: "返却済み" }], query).length, 0));
test("自動照合：問い合わせ後の新着のみ", () => {
  const inquiries = [{ id: "q", result: "該当なし", at: "2026-11-17T12:15", query }];
  assert.equal(possibleMatches([item], inquiries).length, 1);
  assert.equal(
    possibleMatches([{ ...item, registeredAt: "2026-11-17T12:14" }], inquiries).length,
    0,
  );
});
test("自動照合：見つかった問い合わせは通知しない", () =>
  assert.equal(
    possibleMatches([item], [{ id: "q", result: "見つかった", at: "2026-11-16T12:00", query }])
      .length,
    0,
  ));
test("自動照合：弱い一致は通知しない", () =>
  assert.equal(
    possibleMatches(
      [item],
      [
        {
          id: "q",
          result: "該当なし",
          at: "2026-11-16T12:00",
          query: { ...query, category: "", colors: [], words: "" },
        },
      ],
    ).length,
    0,
  ));

for (const [today, expected] of [
  ["2026-11-24", "3日以内"],
  ["2026-11-25", "期限切れ"],
  ["2026-11-21", "3日以内"],
  ["2026-11-20", "余裕あり"],
]) {
  test(`期限：境界 ${today}`, () =>
    assert.equal(urgency(item, defaultSettings(), today), expected));
}

test("期限：月末を越える", () =>
  assert.equal(
    deadline({ ...item, foundAt: "2026-11-29T14:00" }, defaultSettings()),
    "2026-12-06",
  ));
test("期限：年末を越える", () =>
  assert.equal(
    deadline({ ...item, foundAt: "2026-12-29T14:00" }, defaultSettings()),
    "2027-01-05",
  ));

for (const status of ["返却済み", "引き渡し済み", "処分済み"]) {
  test(`状態遷移：保管中から${status}`, () =>
    assert.equal(transition(item, status, now, "処理").status, status));
  for (const next of ["保管中", "返却済み", "引き渡し済み", "処分済み"])
    test(`禁止遷移：${status}から${next}`, () =>
      assert.throws(() => transition({ ...item, status }, next, now, "二重処理")));
}

test("禁止遷移：拾得前の処理", () =>
  assert.throws(() => transition(item, "返却済み", "2026-11-16T00:00", "処理")));
test("登録：未来の拾得を拒否", () =>
  assert.throws(() => validateItemInput({ ...item, foundAt: "2026-11-19T13:00" }, now)));
test("登録：負の金額を拒否", () =>
  assert.throws(() => validateItemInput({ ...item, cash: -1 }, now)));
test("登録：カードの小数枚数を拒否", () =>
  assert.throws(() => validateItemInput({ ...item, cards: 1.5 }, now)));
test("貴重品：現金入りのバッグ", () =>
  assert.equal(isValuable({ category: "バッグ", cash: 10, cards: 0 }), true));
test("貴重品：普通の傘は対象外", () =>
  assert.equal(isValuable({ category: "傘", cash: 0, cards: 0 }), false));

const returned = {
  document: "運転免許証",
  matched: true,
  answer: "丸い金具",
  recipient: "架空 花",
  at: now,
  staff: "水野",
  signature: "sig",
};

test("返却：本人確認がそろえば記録", () =>
  assert.equal(returnItem(item, returned, now).status, "返却済み"));
test("返却：書類番号の追加を拒否", () =>
  assert.equal(validReturn({ ...returned, documentNumber: "123" }), false));
test("返却：番号を持つフィールドがない", () =>
  assert.deepEqual(Object.keys(returnItem(item, returned, now).returned).sort(), [
    "answer",
    "at",
    "document",
    "matched",
    "recipient",
    "signature",
    "staff",
  ]));
for (const field of ["document", "answer", "recipient", "staff", "signature"])
  test(`返却：${field}欠落を拒否`, () =>
    assert.throws(() => returnItem(item, { ...returned, [field]: "" }, now)));
test("返却：特徴不一致を拒否", () =>
  assert.throws(() => returnItem(item, { ...returned, matched: false }, now)));
test("返却：未来の受取日時を拒否", () =>
  assert.throws(() => returnItem(item, { ...returned, at: "2026-11-19T00:00" }, now)));
test("返却：二重返却を拒否", () =>
  assert.throws(() => returnItem(returnItem(item, returned, now), returned, now)));

for (const [count, pages] of [
  [0, 0],
  [1, 1],
  [5, 1],
  [6, 2],
  [11, 3],
])
  test(`印刷ページ割り：${count}件`, () =>
    assert.equal(paginate(Array.from({ length: count })).length, pages));
test("印刷ページ割り：全行を一度だけ出力", () => {
  const rows = Array.from({ length: 13 }, (_, index) => index);
  assert.deepEqual(paginate(rows).flat(), rows);
});
test("印刷ページ割り：不正な件数を拒否", () => assert.throws(() => paginate([item], 0)));
test("引き渡し：対象だけを更新", () => {
  const record = makeHandover([item], [item.id], "2026-11-18", "水野", "施設", now);
  const rows = completeHandover([item, { ...item, id: "other" }], record, now);
  assert.equal(rows[0].status, "引き渡し済み");
  assert.equal(rows[1].status, "保管中");
});
test("引き渡し：リストは編集前のスナップショット", () => {
  const copy = structuredClone(item);
  const record = makeHandover([copy], [copy.id], "2026-11-18", "水野", "施設", now);
  copy.features = "編集";
  assert.notEqual(record.items[0].features, copy.features);
});
test("引き渡し：空選択を拒否", () =>
  assert.throws(() => makeHandover([item], [], "2026-11-18", "水野", "施設", now)));
test("引き渡し：未来日を拒否", () =>
  assert.throws(() => makeHandover([item], [item.id], "2026-11-19", "水野", "施設", now)));
test("引き渡し：重複選択を拒否", () =>
  assert.throws(() => makeHandover([item], [item.id, item.id], "2026-11-18", "水野", "施設", now)));
test("処分：貴重品は拒否", () => assert.throws(() => disposeItem(item, defaultSettings(), now)));
test("処分：期限切れの傘は処理可能", () =>
  assert.equal(
    disposeItem(
      { ...item, category: "傘", valuable: false, foundAt: "2026-10-01T12:00" },
      defaultSettings(),
      now,
    ).status,
    "処分済み",
  ));
test("処分：期限当日はまだ拒否", () =>
  assert.throws(() =>
    disposeItem(
      { ...item, category: "傘", valuable: false, foundAt: "2026-11-04T12:00" },
      defaultSettings(),
      now,
    ),
  ));

for (const [width, height, expected] of [
  [3200, 2000, { width: 1600, height: 1000 }],
  [1200, 2400, { width: 800, height: 1600 }],
  [500, 300, { width: 500, height: 300 }],
  [1600, 1600, { width: 1600, height: 1600 }],
])
  test(`写真：${width}x${height}`, () =>
    assert.deepEqual(resizedDimensions(width, height), expected));
test("写真：ゼロサイズを拒否", () => assert.throws(() => resizedDimensions(0, 100)));
test("CSV：BOM付き", () => assert.equal(itemsCsv([item]).charCodeAt(0), 0xfeff));
test("CSV：改行と引用符を保持", () => assert.equal(csvCell('a,"b"\nc'), '"a,""b""\nc"'));
test("CSV：数式の実行を抑止", () => assert.equal(csvCell("=1+1"), '"\'=1+1"'));
test("CSV：一覧ファイル名", () =>
  assert.equal(
    csvFilename("items", "2026-11-01", "2026-11-18"),
    "拾得物一覧_2026-11-01_2026-11-18.csv",
  ));
test("CSV：引き渡しファイル名", () =>
  assert.equal(csvFilename("handover", "", "2026-11-18"), "警察引き渡しリスト_2026-11-18.csv"));
