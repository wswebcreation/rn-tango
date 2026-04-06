#!/usr/bin/env npx ts-node --project scripts/tsconfig.json
/**
 * Download Tango puzzle answer images from Try Hard Guides (same host/pattern as the Queens downloader).
 *
 * Example remote URL:
 *   https://tryhardguides.com/wp-content/uploads/2025/05/Tango-answer-209.jpg
 *
 * Run from repo root:
 *   npm run download-tango-images -- --from=200 --to=250
 */

import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';

const BASE_HOST = 'https://tryhardguides.com/wp-content/uploads';
// Year/month paths to try per puzzle, most likely first. Add entries when new upload paths appear.
const UPLOAD_PATHS = ['2025/05', '2026/03'];

const DEFAULT_OUTPUT_DIR = path.resolve(__dirname, '../tango-data/thumbnails');

function parseArgs(): { from: number; to: number; outputDir: string } {
  const args = process.argv.slice(2).filter((arg) => arg !== '--');

  let from: number | undefined;
  let to: number | undefined;
  let outputDir = DEFAULT_OUTPUT_DIR;

  for (const arg of args) {
    if (arg.startsWith('--from=')) {
      from = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--to=')) {
      to = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--output=')) {
      outputDir = path.resolve(process.cwd(), arg.split('=')[1]);
    }
  }

  if (from === undefined || to === undefined || isNaN(from) || isNaN(to)) {
    console.error('Usage: npm run download-tango-images -- --from=<number> --to=<number> [--output=<folder>]');
    console.error('Example: npm run download-tango-images -- --from=200 --to=302');
    process.exit(1);
  }

  if (from > to) {
    console.error(`--from (${from}) must be less than or equal to --to (${to})`);
    process.exit(1);
  }

  return { from, to, outputDir };
}

function tryFindUrl(puzzleNumber: number): Promise<string | null> {
  const fileBase = `Tango-answer-${puzzleNumber}.jpg`;
  const candidates = UPLOAD_PATHS.map((p) => `${BASE_HOST}/${p}/${fileBase}`);

  return candidates.reduce<Promise<string | null>>(
    (chain, url) =>
      chain.then((found) => {
        if (found) return found;
        return new Promise((resolve) => {
          https
            .get(url, { method: 'HEAD' } as Parameters<typeof https.get>[1], (res) => {
              res.resume();
              resolve(res.statusCode === 200 ? url : null);
            })
            .on('error', () => resolve(null));
        });
      }),
    Promise.resolve(null)
  );
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    const request = https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        const redirectUrl = response.headers.location!;
        downloadFile(redirectUrl, dest).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    });

    request.on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });

    file.on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function download(): Promise<void> {
  const { from, to, outputDir } = parseArgs();

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created output folder: ${outputDir}`);
  }

  const total = to - from + 1;
  console.log(`\n⬇️  Downloading Tango answer images ${from}–${to} (${total} files)`);
  console.log(`📂 Output folder: ${outputDir}\n`);

  let succeeded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = from; i <= to; i++) {
    const paddedNum = String(i).padStart(3, '0');
    const fileName = `tango-${paddedNum}.jpg`;
    const dest = path.join(outputDir, fileName);

    if (fs.existsSync(dest)) {
      console.log(`⏭️  Skipping ${fileName} (already exists)`);
      skipped++;
      continue;
    }

    const url = await tryFindUrl(i);

    if (!url) {
      process.stdout.write(`❌ No URL found for ${fileName} (tried all paths)\n`);
      failed++;
      continue;
    }

    try {
      process.stdout.write(`⬇️  Downloading ${fileName}...`);
      await downloadFile(url, dest);
      process.stdout.write(' ✅\n');
      succeeded++;
    } catch (err) {
      process.stdout.write(` ❌ (${(err as Error).message})\n`);
      failed++;
    }
  }

  console.log('\n📊 Download Summary:');
  console.log('--------------------');
  console.log(`📦 Total requested: ${total}`);
  console.log(`⏭️  Skipped (already exist): ${skipped}`);
  console.log(`✅ Downloaded: ${succeeded}`);
  console.log(`❌ Failed: ${failed}`);
}

download();
