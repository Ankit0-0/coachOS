// Builds every CoachFolio icon from one wordmark recipe.
//
//   node scripts/build-icons.mjs
//
// Writes the SVG sources to docs/brand/, rasterizes them with sharp into each
// app's assets/images/ and the landing page's public/, and renders a contact
// sheet (docs/brand/icon-preview.png) to check them by eye.
//
// Words are drawn as outlines from the apps' own fonts (Manrope for the
// wordmark, DM Sans for the tagline), so the SVGs render the same on any
// machine whatever fonts it has installed.

import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import opentype from 'opentype.js';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const brandDir = join(root, 'docs/brand');
mkdirSync(brandDir, { recursive: true });

// The palette from packages/theme and the landing page.
const FOREST = '#183B32';
const CREAM = '#F7F5EF';
const TERRACOTTA = '#C96F4A';
const SAGE = '#DDE7DC';

const fontsFrom = createRequire(join(root, 'mobile/coaches/package.json'));
const heading = opentype.loadSync(fontsFrom.resolve('@expo-google-fonts/manrope/800ExtraBold/Manrope_800ExtraBold.ttf'));
const body = opentype.loadSync(fontsFrom.resolve('@expo-google-fonts/dm-sans/500Medium/DMSans_500Medium.ttf'));

/** Android crops the adaptive foreground to a circle this wide, centred on 1024. */
const ADAPTIVE_SAFE_DIAMETER = 660;

/** Glyph outlines for `text` at `size`, with tracking as a fraction of the size. */
function outline(font, text, size, tracking) {
  const scale = size / font.unitsPerEm;
  const path = new opentype.Path();
  let x = 0;
  const glyphs = font.stringToGlyphs(text);
  glyphs.forEach((glyph, index) => {
    path.extend(glyph.getPath(x, 0, size));
    x += glyph.advanceWidth * scale + tracking * size;
    const next = glyphs[index + 1];
    if (next) x += font.getKerningValue(glyph, next) * scale;
  });
  return path;
}

/**
 * The wordmark: `text` in cream, tight and heavy, with a terracotta bar under
 * it — the bar as wide as the word, an eighth of the cap height thick, half its
 * thickness below the baseline. Sized so the word's ink is `width` wide (or
 * `height` tall, for one letter), and the whole block sits a little above the
 * centre of a `canvas`-sized square, which reads as centred.
 */
function wordmark(text, { canvas, width, height, minBarWidth = 0, font = heading, tracking = -0.02, lift = 0.03 }) {
  const probe = outline(font, text, 100, tracking).getBoundingBox();
  const size = width ? (100 * width) / (probe.x2 - probe.x1) : (100 * height) / (probe.y2 - probe.y1);
  const path = outline(font, text, size, tracking);
  const ink = path.getBoundingBox();

  const capHeight = (font.tables.os2.sCapHeight / font.unitsPerEm) * size;
  const bar = capHeight / 8;
  const gap = bar / 2;
  const barWidth = Math.max(ink.x2 - ink.x1, minBarWidth);

  // Ink runs from the top of the tallest letter to the bottom of the bar; the
  // baseline is y = 0 in the outline's coordinates.
  const blockTop = ink.y1;
  const blockBottom = Math.max(ink.y2, 0) + gap + bar;
  const dx = canvas / 2 - (ink.x1 + ink.x2) / 2;
  const dy = canvas / 2 - (blockTop + blockBottom) / 2 - lift * canvas;

  const barX = canvas / 2 - barWidth / 2;
  const barY = Math.max(ink.y2, 0) + gap + dy;
  const box = {
    x1: Math.min(ink.x1 + dx, barX),
    x2: Math.max(ink.x2 + dx, barX + barWidth),
    y1: blockTop + dy,
    y2: barY + bar,
  };
  const svg = (wordColor = CREAM, barColor = TERRACOTTA) =>
    `<g><path transform="translate(${dx.toFixed(2)} ${dy.toFixed(2)})" fill="${wordColor}" d="${path.toPathData(2)}"/>` +
    `<rect x="${barX.toFixed(2)}" y="${barY.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${bar.toFixed(2)}" fill="${barColor}"/></g>`;
  return { svg, box };
}

const doc = (size, content, background) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size.w}" height="${size.h}" viewBox="0 0 ${size.w} ${size.h}">` +
  (background ? `<rect width="100%" height="100%" fill="${background}"/>` : '') +
  `${content}</svg>\n`;

const square = (n) => ({ w: n, h: n });
const written = [];

async function emit(name, svg, outputs) {
  const source = join(brandDir, `${name}.svg`);
  writeFileSync(source, svg);
  for (const { file, size } of outputs) {
    mkdirSync(dirname(file), { recursive: true });
    await sharp(Buffer.from(svg), { density: 72 * (size / svgWidth(svg)) })
      .resize(size, Math.round((size * svgHeight(svg)) / svgWidth(svg)))
      .png({ compressionLevel: 9 })
      .toFile(file);
    written.push({ file, size });
  }
}
const svgWidth = (svg) => Number(/width="(\d+)"/.exec(svg)[1]);
const svgHeight = (svg) => Number(/height="(\d+)"/.exec(svg)[1]);

function assertInsideSafeCircle(name, box) {
  const centre = 512;
  const radius = ADAPTIVE_SAFE_DIAMETER / 2;
  const corners = [
    [box.x1, box.y1],
    [box.x2, box.y1],
    [box.x1, box.y2],
    [box.x2, box.y2],
  ];
  const farthest = Math.max(...corners.map(([x, y]) => Math.hypot(x - centre, y - centre)));
  if (farthest > radius) {
    throw new Error(`${name}: ink reaches ${farthest.toFixed(1)}px from the centre, outside the ${radius}px safe circle`);
  }
  console.log(`${name}: ink within ${farthest.toFixed(1)}px of centre (safe radius ${radius}px)`);
}

const apps = [
  { dir: 'mobile/coaches', key: 'coach', word: 'coach', letter: 'c' },
  { dir: 'mobile/clients', key: 'client', word: 'client', letter: 'l' },
];

for (const app of apps) {
  const images = join(root, app.dir, 'assets/images');

  // App Store and Play Store icon: opaque, full bleed, the OS masks it.
  const icon = wordmark(app.word, { canvas: 1024, width: 0.7 * 1024 });
  await emit(`icon-${app.key}`, doc(square(1024), icon.svg(), FOREST), [{ file: join(images, 'icon.png'), size: 1024 }]);

  // Android adaptive icon: foreground on a solid background layer, cropped to
  // a circle (or squircle) by the launcher, so the word is smaller.
  const adaptive = wordmark(app.word, { canvas: 1024, width: 0.56 * 1024 });
  assertInsideSafeCircle(`${app.key} adaptive foreground`, adaptive.box);
  await emit(`adaptive-foreground-${app.key}`, doc(square(1024), adaptive.svg()), [
    { file: join(images, 'android-icon-foreground.png'), size: 1024 },
  ]);
  // Android 13 themed icons tint this one colour, so word and bar are both white.
  await emit(`adaptive-monochrome-${app.key}`, doc(square(1024), adaptive.svg('#FFFFFF', '#FFFFFF')), [
    { file: join(images, 'android-icon-monochrome.png'), size: 1024 },
  ]);
  await emit(`adaptive-background-${app.key}`, doc(square(1024), '', FOREST), [
    { file: join(images, 'android-icon-background.png'), size: 1024 },
  ]);

  // Splash: transparent, drawn over the splash background colour.
  const splash = wordmark(app.word, { canvas: 1024, width: 0.5 * 1024 });
  await emit(`splash-${app.key}`, doc(square(1024), splash.svg()), [{ file: join(images, 'splash-icon.png'), size: 1024 }]);

  // Favicon: the full word is unreadable at 16px, so one letter.
  const favicon = wordmark(app.letter, { canvas: 48, height: 0.5 * 48, minBarWidth: 0.42 * 48, lift: 0.02 });
  await emit(`favicon-${app.key}`, doc(square(48), favicon.svg(), FOREST), [
    { file: join(images, 'favicon.png'), size: 48 },
    { file: join(images, 'favicon-32.png'), size: 32 },
    { file: join(images, 'favicon-16.png'), size: 16 },
  ]);
}

// Landing page: a `cf` monogram favicon and the Open Graph card.
const landing = join(root, 'landing-page/public');
const monogram = wordmark('cf', { canvas: 48, height: 0.52 * 48, lift: 0.02 });
await emit('favicon-landing', doc(square(48), monogram.svg(), FOREST), [
  { file: join(landing, 'favicon.png'), size: 48 },
  { file: join(brandDir, 'favicon-landing-32.png'), size: 32 },
  { file: join(brandDir, 'favicon-landing-16.png'), size: 16 },
]);
writeFileSync(
  join(landing, 'favicon.ico'),
  await ico([
    join(brandDir, 'favicon-landing-16.png'),
    join(brandDir, 'favicon-landing-32.png'),
    join(landing, 'favicon.png'),
  ]),
);

const og = wordmark('CoachFolio', { canvas: 1200, width: 600, lift: 0.07 });
const ogShift = (630 - 1200) / 2; // wordmark() centres on a square; move it into the 630-tall card.
const tagline = outline(body, 'Coaching, without the chaos.', 40, 0);
const taglineBox = tagline.getBoundingBox();
const taglineX = 600 - (taglineBox.x1 + taglineBox.x2) / 2;
const taglineY = og.box.y2 + ogShift + 72;
await emit(
  'og-image',
  doc(
    { w: 1200, h: 630 },
    `<g transform="translate(0 ${ogShift})">${og.svg()}</g>` +
      `<path transform="translate(${taglineX.toFixed(2)} ${taglineY.toFixed(2)})" fill="${SAGE}" d="${tagline.toPathData(2)}"/>`,
    FOREST,
  ),
  [{ file: join(landing, 'og-image.png'), size: 1200 }],
);

/** An .ico holding PNG images, which every current browser reads. */
async function ico(files) {
  const images = await Promise.all(
    files.map(async (file) => ({ data: await sharp(file).png().toBuffer(), size: (await sharp(file).metadata()).width })),
  );
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ data, size }, index) => {
    const entry = 6 + 16 * index;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map(({ data }) => data)]);
}

await contactSheet();

/**
 * Every generated image at its real size and at 48px, and each adaptive
 * foreground on its background layer under a circle and a squircle mask, with
 * the safe circle drawn in.
 */
async function contactSheet() {
  const label = (text, x, y) => {
    const path = outline(body, text, 22, 0);
    return `<path transform="translate(${x} ${y})" fill="#252B28" d="${path.toPathData(1)}"/>`;
  };
  const dataUri = async (file, size) =>
    `data:image/png;base64,${(await sharp(file).resize(size, Math.round(size * ((await sharp(file).metadata()).height / (await sharp(file).metadata()).width))).png().toBuffer()).toString('base64')}`;

  const pad = 40;
  const items = [];
  let x = pad;
  let y = pad + 30;
  let rowHeight = 0;
  const sheetWidth = 4400;

  for (const { file, size } of written) {
    if (file.includes('favicon-landing-')) continue; // only inputs to the .ico
    const meta = await sharp(file).metadata();
    // Wide enough for the label even when the image is tiny.
    const tileWidth = Math.max(meta.width + 48 + 3 * pad, 560);
    if (x + tileWidth > sheetWidth) {
      x = pad;
      y += rowHeight + pad + 30;
      rowHeight = 0;
    }
    const name = file.slice(root.length + 1).replace(/\\/g, '/');
    // A dark checkerboard behind transparent images shows where the cream ink ends.
    items.push(
      `<rect x="${x}" y="${y}" width="${meta.width}" height="${meta.height}" fill="url(#checks)"/>`,
      `<image x="${x}" y="${y}" width="${meta.width}" height="${meta.height}" href="${await dataUri(file, meta.width)}"/>`,
      `<rect x="${x + meta.width + pad}" y="${y}" width="48" height="${Math.round((48 * meta.height) / meta.width)}" fill="url(#checks)"/>`,
      `<image x="${x + meta.width + pad}" y="${y}" width="48" height="${Math.round((48 * meta.height) / meta.width)}" href="${await dataUri(file, 48)}"/>`,
      label(`${name}  ${meta.width}×${meta.height}`, x, y - 10),
    );
    x += tileWidth;
    rowHeight = Math.max(rowHeight, meta.height);
    void size;
  }

  // Adaptive icons as a launcher shows them.
  x = pad;
  y += rowHeight + pad + 30;
  const radius = ADAPTIVE_SAFE_DIAMETER / 2;
  for (const app of apps) {
    const foreground = await dataUri(join(root, app.dir, 'assets/images/android-icon-foreground.png'), 1024);
    for (const [shape, clip] of [
      ['circle', `<circle cx="512" cy="512" r="512"/>`],
      ['squircle', `<path d="M512 0C870 0 1024 154 1024 512S870 1024 512 1024 0 870 0 512 154 0 512 0Z"/>`],
    ]) {
      const id = `${app.key}-${shape}`;
      items.push(
        `<clipPath id="${id}">${clip}</clipPath>`,
        `<g transform="translate(${x} ${y})"><g clip-path="url(#${id})"><rect width="1024" height="1024" fill="${FOREST}"/>` +
          `<image width="1024" height="1024" href="${foreground}"/></g>` +
          `<circle cx="512" cy="512" r="${radius}" fill="none" stroke="#FF3B30" stroke-width="2" stroke-dasharray="12 10"/></g>`,
        `<g transform="translate(${x + 1024 + pad} ${y})"><g transform="scale(${48 / 1024})"><g clip-path="url(#${id})">` +
          `<rect width="1024" height="1024" fill="${FOREST}"/><image width="1024" height="1024" href="${foreground}"/></g></g></g>`,
        label(`${app.key} adaptive, ${shape} mask (dashed: ${ADAPTIVE_SAFE_DIAMETER}px safe circle)`, x, y - 10),
      );
      x += 1024 + 48 + 3 * pad;
      if (x + 1024 > sheetWidth) {
        x = pad;
        y += 1024 + pad + 30;
      }
    }
  }
  const height = y + (x === pad ? 0 : 1024) + pad;

  const sheet =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetWidth}" height="${height}" viewBox="0 0 ${sheetWidth} ${height}">` +
    `<defs><pattern id="checks" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#3A4A44"/>` +
    `<rect width="8" height="8" fill="#2C3934"/><rect x="8" y="8" width="8" height="8" fill="#2C3934"/></pattern></defs>` +
    `<rect width="100%" height="100%" fill="#FFFFFF"/>${items.join('')}</svg>`;
  await sharp(Buffer.from(sheet)).png({ compressionLevel: 9 }).toFile(join(brandDir, 'icon-preview.png'));
  console.log(`contact sheet: docs/brand/icon-preview.png (${sheetWidth}×${height})`);
}
