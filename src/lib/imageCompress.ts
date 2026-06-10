// Compress an image File to a small JPEG data URL via canvas.
// Target: <= 300KB raw data URL, max 800px on longest side.
// Throws Error with `code` set so callers can distinguish.

export class ImageError extends Error {
  code: 'not_image' | 'unsupported' | 'too_large' | 'decode_failed';
  constructor(code: ImageError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

const MAX_SIDE = 800;
const SIZE_LIMIT = 300_000;

async function loadBitmap(file: File): Promise<{ width: number; height: number; close: () => void; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bm = await createImageBitmap(file);
      return {
        width: bm.width,
        height: bm.height,
        close: () => bm.close?.(),
        draw: (ctx, w, h) => ctx.drawImage(bm, 0, 0, w, h),
      };
    } catch {
      /* fall through to HTMLImageElement path */
    }
  }
  // Fallback: HTMLImageElement (works on iOS Safari < 15, embedded WebViews)
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new ImageError('decode_failed', 'Image decode failed'));
    img.src = url;
  });
  return {
    width: img.naturalWidth,
    height: img.naturalHeight,
    close: () => URL.revokeObjectURL(url),
    draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
  };
}

export async function compressImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new ImageError('not_image', 'Not an image file');
  }

  const bitmap = await loadBitmap(file);
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new ImageError('unsupported', 'Canvas 2D unavailable');
    bitmap.draw(ctx, w, h);

    for (const quality of [0.8, 0.6, 0.45, 0.3]) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrl.length <= SIZE_LIMIT) return dataUrl;
    }
    throw new ImageError('too_large', 'Image too large even after compression');
  } finally {
    bitmap.close();
  }
}
