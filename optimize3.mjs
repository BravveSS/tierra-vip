import sharp from 'sharp';
import { readFile, writeFile } from 'fs/promises';

const jobs = [
  // Nabani — from original JPG/PNG in assets
  { src:'assets/images/nabani/alberca.jpg',    dst:'assets/images/nabani/alberca.webp',  maxW:2000, q:90 },
  { src:'assets/images/nabani/alberca2.jpg',   dst:'assets/images/nabani/alberca2.webp', maxW:1600, q:85 },
  { src:'assets/images/nabani/lounge2.png',    dst:'assets/images/nabani/lounge2.webp',  maxW:1600, q:85 },
  { src:'assets/images/nabani/entrada.jpg',    dst:'assets/images/nabani/entrada.webp',  maxW:1600, q:85 },
  { src:'assets/images/nabani/drone2.jpg',     dst:'assets/images/nabani/drone2.webp',   maxW:1600, q:85 },
  // Azimut — from original PNG/JPG in assets
  { src:'assets/images/azimut/drone-mazunte.jpg',  dst:'assets/images/azimut/drone-mazunte.webp', maxW:2000, q:90 },
  { src:'assets/images/azimut/casa-aerea.png',     dst:'assets/images/azimut/casa-aerea.webp',    maxW:1600, q:85 },
  { src:'assets/images/azimut/casa-fachada.png',   dst:'assets/images/azimut/casa-fachada.webp',  maxW:1600, q:85 },
  { src:'assets/images/azimut/casa-cubo.png',      dst:'assets/images/azimut/casa-cubo.webp',     maxW:1600, q:85 },
  { src:'assets/images/azimut/renders/r1.jpg',     dst:'assets/images/azimut/renders/r1.webp',    maxW:1600, q:85 },
  { src:'assets/images/azimut/renders/r2.jpg',     dst:'assets/images/azimut/renders/r2.webp',    maxW:1600, q:85 },
  { src:'assets/images/azimut/renders/r4.png',     dst:'assets/images/azimut/renders/r4.webp',    maxW:1600, q:85 },
  { src:'assets/images/azimut/renders/r7.jpg',     dst:'assets/images/azimut/renders/r7.webp',    maxW:1600, q:85 },
  { src:'assets/images/azimut/renders/r11.png',    dst:'assets/images/azimut/renders/r11.webp',   maxW:1600, q:85 },
  // Nabani renders — from original PNGs
  { src:'assets/images/nabani/renders/r1.png',  dst:'assets/images/nabani/renders/r1.webp',  maxW:1600, q:85 },
  { src:'assets/images/nabani/renders/r2.png',  dst:'assets/images/nabani/renders/r2.webp',  maxW:1600, q:85 },
  { src:'assets/images/nabani/renders/r4.png',  dst:'assets/images/nabani/renders/r4.webp',  maxW:1600, q:85 },
  { src:'assets/images/nabani/renders/r6.png',  dst:'assets/images/nabani/renders/r6.webp',  maxW:1600, q:85 },
  { src:'assets/images/nabani/renders/r8.png',  dst:'assets/images/nabani/renders/r8.webp',  maxW:1600, q:85 },
  { src:'assets/images/nabani/renders/r10.png', dst:'assets/images/nabani/renders/r10.webp', maxW:1600, q:85 },
];

let ok=0;
for (const {src, dst, maxW, q} of jobs) {
  try {
    const buf = await readFile(src);
    const out = await sharp(buf)
      .resize(maxW, null, { withoutEnlargement: true })
      .webp({ quality: q, effort: 5 })
      .toBuffer();
    await writeFile(dst, out);
    console.log(`✓ ${dst.split('/').pop().padEnd(28)} ${Math.round(out.length/1024)}KB  (q${q}, max${maxW}px)`);
    ok++;
  } catch(e) {
    console.log(`✗ ${src.split('/').pop()}: ${e.message}`);
  }
}
console.log(`\nDone: ${ok}/${jobs.length}`);
