import type { Inquiry, Item } from "./types";
import { addDays } from "./dates";

// 来館者の申告を個別に用意する。特徴台帳の文章からは生成しない。
const reports: [number, string, string, number][] = [
  [
    1,
    "紺の小さい傘をなくしました。月のシールを貼っています。買い物に来た日のものです。",
    "月 シール",
    1,
  ],
  [
    2,
    "冷房で羽織ったベージュの上着がありません。二日間通ったので、どちらの日に置いたか曖昧です。",
    "カーディガン",
    2,
  ],
  [
    3,
    "帰ってから鍵の束が見つかりません。青いイルカを付けています。三日分の立ち寄り先を確認中です。",
    "イルカ",
    3,
  ],
  [
    4,
    "買ったものを茶色い紙の手提げごと忘れました。その日の休憩中に横に置いた気がします。",
    "紙袋",
    1,
  ],
  [
    5,
    "緑の傘を預けたまま帰ったかもしれません。二日続けて使っていて、最後に持った日を思い出せません。",
    "チェック",
    2,
  ],
  [
    6,
    "白いイヤホンの入れ物だけなくしました。星のシールが目印で、その日の帰りにはありませんでした。",
    "星",
    1,
  ],
  [
    7,
    "黒い布のバッグは届いていませんか。三日間の買い物のどこかで、サブバッグを置いてきました。",
    "トート",
    3,
  ],
  [8, "雨がやんだ日に透明な傘を忘れました。持つところに黄色のゴムを巻いてあります。", "輪ゴム", 1],
  [
    9,
    "子どもの黄色い帽子がありません。恐竜が付いています。二日間遊びに来て、どちらで落としたか不明です。",
    "恐竜",
    2,
  ],
  [
    14,
    "昨日、黒い長財布をなくしました。開ける金具が丸く、内側は茶系です。届いていたら取りに行きたいです。",
    "丸い 金具",
    1,
  ],
  [19, "茶色の折れる財布を探しています。会計したあと、鞄に戻したつもりでした。", "財布", 1],
  [20, "携帯を置き忘れました。黒い本体で、ケースに登山の写真を挟んでいます。", "写真", 1],
  [
    21,
    "紺のフード付きの服はありませんか。胸の船のマークを子どもが気に入っているんです。",
    "帆船",
    1,
  ],
  [22, "水玉の青い傘を忘れたようです。雨が上がって、手ぶらで帰ってしまいました。", "水玉", 1],
  [23, "レモンの模様の小物入れが見当たりません。駐車券を出したときに取り出しました。", "レモン", 1],
  [
    24,
    "子どもの緑の上着を探しています。恐竜の形の引き手で、本人が開け閉めしていました。",
    "恐竜",
    1,
  ],
  [25, "自転車を開けられず困っています。鍵にはオレンジ色の伸びるひもが付いています。", "自転車", 1],
  [26, "大きめの黒い傘を取りに戻りました。革のひもがあるものです。", "革", 1],
  [27, "建物の絵を描いた白いノートを忘れました。用事のメモがあるので確認したいです。", "ノート", 1],
  [28, "赤い首巻きを外したまま置いてきた気がします。白い細線が入った手編み風のものです。", "白", 1],
  [29, "ピンクの携帯がなくなりました。花のケースを付けていて、角が少し傷んでいます。", "花柄", 1],
  [30, "紺色のカード入れを落としました。銀の留め金が付いた、使い込んだものです。", "カード", 1],
  [31, "黄色い子どもの傘を探しに来ました。アヒルの絵と、外が見える窓があります。", "アヒル", 1],
  [32, "黒い帽子を脱いだまま忘れました。後ろのリボンで見分けられると思います。", "リボン", 1],
];

const pendingNames = [
  "安西 桃子",
  "石野 翔",
  "宇田 菜摘",
  "江口 和也",
  "大庭 翠",
  "加納 陸",
  "木崎 真由",
  "熊谷 透",
  "小泉 杏",
  "佐伯 渉",
];

function shiftMinutes(at: string, minutes: number) {
  return new Date(Date.parse(`${at}:00Z`) + minutes * 60000).toISOString().slice(0, 16);
}

export function createSeedInquiries(
  items: Item[],
  random: () => number,
  current: string,
): Inquiry[] {
  const today = current.slice(0, 10);
  return reports.map(([number, content, words, span], index) => {
    const source = items.find((item) => item.id === `demo-${number}`)!;
    const foundDay = source.foundAt.slice(0, 10);
    let from = addDays(foundDay, 1 - span);
    let to = foundDay;
    let at: string;
    if (source.returned) {
      at = shiftMinutes(source.returned.at, -(5 + Math.floor(random() * 40)));
    } else if (number === 14) {
      // 深夜は時間外受付の受信として扱う。00:00ちょうどだけは前日へ退避。
      const elapsed = Number(current.slice(11, 13)) * 60 + Number(current.slice(14));
      at =
        elapsed === 0
          ? `${addDays(today, -1)}T23:59`
          : shiftMinutes(`${today}T00:00`, Math.min(18 * 60 + 17, Math.floor(elapsed / 2)));
      from = addDays(today, -1);
      to = from;
      if (elapsed === 0) content = content.replace("昨日", "今日");
    } else if (number === 1) {
      // 前日の紛失を申告し、その後に拾得・登録される通知デモ。
      at = shiftMinutes(source.foundAt, -30);
      from = addDays(foundDay, -1);
      to = from;
    } else {
      at = shiftMinutes(source.foundAt, 120 + Math.floor(random() * 181));
      const latest = `${addDays(today, -1)}T23:57`;
      if (at > latest) at = latest;
    }
    const foundMinutes =
      Number(source.foundAt.slice(11, 13)) * 60 + Number(source.foundAt.slice(14));
    const lostMinutes =
      number === 1
        ? 17 * 60 + 20
        : 600 + Math.floor(random() * (Math.min(20 * 60, foundMinutes) - 600 + 1));
    const lostAt = shiftMinutes(`${from}T00:00`, lostMinutes);
    return {
      id: `inquiry-${source.id}`,
      at,
      name: source.returned?.recipient ?? pendingNames[index],
      contact: source.returned
        ? "受付窓口で本人確認済み"
        : number === 14
          ? "時間外受付可・後日来館予定（候補を確認中）"
          : number === 1
            ? "電話・一致候補が届いたら連絡希望"
            : span === 2
              ? "折り返し待ち（連絡先確認済み）"
              : "後日来館予定・現物確認待ち",
      content: `${content}（申告した紛失日時：${lostAt.replace("T", " ")}頃${span > 1 ? `〜${to}の来館中` : ""}）`,
      result: source.returned ? "見つかった" : number === 1 ? "該当なし" : "後日連絡",
      query: { from, to, location: "", category: source.category, colors: source.colors, words },
      ...(source.returned ? { itemId: source.id } : {}),
    };
  });
}
