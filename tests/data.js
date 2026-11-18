import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createSeed } = require("../src/lib/seed.ts");
const { japanDateTime, dayDifference } = require("../src/lib/dates.ts");
const { urgency } = require("../src/lib/retention.ts");
const { possibleMatches, findMatches } = require("../src/lib/search.ts");
const { validateStore } = require("../src/lib/validation.ts");
const { imageKeys, parseBackup, validateBackup } = require("../src/lib/backup.ts");

const moments = [
  "2026-11-18T14:30:00+09:00",
  "2026-11-18T00:10:00+09:00",
  "2026-11-18T23:50:00+09:00",
  "2027-01-02T10:00:00+09:00",
  "2026-11-18T00:03:00+09:00",
  "2026-11-18T08:15:00+09:00",
  "2026-11-18T12:40:00+09:00",
  "2026-11-18T23:59:00+09:00",
  "2027-01-01T00:02:00+09:00",
  "2026-11-30T12:00:00+09:00",
  "2026-11-21T17:00:00+09:00",
  "2026-11-22T17:00:00+09:00",
  "2028-03-01T00:01:00+09:00",
];

for (const moment of moments) {
  const current = japanDateTime(new Date(moment));
  const seed = createSeed(new Date(moment));
  test(`シード件数：${moment}`, () => {
    assert.ok(seed.items.length >= 50 && seed.items.length <= 70);
    assert.ok(seed.inquiries.length >= 20 && seed.inquiries.length <= 30);
    assert.ok(seed.settings.locations.length >= 10);
    assert.equal(seed.settings.staff.length, 5);
    assert.equal(seed.handovers.length, 1);
  });
  test(`シードの保管状態と期限：${moment}`, () => {
    const holding = seed.items.filter((item) => item.status === "保管中");
    assert.ok(holding.length >= 15 && holding.length <= 20);
    const expired = holding.filter(
      (item) => urgency(item, seed.settings, current.slice(0, 10)) === "期限切れ",
    );
    const soon = holding.filter(
      (item) => urgency(item, seed.settings, current.slice(0, 10)) === "3日以内",
    );
    assert.ok(expired.length >= 3 && expired.length <= 5, `expired ${expired.length}`);
    assert.ok(soon.length >= 2 && soon.length <= 4, `soon ${soon.length}`);
  });
  test(`シードの全記録が現在より前：${moment}`, () => {
    for (const item of seed.items) {
      assert.ok(item.foundAt < current);
      assert.ok(item.registeredAt < current);
      for (const event of item.history) {
        assert.ok(event.at < current);
        assert.ok(event.at >= item.foundAt);
      }
      if (item.returned) assert.ok(item.returned.at < current && item.returned.at >= item.foundAt);
    }
    assert.ok(seed.inquiries.every((inquiry) => inquiry.at < current));
    assert.ok(seed.handovers.every((record) => record.date < current.slice(0, 10)));
  });
  test(`シードの形式と自動通知：${moment}`, () => {
    assert.equal(validateStore(seed), true);
    assert.ok(possibleMatches(seed.items, seed.inquiries).length >= 1);
  });
  test(`問い合わせ文は独自で重複なし：${moment}`, () => {
    assert.equal(new Set(seed.inquiries.map((row) => row.content)).size, seed.inquiries.length);
    for (const row of seed.inquiries)
      assert.ok(seed.items.every((item) => !row.content.includes(item.features)));
  });
  test(`問い合わせ者名は重複なし：${moment}`, () => {
    const names = seed.inquiries.map((row) => row.name).filter(Boolean);
    assert.equal(new Set(names).size, names.length);
  });
  test(`登録は拾得の3分〜1時間後：${moment}`, () => {
    for (const item of seed.items) {
      const gap = (Date.parse(item.registeredAt) - Date.parse(item.foundAt)) / 60000;
      assert.ok(gap >= 3 && gap <= 60);
      assert.equal(item.history[0].at, item.registeredAt);
    }
    assert.ok(
      seed.items.filter((item) => item.registeredAt > item.foundAt).length >=
        seed.items.length * 0.8,
    );
  });
  test(`拾得は施設の営業時間内：${moment}`, () => {
    for (const item of seed.items) {
      const time = item.foundAt.slice(11);
      assert.ok(time >= "10:00" && time <= (item.location === "3F シネマ" ? "22:30" : "21:00"));
    }
  });
  test(`今日の問い合わせと保管中の照合候補：${moment}`, () => {
    const today = seed.inquiries.filter((row) => row.at.startsWith(current.slice(0, 10)));
    assert.ok(today.length >= 1 && today.length <= 2);
    assert.ok(today.every((row) => row.at < current));
    assert.ok(
      today.some((row) =>
        findMatches(seed.items, row.query).some(
          (match) => match.item.id === "demo-14" && match.score >= 65,
        ),
      ),
    );
  });
  test(`紛失申告から数時間〜3日後の問い合わせと1〜3日の期間：${moment}`, () => {
    const spans = new Set();
    const delays = new Set();
    for (const row of seed.inquiries) {
      const span = dayDifference(row.query.from, row.query.to) + 1;
      spans.add(span);
      assert.ok(span >= 1 && span <= 3);
      const lostAt = row.content.match(/紛失日時：(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/);
      assert.ok(lostAt);
      const hours =
        (Date.parse(`${row.at}:00Z`) - Date.parse(`${lostAt[1]}T${lostAt[2]}:00Z`)) / 3600000;
      assert.ok(hours >= 2 && hours <= 72, `${row.id}: ${hours}`);
      delays.add(hours);
    }
    assert.deepEqual([...spans].sort(), [1, 2, 3]);
    assert.ok(delays.size >= 10);
  });
  test(`未照合の対応状況と警察への引き渡し対象：${moment}`, () => {
    assert.ok(
      seed.inquiries.some(
        (row) => row.result === "後日連絡" && row.contact.includes("折り返し待ち"),
      ),
    );
    assert.ok(seed.inquiries.some((row) => row.contact.includes("後日来館予定")));
    assert.ok(
      seed.items.filter(
        (item) =>
          item.status === "保管中" &&
          seed.settings.retention[item.category].action === "警察へ引き渡し" &&
          urgency(item, seed.settings, current) === "期限切れ",
      ).length >= 2,
    );
    for (const record of seed.handovers)
      for (const item of record.items) {
        assert.ok(item.foundAt < current && item.registeredAt < current);
        assert.ok(item.history.every((event) => event.at < current));
      }
  });
}

const sample = createSeed(new Date("2026-11-18T12:40:00+09:00"));

test("年始の00:00ちょうどは今日の問い合わせを捏造しない", () => {
  const current = "2027-01-01T00:00";
  const seed = createSeed(new Date(`${current}:00+09:00`));
  assert.ok(seed.inquiries.every((row) => row.at < current));
  assert.ok(
    seed.items.every(
      (item) =>
        item.foundAt < current &&
        item.registeredAt < current &&
        item.history.every((event) => event.at < current),
    ),
  );
  assert.equal(seed.inquiries.filter((row) => row.at.startsWith("2027-01-01")).length, 0);
});

test("0時台は今日の拾得0件、昨日には記録あり", () => {
  const seed = createSeed(new Date("2026-11-18T00:03:00+09:00"));
  assert.equal(seed.items.filter((item) => item.foundAt.startsWith("2026-11-18")).length, 0);
  assert.ok(seed.items.filter((item) => item.foundAt.startsWith("2026-11-17")).length > 0);
});
test("特徴が60件すべて異なる", () =>
  assert.equal(new Set(sample.items.map((item) => item.features)).size, sample.items.length));
test("問い合わせ本文がすべて異なる", () =>
  assert.equal(
    new Set(sample.inquiries.map((inquiry) => inquiry.content)).size,
    sample.inquiries.length,
  ));
test("履歴コメントに同じ文がない", () => {
  const notes = sample.items.flatMap((item) => item.history.map((event) => event.text));
  assert.equal(new Set(notes).size, notes.length);
});
test("名前に定型の前置きがない", () =>
  assert.ok(sample.inquiries.every((inquiry) => !/さん[：:]/.test(inquiry.content))));
test("シードは配列の順送りを使わない", () => {
  const source = fs.readFileSync("src/lib/seed.ts", "utf8");
  assert.doesNotMatch(source, /index\s*%|%\s*\w+\.length/);
});
test("拾得時刻の分が多様", () =>
  assert.ok(new Set(sample.items.map((item) => item.foundAt.slice(14))).size > 20));
test("時刻の間隔が一定ではない", () => {
  const times = sample.items.map((item) => Date.parse(item.foundAt));
  assert.ok(new Set(times.slice(1).map((time, index) => times[index] - time)).size > 20);
});
test("拾得物に傘と衣類が多い", () =>
  assert.ok(
    sample.items.filter((item) => ["傘", "衣類・帽子"].includes(item.category)).length >= 30,
  ));
test("財布とスマホは多くが翌日までに返却済み", () => {
  const valuables = sample.items.filter((item) =>
    ["財布・カード類", "スマホ・電子機器"].includes(item.category),
  );
  assert.ok(
    valuables.filter((item) => item.returned && dayDifference(item.foundAt, item.returned.at) <= 1)
      .length >
      valuables.length / 2,
  );
});
test("拾得場所と人物は単純循環ではない", () => {
  const locations = sample.items.map((item) => item.location);
  for (const cycle of [2, 3, 5, 10])
    assert.ok(locations.slice(cycle).some((location, index) => location !== locations[index]));
});
test("施設とスタッフは架空", () => {
  assert.ok(sample.settings.facility.startsWith("（架空）"));
  assert.equal(new Set(sample.settings.staff).size, 5);
});
test("シードは再生成時点で日付が移る", () => {
  const next = createSeed(new Date("2027-02-12T12:00:00+09:00"));
  assert.notDeepEqual(
    sample.items.map((item) => item.foundAt),
    next.items.map((item) => item.foundAt),
  );
});

function backup() {
  return {
    format: "lfm-backup",
    version: 1,
    data: structuredClone(sample),
    images: Object.fromEntries(
      imageKeys(sample).map((key) => [key, "data:image/png;base64,aGVsbG8="]),
    ),
  };
}

test("バックアップ：正常な構造を復元", () =>
  assert.equal(parseBackup(JSON.stringify(backup())).data.items.length, 60));
test("バックアップ：JSON破損を拒否", () => assert.throws(() => parseBackup("{broken")));
test("バックアップ：写真を含む全キーを列挙", () => assert.equal(imageKeys(sample).length, 88));

const corruptions = [
  [
    "異なるバージョン",
    (value) => {
      value.version = 2;
    },
  ],
  [
    "異なる形式",
    (value) => {
      value.format = "unknown";
    },
  ],
  [
    "写真欠落",
    (value) => {
      delete value.images[Object.keys(value.images)[0]];
    },
  ],
  [
    "SVG混入",
    (value) => {
      value.images[Object.keys(value.images)[0]] = "data:image/svg+xml;base64,aGVsbG8=";
    },
  ],
  [
    "外部URL",
    (value) => {
      value.images[Object.keys(value.images)[0]] = "https://example.com/image.jpg";
    },
  ],
  [
    "不正なbase64",
    (value) => {
      value.images[Object.keys(value.images)[0]] = "data:image/png;base64,***";
    },
  ],
  [
    "ID重複",
    (value) => {
      value.data.items[1].id = value.data.items[0].id;
    },
  ],
  [
    "受付番号重複",
    (value) => {
      value.data.items[1].number = value.data.items[0].number;
    },
  ],
  [
    "分類不明",
    (value) => {
      value.data.items[0].category = "資産";
    },
  ],
  [
    "不正な状態",
    (value) => {
      value.data.items[0].status = "貸出中";
    },
  ],
  [
    "不正な日付",
    (value) => {
      value.data.items[0].foundAt = "2026-02-30T10:00";
    },
  ],
  [
    "負の金額",
    (value) => {
      value.data.items[0].cash = -10;
    },
  ],
  [
    "小数のカード枚数",
    (value) => {
      value.data.items[0].cards = 1.1;
    },
  ],
  [
    "期限0日",
    (value) => {
      value.data.settings.retention["傘"].days = 0;
    },
  ],
  [
    "期限過大",
    (value) => {
      value.data.settings.retention["傘"].days = 366;
    },
  ],
  [
    "場所リスト空",
    (value) => {
      value.data.settings.locations = [];
    },
  ],
  [
    "スタッフ空",
    (value) => {
      value.data.settings.staff = [];
    },
  ],
  [
    "書類番号の追加",
    (value) => {
      value.data.items.find((item) => item.returned).returned.number = "1234";
    },
  ],
  [
    "返却署名が空",
    (value) => {
      value.data.items.find((item) => item.returned).returned.signature = "";
    },
  ],
  [
    "状態と返却記録の不整合",
    (value) => {
      value.data.items.find((item) => item.returned).status = "保管中";
    },
  ],
  [
    "問い合わせ先の拾得物なし",
    (value) => {
      value.data.inquiries[0].itemId = "missing";
    },
  ],
  [
    "問い合わせの期間逆転",
    (value) => {
      value.data.inquiries[0].query.from = "2027-01-01";
      value.data.inquiries[0].query.to = "2026-01-01";
    },
  ],
  [
    "引き渡し日破損",
    (value) => {
      value.data.handovers[0].date = "bad";
    },
  ],
];

for (const [name, corrupt] of corruptions)
  test(`バックアップ拒否：${name}`, () => {
    const value = backup();
    corrupt(value);
    assert.equal(validateBackup(value), false);
    assert.throws(() => parseBackup(JSON.stringify(value)));
  });

for (const value of [null, [], {}, 1, "bad"])
  test(`保存データ拒否：${JSON.stringify(value)}`, () => assert.equal(validateStore(value), false));

for (const moment of moments) {
  test(`シードの問い合わせと処理の時系列：${moment}`, () => {
    const seed = createSeed(new Date(moment));
    for (const inquiry of seed.inquiries) {
      assert.ok(inquiry.query.to <= inquiry.at.slice(0, 10));
      if (inquiry.result === "見つかった") {
        const item = seed.items.find((row) => row.id === inquiry.itemId);
        assert.ok(item.registeredAt <= inquiry.at);
        assert.ok(inquiry.at <= item.returned.at);
        assert.ok(!inquiry.content.includes(item.features));
        assert.equal(inquiry.name, item.returned.recipient);
      } else {
        assert.equal(inquiry.itemId, undefined);
      }
    }
    for (const item of seed.items.filter((row) => row.status === "処分済み")) {
      assert.equal(urgency(item, seed.settings, item.history.at(-1).at.slice(0, 10)), "期限切れ");
    }
    const ordered = [...seed.items].sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));
    for (let index = 1; index < ordered.length; index++) {
      assert.ok(ordered[index - 1].number < ordered[index].number);
    }
  });
}

for (const [name, corrupt] of [
  [
    "貴重品フラグの不整合",
    (data) => {
      data.items[0].valuable = !data.items[0].valuable;
    },
  ],
  [
    "問い合わせID重複",
    (data) => {
      data.inquiries[1].id = data.inquiries[0].id;
    },
  ],
  [
    "引き渡しID重複",
    (data) => {
      data.handovers.push(structuredClone(data.handovers[0]));
    },
  ],
  [
    "引き渡し内の重複",
    (data) => {
      data.handovers[0].items.push(structuredClone(data.handovers[0].items[0]));
    },
  ],
  [
    "拾得前の引き渡し",
    (data) => {
      data.handovers[0].date = "2000-01-01";
    },
  ],
  [
    "引き渡し対象が不存在",
    (data) => {
      data.handovers[0].items[0].id = "missing";
    },
  ],
]) {
  test(`保存データ拒否：${name}`, () => {
    const data = structuredClone(sample);
    corrupt(data);
    assert.equal(validateStore(data), false);
  });
}
