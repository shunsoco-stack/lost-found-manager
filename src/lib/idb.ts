const databaseName = "lfm-photos";

async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("images");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("写真の保存領域を開けません。"));
  });
}

export async function getImage(key: string): Promise<string | undefined> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("images", "readonly");
    const request = transaction.objectStore("images").get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("写真を読み込めません。"));
    transaction.oncomplete = () => database.close();
  });
}

export async function putImages(images: Record<string, string>, clear = false): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("images", "readwrite");
    const store = transaction.objectStore("images");
    if (clear) store.clear();
    Object.entries(images).forEach(([key, data]) => store.put(data, key));
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(new Error("写真を保存できません。端末の空き容量を確認してください。"));
    };
  });
}

export async function exportImages(keys: string[]): Promise<Record<string, string>> {
  const images: Record<string, string> = {};
  for (const key of keys) {
    const value = await getImage(key);
    if (!value) throw new Error(`写真・署名が見つかりません：${key}`);
    images[key] = value;
  }
  return images;
}
