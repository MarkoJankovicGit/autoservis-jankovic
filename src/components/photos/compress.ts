"use client";

/**
 * Smanjenje slike u browseru pre slanja: ispravna orijentacija (EXIF), najviše 2048 px po dužoj strani,
 * JPEG ~82 %. Ponovno kodiranje kroz canvas briše EXIF, pa i GPS lokaciju.
 */
export type Compressed = { main: Blob; thumb: Blob; width: number; height: number };

async function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Kodiranje slike nije uspelo."))), "image/jpeg", quality));
}

function draw(bitmap: ImageBitmap, maxSide: number): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser ne može da obradi sliku.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function compressImage(file: File): Promise<Compressed> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Format slike nije podržan. Izaberi JPEG ili PNG.");
  }
  try {
    const big = draw(bitmap, 2048);
    let main = await toBlob(big, 0.82);
    if (main.size > 2_300_000) main = await toBlob(big, 0.7);
    const thumb = await toBlob(draw(bitmap, 400), 0.75);
    return { main, thumb, width: big.width, height: big.height };
  } finally {
    bitmap.close();
  }
}
