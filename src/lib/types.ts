export const categories = [
  "財布・カード類",
  "スマホ・電子機器",
  "鍵",
  "傘",
  "衣類・帽子",
  "バッグ",
  "アクセサリー",
  "書類・本",
  "子ども用品",
  "その他",
] as const;

export type Category = (typeof categories)[number];

export const colors = [
  "黒",
  "白",
  "グレー",
  "青",
  "紺",
  "赤",
  "ピンク",
  "黄",
  "緑",
  "茶",
  "ベージュ",
  "透明",
  "銀",
  "金",
];

export const statuses = ["保管中", "返却済み", "引き渡し済み", "処分済み"] as const;

export type Status = (typeof statuses)[number];

export const documents = [
  "運転免許証",
  "保険証",
  "マイナンバーカード",
  "学生証",
  "その他",
] as const;

export type ReturnRecord = {
  document: string;
  matched: boolean;
  answer: string;
  recipient: string;
  at: string;
  staff: string;
  signature: string;
};

export type Item = {
  id: string;
  number: string;
  foundAt: string;
  registeredAt: string;
  location: string;
  locationDetail: string;
  finder: "来館者" | "スタッフ";
  finderName: string;
  finderContact: string;
  waived: boolean;
  category: Category;
  colors: string[];
  brand: string;
  features: string;
  contents: string;
  cash: number;
  cards: number;
  storage: string;
  photos: string[];
  valuable: boolean;
  status: Status;
  history: { at: string; text: string }[];
  returned?: ReturnRecord;
};

export type Query = {
  from: string;
  to: string;
  location: string;
  category: string;
  colors: string[];
  words: string;
};

export type Inquiry = {
  id: string;
  at: string;
  name: string;
  contact: string;
  content: string;
  result: "見つかった" | "該当なし" | "後日連絡";
  query: Query;
  itemId?: string;
};

export type Settings = {
  facility: string;
  locations: string[];
  storage: string[];
  staff: string[];
  retention: Record<Category, { days: number; action: "警察へ引き渡し" | "施設で処分" }>;
};

export type Handover = { id: string; date: string; staff: string; facility: string; items: Item[] };

export type Store = {
  version: 1;
  settings: Settings;
  items: Item[];
  inquiries: Inquiry[];
  handovers: Handover[];
};

export type Backup = {
  format: "lfm-backup";
  version: 1;
  data: Store;
  images: Record<string, string>;
};
