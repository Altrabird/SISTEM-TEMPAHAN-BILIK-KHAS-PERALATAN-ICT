#!/usr/bin/env node
/**
 * pwa-assets-generator writes icons alongside the source PNG. Our source
 * (`logo-source.png`) lives in the repo root — but those generated icons
 * need to end up in `public/` so Vite serves them. Move them after each
 * regen. Idempotent: missing files are skipped, existing files in
 * public/ are overwritten.
 */
import { existsSync, renameSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');

const FILES = [
  'favicon.ico',
  'apple-touch-icon-180x180.png',
  'pwa-64x64.png',
  'pwa-192x192.png',
  'pwa-512x512.png',
  'maskable-icon-512x512.png',
];

for (const name of FILES) {
  const src = path.join(ROOT, name);
  if (!existsSync(src)) continue;
  const dst = path.join(PUBLIC, name);
  renameSync(src, dst);
  console.log(`Moved ${name} → public/`);
}
