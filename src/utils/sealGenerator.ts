import { Seal } from "../types";

/**
 * Generates a realistic weathered ancient Chinese seal as a PNG data URL.
 */
export function generateSealDataUrl(seal: Seal): string {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // 1. Setup colors and canvas matching traditional cinnabar stamp ink
  const sealColor = "#A61B1B"; // Deep cinnabar vermilion (朱砂红)
  const xuanColor = "rgba(255, 255, 255, 0)"; // Transparent background so it stamps nicely

  ctx.fillStyle = xuanColor;
  ctx.fillRect(0, 0, size, size);

  // Translate characters & layouts
  const chars = seal.text.split("").slice(0, 4);
  const count = chars.length;

  // Draw seal base shape
  ctx.save();
  ctx.strokeStyle = sealColor;
  ctx.fillStyle = sealColor;
  ctx.lineWidth = 12;
  ctx.lineJoin = "miter";

  const pad = 16;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - pad;

  // Let's draw boundary based on shape
  if (seal.style === "yin") {
    // Yin (阴刻 - white letters on solid red background)
    ctx.beginPath();
    if (seal.shape === "square") {
      ctx.fillRect(pad, pad, size - pad * 2, size - pad * 2);
    } else if (seal.shape === "circle") {
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (seal.shape === "oval") {
      ctx.ellipse(cx, cy, r, r * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (seal.shape === "gourd") {
      // gourd shape (葫芦印): two overlapping vertical circles
      ctx.beginPath();
      ctx.arc(cx, cy - r * 0.35, r * 0.55, 0, Math.PI * 2);
      ctx.arc(cx, cy + r * 0.35, r * 0.65, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Yang (阳刻 - red letters, hollow background with a red outline border)
    ctx.beginPath();
    if (seal.shape === "square") {
      ctx.strokeRect(pad, pad, size - pad * 2, size - pad * 2);
      // Double inner border for prestigious square yang seals
      ctx.lineWidth = 4;
      ctx.strokeRect(pad + 8, pad + 8, size - (pad + 8) * 2, size - (pad + 8) * 2);
    } else if (seal.shape === "circle") {
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (seal.shape === "oval") {
      ctx.ellipse(cx, cy, r, r * 0.72, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (seal.shape === "gourd") {
      // Stroke gourd border
      ctx.arc(cx, cy - r * 0.35, r * 0.55, -Math.PI * 0.1, Math.PI * 1.1);
      ctx.arc(cx, cy + r * 0.35, r * 0.65, Math.PI * 0.9, -Math.PI * 0.1);
      ctx.stroke();
    }
  }
  ctx.restore();

  // 2. Render Text based on traditional layouts (Right to Left, Top to Bottom)
  ctx.save();
  // font family matching selection
  let fontName = "SimSun, serif";
  if (seal.font === "kai") fontName = "KaiTi, STKaiti, serif";
  else if (seal.font === "song") fontName = "SimSun, STSong, serif";
  else if (seal.font === "zhuan") fontName = "'STXingkai', 'LiSu', cursive, serif"; // substitute style

  ctx.font = `900 ${size * 0.22}px ${fontName}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  // White text for yin, Red text for yang
  ctx.fillStyle = seal.style === "yin" ? "rgba(255,255,255,0.95)" : sealColor;

  // Coordinate calculations for grid layouts
  // Traditional seal layout matrix:
  // 4 chars:  [3: Left-Top]   [1: Right-Top]
  //           [4: Left-Bottom][2: Right-Bottom]
  // 3 chars:  [3: Left-Mid]   [1: Right-Top]
  //                           [2: Right-Bottom]  (or Left side holds "印" or "之印")
  // 2 chars:  [2: Left-Center][1: Right-Center]

  const fontScale = size * 0.23;
  ctx.font = `bold ${fontScale}px ${fontName}`;

  if (count === 4) {
    const rX = size * 0.66;
    const lX = size * 0.34;
    const tY = size * 0.34;
    const bY = size * 0.66;

    // Draw Right-Top (Char 1)
    drawElongatedChar(ctx, chars[0], rX, tY, fontScale, seal.font === "zhuan");
    // Draw Right-Bottom (Char 2)
    drawElongatedChar(ctx, chars[1], rX, bY, fontScale, seal.font === "zhuan");
    // Draw Left-Top (Char 3)
    drawElongatedChar(ctx, chars[2], lX, tY, fontScale, seal.font === "zhuan");
    // Draw Left-Bottom (Char 4)
    drawElongatedChar(ctx, chars[3], lX, bY, fontScale, seal.font === "zhuan");
  } else if (count === 3) {
    const rX = size * 0.66;
    const lX = size * 0.34;
    const tY = size * 0.34;
    const bY = size * 0.66;

    // Draw Right-Top (Char 1)
    drawElongatedChar(ctx, chars[0], rX, tY, fontScale, seal.font === "zhuan");
    // Draw Right-Bottom (Char 2)
    drawElongatedChar(ctx, chars[1], rX, bY, fontScale, seal.font === "zhuan");
    // Draw Left-Center (Char 3 - spanning slightly taller)
    drawElongatedChar(ctx, chars[2], lX, size * 0.5, fontScale * 1.1, seal.font === "zhuan");
  } else if (count === 2) {
    const rX = size * 0.64;
    const lX = size * 0.36;
    const cyY = size * 0.5;

    // Draw Right-Center (Char 1)
    drawElongatedChar(ctx, chars[0], rX, cyY, fontScale * 1.15, seal.font === "zhuan");
    // Draw Left-Center (Char 2)
    drawElongatedChar(ctx, chars[1], lX, cyY, fontScale * 1.15, seal.font === "zhuan");
  } else if (count === 1) {
    // 1 single center char
    drawElongatedChar(ctx, chars[0], size / 2, size / 2, fontScale * 1.4, seal.font === "zhuan");
  }
  ctx.restore();

  // 3. Apply weathered/distressed ink-bleed textures (Mottled stone print effect)
  // We do multiple passes of noise generation using randomly drawn flecks or subtractive cuts
  ctx.save();
  const bleedFactor = seal.inkBleed; // 0 to 10

  if (bleedFactor > 0) {
    // Let's perform subtractive scratching (剥蚀)
    // Using destination-out composite mode to carve white cracks/erosion marks randomly or red splashes
    ctx.globalCompositeOperation = seal.style === "yin" ? "destination-out" : "destination-out";

    const crackCount = bleedFactor * 5;
    for (let i = 0; i < crackCount; i++) {
      // Randomly locate scratch dots
      const rx = pad + Math.random() * (size - pad * 2);
      const ry = pad + Math.random() * (size - pad * 2);
      const rSize = 1.2 + Math.random() * (bleedFactor * 0.7);

      ctx.beginPath();
      ctx.fillStyle = seal.style === "yin" ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.9)";
      ctx.arc(rx, ry, rSize, 0, Math.PI * 2);
      ctx.fill();

      // Draw thin fracture lines occasionally
      if (Math.random() < 0.2) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = 0.5 + Math.random() * 1.5;
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + (Math.random() - 0.5) * 20, ry + (Math.random() - 0.5) * 20);
        ctx.stroke();
      }
    }

    // Add ink bleeding around outer borders (朱墨微溢) - additive bleed
    if (seal.style === "yang") {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = sealColor;
      const spotCount = bleedFactor * 4;
      for (let i = 0; i < spotCount; i++) {
        // Find positions near borders or character centers
        const angle = Math.random() * Math.PI * 2;
        const offset = r * (0.8 + Math.random() * 0.25);
        const bx = cx + Math.cos(angle) * offset;
        const by = cy + Math.sin(angle) * offset;
        const bSize = 0.6 + Math.random() * 2;

        ctx.beginPath();
        ctx.arc(bx, by, bSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();

  return canvas.toDataURL("image/png");
}

/**
 * Elongates character vertically to match traditional 篆刻 (seal block spacing) styles.
 */
function drawElongatedChar(
  ctx: CanvasRenderingContext2D,
  char: string,
  x: number,
  y: number,
  fontSize: number,
  stretchZhuanshu: boolean
) {
  ctx.save();
  ctx.translate(x, y);

  // Traditional seals stretch words vertically (height ratio 1.1 - 1.35x width)
  const xMultiplier = stretchZhuanshu ? 0.85 : 0.95;
  const yMultiplier = stretchZhuanshu ? 1.25 : 1.05;
  ctx.scale(xMultiplier, yMultiplier);

  // Draw char center
  ctx.fillText(char, 0, 0);
  ctx.restore();
}
