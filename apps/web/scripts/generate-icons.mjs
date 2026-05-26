import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

mkdirSync(join(publicDir, 'icons'), { recursive: true });

// BasketPass icon: basketball on dark-blue rounded square
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0D1530"/>
  <circle cx="256" cy="256" r="172" fill="#F97316"/>
  <path d="M84 256 Q256 140 428 256" stroke="white" stroke-width="16" fill="none" stroke-linecap="round"/>
  <path d="M84 256 Q256 372 428 256" stroke="white" stroke-width="16" fill="none" stroke-linecap="round"/>
  <line x1="256" y1="84" x2="256" y2="428" stroke="white" stroke-width="16"/>
</svg>`;

const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];

for (const size of sizes) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(join(publicDir, 'icons', `icon-${size}x${size}.png`));
  console.log(`  ✓ icon-${size}x${size}.png`);
}

// favicon 32x32
await sharp(Buffer.from(svg)).resize(32, 32).png().toFile(join(publicDir, 'favicon-32x32.png'));
console.log('  ✓ favicon-32x32.png');

console.log('Icons generated successfully.');
