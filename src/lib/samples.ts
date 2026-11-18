import type { Item } from "./types";

const palette: Record<string, string> = {
  黒: "#303c43",
  白: "#f5f1e8",
  グレー: "#8d999d",
  青: "#468cb0",
  紺: "#334b70",
  赤: "#b55550",
  ピンク: "#df9ca5",
  黄: "#d5ad46",
  緑: "#568676",
  茶: "#987050",
  ベージュ: "#cbb99b",
  透明: "#bed8db",
  銀: "#a7b6bb",
  金: "#b99d58",
};

export function drawSample(item: Item): string {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 440;
  const context = canvas.getContext("2d")!;
  const hash = [...item.features].reduce((total, letter) => total + letter.charCodeAt(0), 0);
  context.fillStyle = `hsl(${hash % 360}, 18%, 92%)`;
  context.fillRect(0, 0, 640, 440);
  context.save();
  context.translate(320, 210);
  context.rotate((((hash % 31) - 15) * Math.PI) / 180);
  context.shadowColor = "#233a3825";
  context.shadowBlur = 20;
  context.shadowOffsetY = 15;
  context.fillStyle = palette[item.colors[0]] || "#769b95";
  context.strokeStyle = "#53656a";
  context.lineWidth = 5;
  const roundBox = (x: number, y: number, width: number, height: number, radius = 16) => {
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
    context.fill();
    context.stroke();
  };
  if (item.category === "傘") {
    roundBox(-128, -35, 230, 70, 12);
    context.shadowBlur = 0;
    context.beginPath();
    context.moveTo(-85, -33);
    context.lineTo(-85, 33);
    context.moveTo(75, -33);
    context.lineTo(75, 33);
    context.stroke();
    context.beginPath();
    context.moveTo(102, 0);
    context.lineTo(148, 0);
    context.arc(148, 20, 20, -Math.PI / 2, Math.PI / 2);
    context.stroke();
  } else if (item.category === "財布・カード類") {
    roundBox(-125, -65, 250, 130, 15);
    context.shadowBlur = 0;
    context.strokeStyle = "#ceb991";
    context.lineWidth = 2;
    context.strokeRect(-114, -54, 228, 108);
    context.fillStyle = "#c4b18e";
    context.fillRect(88, -16, 20, 32);
  } else if (item.category === "鍵") {
    context.fillStyle = "#bcc7cb";
    for (const [x, y, angle] of [
      [-35, -20, -0.35],
      [10, -20, 0.3],
      [35, -35, 0.8],
    ]) {
      context.save();
      context.translate(x, y);
      context.rotate(angle);
      context.beginPath();
      context.arc(0, 0, 25, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      roundBox(-7, 20, 14, 92, 2);
      context.fillRect(7, 75, 16, 12);
      context.restore();
    }
    context.beginPath();
    context.ellipse(0, -50, 50, 28, 0, 0, Math.PI * 2);
    context.stroke();
  } else if (item.category === "スマホ・電子機器") {
    roundBox(-90, -65, 180, 130, 48);
    context.beginPath();
    context.moveTo(-84, -20);
    context.lineTo(84, -20);
    context.stroke();
    context.fillStyle = "#7d9e88";
    context.beginPath();
    context.arc(0, 26, 4, 0, 7);
    context.fill();
  } else if (["衣類・帽子", "子ども用品"].includes(item.category)) {
    context.beginPath();
    context.ellipse(0, 35, 130, 30, 0, 0, 7);
    context.fill();
    context.stroke();
    context.beginPath();
    context.arc(0, 12, 90, Math.PI, 0);
    context.closePath();
    context.fill();
    context.stroke();
    context.fillStyle = "#f5d58d";
    context.beginPath();
    context.arc(35, -15, 13, 0, 7);
    context.fill();
  } else if (item.category === "バッグ") {
    roundBox(-90, -70, 180, 180, 5);
    context.shadowBlur = 0;
    context.beginPath();
    context.arc(0, -60, 38, Math.PI, 0);
    context.stroke();
    context.strokeStyle = "#ffffff70";
    context.strokeRect(-65, -35, 130, 100);
  } else {
    roundBox(-83, -100, 166, 200, 12);
    context.shadowBlur = 0;
    context.strokeStyle = "#ffffff80";
    context.beginPath();
    context.moveTo(-55, -55);
    context.lineTo(55, -55);
    context.moveTo(-55, -30);
    context.lineTo(25, -30);
    context.stroke();
  }
  context.restore();
  context.fillStyle = "#63716e";
  context.font = "16px sans-serif";
  context.fillText("サンプル画像", 520, 415);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function drawSampleSignature(name: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 180;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "white";
  context.fillRect(0, 0, 600, 180);
  context.fillStyle = "#334d4c";
  context.font = "italic 38px serif";
  context.fillText(name, 55, 100);
  context.font = "14px sans-serif";
  context.fillText("架空の署名サンプル", 420, 155);
  return canvas.toDataURL("image/png");
}

export function seedImages(items: Item[]): Record<string, string> {
  return Object.fromEntries(
    items.flatMap((item) => [
      [item.photos[0], drawSample(item)],
      ...(item.returned
        ? [[item.returned.signature, drawSampleSignature(item.returned.recipient)]]
        : []),
    ]),
  );
}
