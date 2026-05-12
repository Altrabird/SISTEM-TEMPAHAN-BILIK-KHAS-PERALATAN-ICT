#!/usr/bin/env node
/**
 * Mask the brand logo into a clean transparent-corner circle.
 *
 * Source: logo-source.png (currently has a black square background — looks
 * awful when Android/iOS launchers crop the icon to a circle because the
 * corners bleed through).
 *
 * Pipeline:
 *   1. Replace the dark outer background with transparency by colour-key —
 *      anything within `BG_TOLERANCE` of pure black becomes alpha=0.
 *   2. Trim uniform transparent borders so the logo is tight in its bbox.
 *   3. Center-crop to a square.
 *   4. Apply a circular SVG mask so even rounded edges become transparent.
 *   5. Overwrite logo-source.png in place.
 *
 * After this runs, `npm run icons` regenerates favicon + every PWA icon
 * from the now-clean source.
 */

import sharp from 'sharp';
import { renameSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'logo-source.png');
const TMP = path.join(ROOT, 'logo-source.tmp.png');

// Pixels with R, G, B all <= this value are treated as background and made
// transparent. The TEMPAH logo uses bright blues, whites and pinks — well
// above this threshold — so we won't accidentally erase the brand.
const BG_TOLERANCE = 40;

const main = async () => {
  // 1. Read raw pixel buffer + colour-key the dark background to alpha 0
  const { data: rawPixels, info } = await sharp(SOURCE)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  if (channels !== 4) throw new Error(`expected RGBA, got ${channels} channels`);

  for (let i = 0; i < rawPixels.length; i += 4) {
    const r = rawPixels[i];
    const g = rawPixels[i + 1];
    const b = rawPixels[i + 2];
    if (r <= BG_TOLERANCE && g <= BG_TOLERANCE && b <= BG_TOLERANCE) {
      rawPixels[i + 3] = 0; // make transparent
    }
  }

  // 2. Trim transparent borders → tight bbox around the actual logo
  const trimmedBuf = await sharp(rawPixels, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
  const trimmed = await sharp(trimmedBuf).trim().toBuffer();
  const tMeta = await sharp(trimmed).metadata();
  console.log(`After trim: ${tMeta.width}x${tMeta.height}`);

  // 3. Pad to square (centred) so the circle mask doesn't squash anything
  const size = Math.max(tMeta.width, tMeta.height);
  const squareBuf = await sharp(trimmed)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  // 4. Composite a circular alpha mask. `dest-in` keeps only pixels where
  //    BOTH the source and the mask are non-transparent.
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
       <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/>
     </svg>`
  );

  await sharp(squareBuf)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toFile(TMP);

  // 5. Atomic-ish replace
  unlinkSync(SOURCE);
  renameSync(TMP, SOURCE);
  console.log(`Wrote masked logo back to ${SOURCE} (${size}x${size})`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
