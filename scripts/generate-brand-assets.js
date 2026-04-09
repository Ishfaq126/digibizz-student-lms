const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const OUT_DIR = path.join(__dirname, "..", "assets", "images");
const COLORS = {
  saffron: [255, 153, 51, 255],
  gold: [255, 193, 7, 255],
  white: [255, 255, 255, 255],
  charcoal: [31, 41, 55, 255],
};

const FONT = {
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01110"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10001", "10001", "10001", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
};

function createPng(size, bg) {
  const png = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) setPx(png, x, y, bg);
  }
  return png;
}

function setPx(png, x, y, rgba) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const idx = (png.width * y + x) << 2;
  png.data[idx] = rgba[0];
  png.data[idx + 1] = rgba[1];
  png.data[idx + 2] = rgba[2];
  png.data[idx + 3] = rgba[3];
}

function rect(png, x, y, w, h, rgba) {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) setPx(png, xx, yy, rgba);
  }
}

function circle(png, cx, cy, r, rgba) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y += 1) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) setPx(png, x, y, rgba);
    }
  }
}

function drawChar(png, ch, x, y, scale, color) {
  const glyph = FONT[ch] || FONT[" "];
  for (let r = 0; r < glyph.length; r += 1) {
    for (let c = 0; c < glyph[r].length; c += 1) {
      if (glyph[r][c] === "1") rect(png, x + c * scale, y + r * scale, scale, scale, color);
    }
  }
}

function drawText(png, text, x, y, scale, color) {
  let offset = 0;
  for (const ch of text) {
    drawChar(png, ch, x + offset, y, scale, color);
    offset += 6 * scale;
  }
}

function drawCapLogo(png, centerX, centerY, size) {
  const w = Math.floor(size * 0.66);
  const h = Math.floor(size * 0.18);
  // cap top
  for (let i = 0; i < h; i += 1) {
    rect(png, centerX - Math.floor(w / 2) + i, centerY - h + i, w - i * 2, 1, COLORS.white);
    rect(png, centerX - Math.floor(w / 2) + i, centerY + h - i, w - i * 2, 1, COLORS.white);
  }
  // cap base
  rect(png, centerX - Math.floor(size * 0.2), centerY + h, Math.floor(size * 0.4), Math.floor(size * 0.08), COLORS.white);
  // tassel
  rect(png, centerX + Math.floor(size * 0.2), centerY + h, Math.floor(size * 0.02), Math.floor(size * 0.2), COLORS.gold);
  circle(png, centerX + Math.floor(size * 0.21), centerY + Math.floor(size * 0.22), Math.floor(size * 0.03), COLORS.gold);
}

function writePng(name, png) {
  fs.writeFileSync(path.join(OUT_DIR, name), PNG.sync.write(png));
}

function generateIcon() {
  const png = createPng(1024, COLORS.saffron);
  circle(png, 512, 512, 350, [255, 255, 255, 40]);
  drawCapLogo(png, 512, 470, 500);
  drawText(png, "DB", 404, 620, 20, COLORS.white);
  writePng("icon.png", png);
}

function generateAdaptive() {
  const png = createPng(1024, [0, 0, 0, 0]);
  circle(png, 512, 512, 320, COLORS.saffron);
  drawCapLogo(png, 512, 490, 460);
  drawText(png, "DB", 420, 620, 16, COLORS.white);
  writePng("adaptive-icon.png", png);
}

function generateSplash() {
  const png = createPng(1242, COLORS.saffron);
  circle(png, 621, 450, 220, [255, 255, 255, 50]);
  drawCapLogo(png, 621, 430, 360);
  drawText(png, "DIGIBIZZ", 430, 680, 10, COLORS.white);
  drawText(png, "STUDENT LMS", 395, 770, 8, COLORS.gold);
  writePng("splash-icon.png", png);
}

function generateFavicon() {
  const png = createPng(256, COLORS.saffron);
  drawCapLogo(png, 128, 110, 150);
  drawText(png, "DB", 90, 165, 5, COLORS.white);
  writePng("favicon.png", png);
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
generateIcon();
generateAdaptive();
generateSplash();
generateFavicon();
console.log("Digibizz branded assets generated.");
