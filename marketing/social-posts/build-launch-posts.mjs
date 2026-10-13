// Builds the launch posts: single-image 4:5 posts (1080×1350) for Instagram,
// Facebook and LinkedIn, in the app's palette and fonts.
//
//   node marketing/social-posts/build-launch-posts.mjs
//
// Writes launch-posts/*.png and a contact sheet, launch-posts/_all.png.
// Text is drawn as outlines from the apps' own fonts (Manrope, DM Sans), so
// the result doesn't depend on what fonts this machine has.

import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import opentype from 'opentype.js';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
const out = join(here, 'launch-posts');
mkdirSync(out, { recursive: true });

const W = 1080;
const H = 1350;
const M = 84; // side margin

const C = {
  forest: '#183B32',
  forestDeep: '#10291F',
  cream: '#F7F5EF',
  sage: '#DDE7DC',
  sageSoft: '#EEF3ED',
  terracotta: '#C96F4A',
  terracottaDeep: '#A2502E',
  terracottaSoft: '#F4E3D8',
  charcoal: '#252B28',
  muted: '#66716B',
  white: '#FFFFFF',
  border: '#E4E1D8',
  inset: '#F1EEE6',
};
const TONES = {
  success: { bg: C.sage, ink: '#2E6B4E' },
  warning: { bg: '#F6E6DC', ink: C.terracottaDeep },
  partial: { bg: '#F6EDC9', ink: '#7F6419' },
  danger: { bg: '#F9E4E1', ink: '#B3362C' },
  green: { bg: C.sage, ink: C.forest },
  neutral: { bg: '#EFEDE6', ink: '#4F5552' },
  dark: { bg: 'rgba(247,245,239,0.12)', ink: C.cream },
};

const fonts = createRequire(join(root, 'mobile/coaches/package.json'));
const load = (path) => opentype.loadSync(fonts.resolve(path));
const F = {
  display: load('@expo-google-fonts/manrope/800ExtraBold/Manrope_800ExtraBold.ttf'),
  bold: load('@expo-google-fonts/manrope/700Bold/Manrope_700Bold.ttf'),
  text: load('@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf'),
  medium: load('@expo-google-fonts/dm-sans/500Medium/DMSans_500Medium.ttf'),
  strong: load('@expo-google-fonts/dm-sans/700Bold/DMSans_700Bold.ttf'),
};

// ---------------------------------------------------------------- text

function measure(font, text, size, tracking = 0) {
  return font.getAdvanceWidth(text, size) + tracking * size * Math.max(0, text.length - 1);
}

function glyphs(font, text, size, x, y, fill, tracking = 0) {
  if (!tracking) return `<path fill="${fill}" d="${font.getPath(text, x, y, size).toPathData(2)}"/>`;
  let cursor = x;
  let d = '';
  for (const ch of text) {
    d += font.getPath(ch, cursor, y, size).toPathData(2);
    cursor += font.getAdvanceWidth(ch, size) + tracking * size;
  }
  return `<path fill="${fill}" d="${d}"/>`;
}

/** One line; `anchor` is start, middle or end. */
function text(font, value, size, x, y, fill, { anchor = 'start', tracking = 0 } = {}) {
  const width = measure(font, value, size, tracking);
  const left = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
  return glyphs(font, value, size, left, y, fill, tracking);
}

/** Greedy word wrap to `maxWidth`. */
function wrapWords(font, value, size, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of value.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(font, next.replace(/\*/g, ''), size) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * A wrapped block where *starred* words take the accent colour. Returns the
 * SVG and the y of the last baseline, so the next block can follow it.
 */
function block(font, value, size, x, y, fill, { accent = C.terracotta, maxWidth = W - 2 * M, lineHeight = 1.12 } = {}) {
  const lines = value.includes('\n') ? value.split('\n') : wrapWords(font, value, size, maxWidth);
  let svg = '';
  let baseline = y;
  let accentOn = false;
  lines.forEach((line, index) => {
    baseline = y + index * size * lineHeight;
    let cursor = x;
    for (const part of line.split(/(\*)/)) {
      if (part === '*') {
        accentOn = !accentOn;
        continue;
      }
      if (!part) continue;
      svg += glyphs(font, part, size, cursor, baseline, accentOn ? accent : fill);
      cursor += measure(font, part, size);
    }
  });
  return { svg, bottom: baseline };
}

// ---------------------------------------------------------------- pieces

function chip(label, x, y, tone = 'green', { size = 24, anchor = 'start' } = {}) {
  const { bg, ink } = TONES[tone];
  const padX = size * 0.75;
  const h = size * 1.9;
  const w = measure(F.strong, label, size) + 2 * padX;
  const left = anchor === 'end' ? x - w : x;
  return {
    svg:
      `<rect x="${left}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${bg}"/>` +
      text(F.strong, label, size, left + padX, y + h / 2 + size * 0.36, ink),
    width: w,
    height: h,
  };
}

function card(x, y, w, h, { fill = C.white, radius = 36, stroke = C.border } = {}) {
  return (
    `<rect x="${x}" y="${y + 10}" width="${w}" height="${h}" rx="${radius}" fill="#10291F" opacity="0.06"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`
  );
}

function avatar(initials, cx, cy, r = 34) {
  return (
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.terracottaSoft}"/>` +
    text(F.strong, initials, r * 0.72, cx, cy + r * 0.26, C.terracottaDeep, { anchor: 'middle' })
  );
}

function button(label, x, y, w, h, primary) {
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22" fill="${primary ? C.forest : C.white}" stroke="${primary ? C.forest : C.border}" stroke-width="2"/>` +
    text(F.strong, label, 30, x + w / 2, y + h / 2 + 11, primary ? C.cream : C.forest, { anchor: 'middle' })
  );
}

/** The wordmark: CoachFolio with the terracotta bar under it, as on the app icons. */
function wordmark(x, y, size, ink) {
  const width = measure(F.display, 'CoachFolio', size, -0.02);
  const bar = size * 0.09;
  return (
    glyphs(F.display, 'CoachFolio', size, x, y, ink, -0.02) +
    `<rect x="${x}" y="${y + bar * 0.9}" width="${width}" height="${bar}" fill="${C.terracotta}"/>`
  );
}

/** Top: the wordmark. Bottom: the site. Shared by every post so they read as a set. */
function frame(content, dark) {
  const bg = dark ? C.forest : C.cream;
  const ink = dark ? C.cream : C.forest;
  const soft = dark ? C.sage : C.muted;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" fill="${bg}"/>` +
    wordmark(M, 112, 40, ink) +
    content +
    `<rect x="${M}" y="${H - 128}" width="${W - 2 * M}" height="2" fill="${dark ? 'rgba(247,245,239,0.18)' : C.border}"/>` +
    text(F.strong, 'coachfolio.in', 30, M, H - 70, ink) +
    text(F.medium, 'Early access for coaches', 28, W - M, H - 70, soft, { anchor: 'end' }) +
    `</svg>`
  );
}

async function screenshot(file, crop, x, y, width) {
  const buffer = await sharp(join(root, file)).extract(crop).png().toBuffer();
  const height = Math.round((crop.height / crop.width) * width);
  const id = `clip${Math.round(x)}${Math.round(y)}`;
  return {
    svg:
      card(x - 14, y - 14, width + 28, height + 28, { radius: 44 }) +
      `<defs><clipPath id="${id}"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="30"/></clipPath></defs>` +
      `<image x="${x}" y="${y}" width="${width}" height="${height}" clip-path="url(#${id})" href="data:image/png;base64,${buffer.toString('base64')}"/>`,
    height,
  };
}

// ---------------------------------------------------------------- posts

const posts = [];

// 1. Introduction
posts.push({
  name: '01-coaching-without-the-chaos',
  dark: true,
  build: async () => {
    const tag = chip('For online fitness coaches', M, 236, 'dark', { size: 26 });
    const head = block(F.display, 'Coaching,\nwithout the\n*chaos.*', 132, M, 470, C.cream, { lineHeight: 1.02 });
    const sub = block(
      F.text,
      'Clients, plans, check-ins and payments in one app, so your day goes to coaching instead of admin.',
      40,
      M,
      head.bottom + 120,
      C.sage,
      { maxWidth: 820, lineHeight: 1.35 },
    );
    const rows = ['Client roster', 'Workout + diet plans', 'Check-ins + progress', 'UPI payments'];
    let chips = '';
    let cx = M;
    let cy = sub.bottom + 70;
    for (const label of rows) {
      const c = chip(label, cx, cy, 'dark', { size: 24 });
      if (cx + c.width > W - M) {
        cx = M;
        cy += c.height + 16;
      }
      chips += chip(label, cx, cy, 'dark', { size: 24 }).svg;
      cx += c.width + 14;
    }
    return tag.svg + head.svg + sub.svg + chips;
  },
});

// 2. The problem
posts.push({
  name: '02-five-places',
  build: async () => {
    const head = block(F.display, 'Your coaching lives in *five* places.', 84, M, 270, C.forest, { maxWidth: 880, lineHeight: 1.08 });
    const rows = [
      ['Plans', 'old PDFs'],
      ['Check-ins', 'WhatsApp'],
      ['Progress photos', 'camera roll'],
      ['Fees', 'a spreadsheet'],
      ['Renewals', 'your memory'],
    ];
    let svg = '';
    let y = head.bottom + 70;
    const rowH = 104;
    for (const [what, where] of rows) {
      svg += card(M, y, W - 2 * M, rowH - 18, { radius: 26 });
      svg += text(F.bold, what, 36, M + 34, y + 56, C.forest);
      const whereWidth = measure(F.medium, where, 32);
      const rx = W - M - 34;
      svg += text(F.medium, where, 32, rx, y + 55, C.muted, { anchor: 'end' });
      svg += `<rect x="${rx - whereWidth - 8}" y="${y + 43}" width="${whereWidth + 16}" height="4" rx="2" fill="${C.terracotta}"/>`;
      y += rowH;
    }
    y += 26;
    svg += `<rect x="${M}" y="${y}" width="${W - 2 * M}" height="112" rx="30" fill="${C.forest}"/>`;
    svg += text(F.display, 'One app: CoachFolio', 44, W / 2, y + 72, C.cream, { anchor: 'middle' });
    return head.svg + svg;
  },
});

// 3. Needs attention
posts.push({
  name: '03-who-needs-you-today',
  build: async () => {
    const head = block(F.display, 'Open the app. See *who needs you* today.', 84, M, 270, C.forest, { maxWidth: 900, lineHeight: 1.08 });
    const top = head.bottom + 64;
    const people = [
      ['RV', 'Rahul Verma', 'No check-in for 4 days', ['Gone quiet', 'danger']],
      ['PS', 'Priya Sharma', 'Says she paid ₹4,500', ['Confirm payment', 'partial']],
      ['KM', 'Karan Mehta', 'Plan ends in 5 days', ['Renewal due', 'warning']],
      ['AD', 'Anita Desai', 'Checked in today', null],
    ];
    const rowH = 132;
    const h = 120 + people.length * rowH;
    let svg = card(M, top, W - 2 * M, h);
    svg += text(F.display, 'Roster', 40, M + 40, top + 76, C.forest);
    svg += chip('3 need attention', W - M - 40, top + 36, 'warning', { size: 22, anchor: 'end' }).svg;
    people.forEach(([initials, name, meta, flag], index) => {
      const y = top + 110 + index * rowH;
      svg += `<rect x="${M + 26}" y="${y}" width="${W - 2 * M - 52}" height="${rowH - 16}" rx="24" fill="${C.cream}"/>`;
      svg += avatar(initials, M + 86, y + (rowH - 16) / 2);
      svg += text(F.strong, name, 32, M + 140, y + 50, C.charcoal);
      svg += text(F.text, meta, 26, M + 140, y + 88, C.muted);
      if (flag) svg += chip(flag[0], W - M - 50, y + 36, flag[1], { size: 22, anchor: 'end' }).svg;
    });
    const sub = block(F.text, 'Quiet clients, renewals and payments surface on their own. Nothing slips.', 34, M, top + h + 74, C.muted, {
      maxWidth: 900,
      lineHeight: 1.35,
    });
    return head.svg + svg + sub.svg;
  },
});

// 4. UPI payments
posts.push({
  name: '04-paid-to-your-upi',
  dark: true,
  build: async () => {
    const head = block(F.display, 'Get paid straight to *your UPI.*', 88, M, 270, C.cream, { maxWidth: 900, lineHeight: 1.06 });
    const sub = block(
      F.text,
      'Your client taps Pay. Their UPI app opens with your fee filled in. You confirm it and share the receipt in one tap.',
      34,
      M,
      head.bottom + 76,
      C.sage,
      { maxWidth: 880, lineHeight: 1.35 },
    );
    const top = sub.bottom + 64;
    const w = W - 2 * M;
    let svg = card(M, top, w, 520, { stroke: 'transparent' });
    svg += text(F.medium, 'Payment', 28, M + 44, top + 70, C.muted);
    svg += text(F.display, '₹4,500', 72, M + 44, top + 160, C.forest);
    svg += text(F.text, 'For 1 Nov – 30 Nov', 28, M + 44, top + 206, C.muted);
    svg += chip('Payment due', M + w - 44, top + 46, 'warning', { size: 24, anchor: 'end' }).svg;
    svg += `<rect x="${M + 44}" y="${top + 240}" width="${w - 88}" height="96" rx="22" fill="${C.inset}"/>`;
    svg += text(F.text, 'UPI ID', 24, M + 72, top + 280, C.muted);
    svg += text(F.strong, 'yourname@okaxis', 30, M + 72, top + 318, C.forest);
    svg += button('Pay with UPI', M + 44, top + 364, w - 88, 72, true);
    svg += text(F.strong, 'I’ve paid', 28, M + w / 2, top + 480, C.forest, { anchor: 'middle' });
    const badge = chip('0% commission', M, top + 560, 'dark', { size: 26 });
    const badge2 = chip('No payment gateway', M + badge.width + 14, top + 560, 'dark', { size: 26 });
    return head.svg + sub.svg + svg + badge.svg + badge2.svg;
  },
});

// 5. Workout logging
posts.push({
  name: '05-every-set-logged',
  build: async () => {
    const head = block(F.display, 'Every set logged. Every *PR* visible.', 86, M, 270, C.forest, { maxWidth: 900, lineHeight: 1.08 });
    const w = W - 2 * M;
    let top = head.bottom + 64;
    // The client's set sheet.
    let svg = card(M, top, w, 330);
    svg += chip('Client app · Set 2', M + 40, top + 36, 'green', { size: 22 }).svg;
    svg += text(F.display, 'Bench press', 44, M + 40, top + 138, C.forest);
    const fieldW = (w - 80 - 24) / 2;
    [['Weight (kg)', '62.5'], ['Reps', '6']].forEach(([label, value], index) => {
      const fx = M + 40 + index * (fieldW + 24);
      svg += text(F.medium, label, 24, fx, top + 186, C.muted);
      svg += `<rect x="${fx}" y="${top + 200}" width="${fieldW}" height="74" rx="18" fill="${C.white}" stroke="${C.border}" stroke-width="2"/>`;
      svg += text(F.strong, value, 34, fx + 24, top + 249, C.charcoal);
    });
    svg += text(F.text, 'Last time (9 Oct): 60 kg × 6', 26, M + 40, top + 310, C.terracottaDeep);
    // The coach's strength card.
    top += 330 + 40;
    svg += card(M, top, w, 250);
    svg += chip('Coach app · Strength', M + 40, top + 36, 'neutral', { size: 22 }).svg;
    svg += text(F.strong, 'Bench press', 36, M + 40, top + 136, C.charcoal);
    svg += text(F.text, 'Latest 62.5 kg × 6 · Best 65 kg × 5', 28, M + 40, top + 182, C.muted);
    svg += chip('+5 kg', W - M - 40, top + 106, 'success', { size: 30, anchor: 'end' }).svg;
    svg += text(F.text, 'Over the last 12 weeks', 24, M + 40, top + 222, C.muted);
    const sub = block(F.text, 'Clients log weight and reps per set. You see every client’s strength trend.', 32, M, top + 250 + 70, C.muted, {
      maxWidth: 900,
      lineHeight: 1.35,
    });
    return head.svg + svg + sub.svg;
  },
});

// 6. Real screenshot: the month at a glance
posts.push({
  name: '06-month-at-a-glance',
  build: async () => {
    const head = block(F.display, 'Every client’s month, *at a glance.*', 80, M, 260, C.forest, { maxWidth: 900, lineHeight: 1.08 });
    const shot = await screenshot(
      'docs/theme-screens/coach/light/client-detail.png',
      { left: 30, top: 2760, width: 720, height: 780 },
      280,
      head.bottom + 64,
      520,
    );
    const sub = block(F.text, 'Workouts and meals logged each day, side by side with weight, photos and notes.', 32, M, head.bottom + 64 + shot.height + 80, C.muted, {
      maxWidth: 900,
      lineHeight: 1.35,
    });
    return head.svg + shot.svg + sub.svg;
  },
});

// 7. Real screenshot: the client's day
posts.push({
  name: '07-clients-know-today',
  dark: true,
  build: async () => {
    const head = block(F.display, 'Your clients always know *today’s plan.*', 80, M, 260, C.cream, { maxWidth: 900, lineHeight: 1.08 });
    const shot = await screenshot(
      'docs/theme-screens/client/light/workout.png',
      { left: 30, top: 620, width: 720, height: 780 },
      280,
      head.bottom + 64,
      520,
    );
    const sub = block(F.text, 'Sets to tick off, meals to log, and a comment box to you on every set. No more “which PDF?”', 32, M, head.bottom + 64 + shot.height + 80, C.sage, {
      maxWidth: 900,
      lineHeight: 1.35,
    });
    return head.svg + shot.svg + sub.svg;
  },
});

// 8. Early access
posts.push({
  name: '08-built-with-coaches',
  build: async () => {
    const head = block(F.display, 'We’re building CoachFolio *with coaches.*', 92, M, 300, C.forest, { maxWidth: 900, lineHeight: 1.06 });
    const body = block(
      F.text,
      'We’re opening early access to a small group of online coaches in India. Use it with your real clients and tell us what’s missing. We build what you ask for.',
      36,
      M,
      head.bottom + 90,
      C.charcoal,
      { maxWidth: 880, lineHeight: 1.4 },
    );
    const top = body.bottom + 90;
    let svg = `<rect x="${M}" y="${top}" width="${W - 2 * M}" height="150" rx="36" fill="${C.forest}"/>`;
    svg += text(F.medium, 'Join early access', 30, M + 48, top + 62, C.sage);
    svg += text(F.display, 'coachfolio.in', 50, M + 48, top + 118, C.cream);
    svg += `<circle cx="${W - M - 80}" cy="${top + 75}" r="40" fill="${C.terracotta}"/>`;
    svg += `<path d="M${W - M - 96} ${top + 75}h32m-12 -13l13 13l-13 13" fill="none" stroke="${C.cream}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
    const note = text(F.text, 'Link in bio', 28, M, top + 210, C.muted);
    return head.svg + body.svg + svg + note;
  },
});

// ---------------------------------------------------------------- render

const rendered = [];
for (const post of posts) {
  const svg = frame(await post.build(), post.dark);
  const file = join(out, `${post.name}.png`);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(file);
  rendered.push(file);
  console.log(`wrote ${post.name}.png`);
}

// A sheet of all of them, to check the set at a glance.
const thumbs = await Promise.all(rendered.map((file) => sharp(file).resize(360).png().toBuffer()));
const cols = 4;
const thumbH = Math.round((360 * H) / W);
await sharp({ create: { width: cols * 380 + 20, height: Math.ceil(thumbs.length / cols) * (thumbH + 20) + 20, channels: 3, background: '#CFCBC0' } })
  .composite(thumbs.map((input, index) => ({ input, left: 20 + (index % cols) * 380, top: 20 + Math.floor(index / cols) * (thumbH + 20) })))
  .png()
  .toFile(join(out, '_all.png'));
console.log('wrote _all.png');
