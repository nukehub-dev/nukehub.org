#!/usr/bin/env node
/**
 * Regenerates the PWA PNG icons from the SVG masters in public/.
 *
 * Android launchers mask icons (circle, squircle, teardrop, ...), so the
 * artwork must sit inside the maskable "safe zone": a centered circle with a
 * diameter of 80% of the canvas. The artwork bounding box is scaled to 70%
 * of the canvas (~15% padding per side) so no mask shape can crop it.
 *
 * Run from the repo root:  node scripts/generate-icons.mjs
 */
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const SAFE_SCALE = 0.7; // artwork bbox vs. canvas; maskable safe zone is 0.8
const BG = "#0a0a0a"; // matches the opaque background of the shipped icons

const ICONS = [
  { svg: "public/favicon.svg", out: "public/icon-512.png", size: 512, bg: BG },
  { svg: "public/favicon.svg", out: "public/icon-192.png", size: 192, bg: BG },
  {
    svg: "public/favicon.svg",
    out: "public/apple-touch-icon.png",
    size: 180,
    bg: BG,
  },
  {
    svg: "public/icon-monochrome.svg",
    out: "public/icon-monochrome-512.png",
    size: 512,
    bg: null,
  },
  {
    svg: "public/icon-monochrome.svg",
    out: "public/icon-monochrome-192.png",
    size: 192,
    bg: null,
  },
];

for (const { svg, out, size, bg } of ICONS) {
  const artSize = Math.round(size * SAFE_SCALE);
  // Rasterize the SVG at ~2k px, trim to the artwork bbox, then scale down so
  // the final artwork is centered with even padding on all sides.
  const art = await sharp(await readFile(svg), { density: 150 })
    .trim()
    .resize({ width: artSize, height: artSize, fit: "inside" })
    .toBuffer();

  let icon = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: bg ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite([{ input: art, gravity: "center" }]);

  if (bg) icon = icon.flatten({ background: bg }).removeAlpha(); // 3-channel opaque
  // Palette PNG: lossless for this flat-color artwork (no dither needed),
  // ~40% smaller than truecolor output.
  await icon
    .png({ compressionLevel: 9, palette: true, quality: 100, dither: 0 })
    .toFile(out);
  console.log(`wrote ${out} (${size}x${size}, artwork ${artSize}px)`);
}
