export function resizedDimensions(width: number, height: number, maximum = 1600) {
  if (![width, height, maximum].every((value) => Number.isFinite(value) && value > 0))
    throw new Error("画像サイズが不正です。");
  const ratio = Math.min(1, maximum / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

export async function shrinkPhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/") || file.size > 25 * 1024 * 1024)
    throw new Error("25MB以下の画像を選択してください。");
  const image = await createImageBitmap(file);
  try {
    const size = resizedDimensions(image.width, image.height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("画像を処理できません。");
    context.drawImage(image, 0, 0, size.width, size.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    image.close();
  }
}
