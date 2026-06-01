import sharp from 'sharp';
import { readdir, stat, readFile, writeFile } from 'fs/promises';
import { join, basename } from 'path';

const HEROES = [
  'drone-mazunte.webp','alberca.webp','tololote9.webp',
  'alberca2.webp','casa-aerea.webp','casa-fachada.webp','casa-cubo.webp'
];

async function* walk(dir) {
  for (const f of await readdir(dir)) {
    const p = join(dir, f);
    if ((await stat(p)).isDirectory()) yield* walk(p);
    else yield p;
  }
}

let saved = 0, count = 0;
for await (const file of walk('./assets/images')) {
  if (!file.endsWith('.webp')) continue;
  const name = basename(file);
  const before = (await stat(file)).size;
  if (before < 320 * 1024) continue; // already under 320KB

  const isHero = HEROES.includes(name);
  const maxW   = isHero ? 1600 : 1000;
  const quality = isHero ? 85 : 70;

  try {
    const inputBuf = await readFile(file);
    const meta = await sharp(inputBuf).metadata();
    if ((meta.width||0) <= maxW) continue;

    const outBuf = await sharp(inputBuf)
      .resize(maxW, null, { withoutEnlargement: true })
      .webp({ quality, effort: 5 })
      .toBuffer();

    if (outBuf.length < before * 0.9) {
      await writeFile(file, outBuf);
      saved += before - outBuf.length;
      count++;
      console.log(`✓ ${name.padEnd(36)} ${Math.round(before/1024)}KB → ${Math.round(outBuf.length/1024)}KB`);
    }
  } catch(e) {
    console.log(`✗ ${name}: ${e.message}`);
  }
}
console.log(`\nDone: ${count} recompressed | Saved: ${Math.round(saved/1024)}KB`);
