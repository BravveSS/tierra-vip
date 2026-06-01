import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';

const ASSETS = './assets/images';
const MAX_W  = 2400;
const QUALITY = 88;

async function* walk(dir) {
  for (const f of await readdir(dir)) {
    const p = join(dir, f);
    if ((await stat(p)).isDirectory()) yield* walk(p);
    else yield p;
  }
}

let count = 0, saved = 0;
for await (const file of walk(ASSETS)) {
  const ext = extname(file).toLowerCase();
  if (!['.jpg','.jpeg','.png'].includes(ext)) continue;

  const s = await stat(file);
  const sizeMB = s.size / 1024 / 1024;

  try {
    const img = sharp(file);
    const meta = await img.metadata();
    const w = Math.min(meta.width || MAX_W, MAX_W);

    const buf = await sharp(file)
      .resize(w, null, { withoutEnlargement: true })
      .webp({ quality: QUALITY, effort: 4 })
      .toBuffer();

    // Overwrite with WebP content but keep original extension
    // (browser will render WebP from any src if we update src)
    const webpPath = file.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    await sharp(buf).toFile(webpPath);

    const newMB = buf.length / 1024 / 1024;
    saved += sizeMB - newMB;
    count++;
    console.log(`✓ ${basename(file).padEnd(40)} ${sizeMB.toFixed(1)}MB → ${newMB.toFixed(2)}MB`);
  } catch(e) {
    console.log(`✗ ${basename(file)}: ${e.message}`);
  }
}
console.log(`\nDone: ${count} images | Saved: ${saved.toFixed(0)}MB`);
