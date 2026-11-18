import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

// Use an already installed Playwright. This script installs no packages and takes no screenshots.
const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath ? pathToFileURL(modulePath).href : "playwright");
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => {
  if (response.status() >= 400) console.log(`HTTP ${response.status()} ${response.url()}`);
});
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
const base = process.env.TEST_BASE_URL || "http://localhost:3018";
const staticMode = process.env.TEST_STATIC === "1";
let server;
if (staticMode) {
  const root = resolve("out");
  server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, base).pathname);
    const file = resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
    if (!file.startsWith(`${root}${sep}`)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const target = extname(file) ? file : `${file}.html`;
      const body = await readFile(target);
      const mime = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".webmanifest": "application/manifest+json",
        ".txt": "text/plain",
      };
      response
        .writeHead(200, { "Content-Type": mime[extname(target)] || "application/octet-stream" })
        .end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((done) => server.listen(Number(new URL(base).port), "127.0.0.1", done));
}

function itemPath(id, returning = false) {
  return staticMode
    ? `/items/${returning ? "return" : "detail"}?id=${id}`
    : `/items/${id}${returning ? "/return" : ""}`;
}

async function visit(path) {
  const response = await page.goto(`${base}${path}`);
  assert.equal(response.status(), 200, path);
  await page.locator("main h1").waitFor();
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  assert.ok(
    dimensions.scroll <= dimensions.width,
    `${path}: overflow ${JSON.stringify(dimensions)}`,
  );
}

async function stored() {
  return page.evaluate(() => JSON.parse(localStorage.getItem("lfm:v1")));
}

try {
  for (const path of [
    "/",
    "/items",
    "/items/new",
    itemPath("demo-14"),
    itemPath("demo-14", true),
    "/inquiries",
    "/handover",
    "/settings",
    "/backup",
    "/about",
  ]) {
    await visit(path);
  }
  assert.equal((await stored()).items.length, 60);
  await visit("/items/new");
  await page.getByLabel("特徴 *", { exact: true }).fill("青いテスト用ポーチ、白い鳥の刺しゅう");
  await page.locator('select[name="category"]').selectOption("バッグ");
  await page.getByLabel("青", { exact: true }).check();
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 2400;
    canvas.height = 1800;
    canvas.getContext("2d").fillRect(0, 0, 2400, 1800);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page
    .locator("#item-photos")
    .setInputFiles({
      name: "sample.png",
      mimeType: "image/png",
      buffer: Buffer.from(image, "base64"),
    });
  await page.locator(".photo-previews img").waitFor();
  assert.equal(
    await page.locator(".photo-previews img").evaluate((image) => image.naturalWidth),
    1600,
  );
  await page.getByRole("button", { name: "拾得物を登録する", exact: true }).click();
  await page.waitForURL(staticMode ? /\/items\/detail\?id=[a-f0-9-]+$/ : /\/items\/[a-f0-9-]+$/);
  const item = (await stored()).items[0];
  assert.equal(item.features, "青いテスト用ポーチ、白い鳥の刺しゅう");
  await page.reload();
  await page.getByRole("button", { name: "登録内容を編集" }).click();
  await page.getByLabel("場所の詳細").fill("西側のベンチ");
  await page.getByRole("button", { name: "変更を保存" }).click();
  await page.getByRole("link", { name: "本人確認・返却へ" }).waitFor();
  assert.equal((await stored()).items[0].locationDetail, "西側のベンチ");
  await visit("/inquiries");
  await page.getByLabel("特徴の言葉", { exact: false }).fill("白い鳥 刺しゅう");
  await page.getByRole("button", { name: "特徴から照合する" }).click();
  await page.locator(".match-card").first().getByRole("button", { name: "この候補を選ぶ" }).click();
  await page.getByLabel("連絡方法 *").fill("受付窓口");
  await page
    .getByLabel("内容 *", { exact: true })
    .fill("白い鳥の刺しゅうがある青いポーチを探している。");
  await page.locator('select[name="result"]').selectOption("見つかった");
  await page.getByRole("button", { name: "問い合わせを記録", exact: true }).click();
  assert.equal((await stored()).inquiries[0].itemId, item.id);
  await visit(itemPath(item.id, true));
  await page.getByLabel("確認した書類の種類", { exact: false }).selectOption("学生証");
  await page.getByLabel("受取人の氏名 *").fill("確認用 架空太郎");
  await page.getByLabel("本人が答えた特徴 *").fill("青いポーチ、白い鳥の刺しゅう");
  await page.getByLabel("本人が答えた特徴が、拾得物の特徴と一致しました").check();
  const canvas = page.locator("canvas");
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  await page.mouse.move(bounds.x + 25, bounds.y + 35);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 110, bounds.y + 65, { steps: 12 });
  await page.mouse.up();
  await page.getByRole("button", { name: "確認して返却を記録" }).click();
  await page.waitForURL(`${base}${itemPath(item.id)}`);
  assert.equal((await stored()).items.find((row) => row.id === item.id).status, "返却済み");
  await visit("/handover");
  await page.locator("tbody input[type=checkbox]").first().check();
  await page.getByRole("button", { name: "引き渡しリストを作成" }).click();
  await page.locator(".print-document").waitFor();
  await page.evaluate(() => {
    window.print = () => {
      window.printInvoked = true;
    };
  });
  await page.getByRole("button", { name: "A4縦で印刷" }).click();
  assert.equal(await page.evaluate(() => window.printInvoked), true);
  await page.emulateMedia({ media: "print" });
  assert.equal(await page.locator(".sidebar").isVisible(), false);
  await page.emulateMedia({ media: "screen" });
  await page.getByRole("button", { name: "引き渡し済みとして記録" }).click();
  assert.equal((await stored()).handovers.length, 2);
  const disposal = page.getByRole("button", { name: "処分を記録", exact: true });
  if (await disposal.count()) {
    await disposal.first().click();
    await page.getByRole("button", { name: "処分済みとして記録" }).click();
    assert.equal((await stored()).items.filter((row) => row.status === "処分済み").length, 6);
  }
  await visit("/backup");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "バックアップを書き出す（JSON）" }).click();
  const download = await downloading;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const backup = Buffer.concat(chunks);
  assert.equal(JSON.parse(backup).data.items.length, 61);
  await page
    .locator("#backup-file")
    .setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: backup });
  await page.getByRole("button", { name: "この内容で復元する" }).click();
  await page.getByText("バックアップを復元しました。", { exact: true }).waitFor();
  assert.equal((await stored()).items.length, 61);
  await page
    .locator("#backup-file")
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from("{}"),
    });
  await page.locator(".error-message[role=alert]").waitFor();
  assert.equal((await stored()).items.length, 61);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await visit("/");
  await page.evaluate(() => localStorage.setItem("lfm:v1", "{broken"));
  await page.reload();
  await page
    .getByText("保存データが破損していたため、既定の架空データに戻しました。", { exact: true })
    .waitFor();
  assert.equal((await stored()).items.length, 60);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: 10 routes at 375px, desktop, registration, image resize, edit, matching, signature return, handover, disposal, backup restore/rejection, corrupt storage recovery; browser console errors: 0",
  );
} finally {
  await context.close();
  await browser.close();
  if (server) await new Promise((done) => server.close(done));
}
