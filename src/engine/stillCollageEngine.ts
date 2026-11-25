import {
  loadImageCached,
  NEUTRAL_SHADER_PARAMS,
  renderWithShaderToCanvas,
  ShaderGradingParams,
} from './stillShaderEngine';

export type CollageLayoutId =
  | 'diptych-side'
  | 'diptych-stack'
  | 'diptych-before-after'
  | 'triptych-film'
  | 'magazine-spread';

export type CollageStockTheme = 'paper' | 'ink' | 'gallery';

export interface CollageSlotPhoto {
  id: string;
  src: string;
  name: string;
}

export interface CollageLayoutMeta {
  id: CollageLayoutId;
  label: string;
  shortLabel: string;
  ratioLabel: string;
  slotsRequired: number;
  width: number;
  height: number;
  aspectCss: string;
  description: string;
}

export const COLLAGE_LAYOUTS: CollageLayoutMeta[] = [
  {
    id: 'diptych-side',
    label: 'Editorial Pair',
    shortLabel: 'Pair',
    ratioLabel: '4:5',
    slotsRequired: 2,
    width: 1440,
    height: 1800,
    aspectCss: '4 / 5',
    description: 'Side-by-side museum diptych for feeds & portfolios.',
  },
  {
    id: 'diptych-stack',
    label: 'Story Stack',
    shortLabel: 'Story',
    ratioLabel: '9:16',
    slotsRequired: 2,
    width: 1080,
    height: 1920,
    aspectCss: '9 / 16',
    description: 'Two vertical frames composed for 9:16 editorial stories.',
  },
  {
    id: 'diptych-before-after',
    label: 'Before / After',
    shortLabel: 'B / A',
    ratioLabel: '4:5',
    slotsRequired: 1,
    width: 1440,
    height: 1800,
    aspectCss: '4 / 5',
    description: 'Original plate paired beside your STILL. color grade.',
  },
  {
    id: 'triptych-film',
    label: '35mm Strip',
    shortLabel: '35mm',
    ratioLabel: '9:16',
    slotsRequired: 3,
    width: 1080,
    height: 1920,
    aspectCss: '9 / 16',
    description: 'Three-frame analog 35mm contact strip with sprockets.',
  },
  {
    id: 'magazine-spread',
    label: 'Magazine Spread',
    shortLabel: 'Spread',
    ratioLabel: '4:5',
    slotsRequired: 3,
    width: 1440,
    height: 1800,
    aspectCss: '4 / 5',
    description: 'Asymmetric 1 hero + 2 detail plates in book layout.',
  },
];

export const COLLAGE_STOCKS: {
  id: CollageStockTheme;
  label: string;
  bgHex: string;
  textHex: string;
  mutedHex: string;
  borderHex: string;
}[] = [
  {
    id: 'paper',
    label: 'Paper',
    bgHex: '#E9E3D8',
    textHex: '#191919',
    mutedHex: '#636058',
    borderHex: 'rgba(25, 25, 25, 0.14)',
  },
  {
    id: 'ink',
    label: 'Ink',
    bgHex: '#151514',
    textHex: '#E9E3D8',
    mutedHex: '#9E998E',
    borderHex: 'rgba(233, 227, 216, 0.16)',
  },
  {
    id: 'gallery',
    label: 'Gallery',
    bgHex: '#F7F5F0',
    textHex: '#191919',
    mutedHex: '#6E6B63',
    borderHex: 'rgba(25, 25, 25, 0.12)',
  },
];

export interface CollageRenderOptions {
  layout: CollageLayoutId;
  stock: CollageStockTheme;
  slots: CollageSlotPhoto[];
  shaderParams: ShaderGradingParams;
  applyUniformGrade: boolean;
  titleText: string;
  presetCode: string;
  presetName: string;
  format?: 'jpeg' | 'png';
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

async function buildCoverGradedCanvas(
  src: string,
  targetW: number,
  targetH: number,
  params: ShaderGradingParams,
  cacheTag: string
): Promise<HTMLCanvasElement> {
  const img = await loadImageCached(src);
  const srcW = img.naturalWidth || img.width || 1000;
  const srcH = img.naturalHeight || img.height || 1000;

  const targetAspect = targetW / targetH;
  const srcAspect = srcW / srcH;

  let cropW = srcW;
  let cropH = srcH;
  let sx = 0;
  let sy = 0;

  if (srcAspect > targetAspect) {
    cropW = Math.round(srcH * targetAspect);
    sx = Math.round((srcW - cropW) / 2);
  } else {
    cropH = Math.round(srcW / targetAspect);
    sy = Math.round((srcH - cropH) / 2);
  }

  const cropped = document.createElement('canvas');
  cropped.width = targetW;
  cropped.height = targetH;
  const cCtx = cropped.getContext('2d');
  if (!cCtx) throw new Error('Unable to create crop canvas');
  cCtx.drawImage(img, sx, sy, cropW, cropH, 0, 0, targetW, targetH);

  const graded = document.createElement('canvas');
  renderWithShaderToCanvas(
    cropped,
    `collage::${cacheTag}::${targetW}x${targetH}::${Date.now()}`,
    graded,
    targetW,
    targetH,
    params
  );
  return graded;
}

/**
 * Renders a full-resolution editorial Diptych or Triptych through STILL.'s
 * WebGL2 Optical & Film Shader Engine onto archival Paper / Ink / Gallery / 35mm stock.
 */
export async function renderEditorialCollageToDataUrl(
  options: CollageRenderOptions
): Promise<{
  dataUrl: string;
  thumbnailDataUrl: string;
  width: number;
  height: number;
}> {
  const meta =
    COLLAGE_LAYOUTS.find((l) => l.id === options.layout) ?? COLLAGE_LAYOUTS[0];
  const stock =
    COLLAGE_STOCKS.find((s) => s.id === options.stock) ?? COLLAGE_STOCKS[0];
  const W = meta.width;
  const H = meta.height;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable for collage render');

  const today = new Date();
  const dateLabel = `${today.getFullYear()}.${String(
    today.getMonth() + 1
  ).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
  const cleanTitle = options.titleText.trim();
  const activeParams = options.applyUniformGrade
    ? options.shaderParams
    : NEUTRAL_SHADER_PARAMS;

  const slotAt = (idx: number): CollageSlotPhoto =>
    options.slots[idx] ?? options.slots[0];

  // ---- 1. 35MM ANALOG TRIPTYCH CONTACT STRIP (9:16) ----
  if (options.layout === 'triptych-film') {
    ctx.fillStyle = '#111110';
    ctx.fillRect(0, 0, W, H);

    const railW = 122;
    const topMargin = 104;
    const bottomMargin = 126;
    const gapY = 34;
    const frameW = W - railW * 2;
    const frameH = Math.floor((H - topMargin - bottomMargin - gapY * 2) / 3);

    // Sprocket perforations running cleanly down both left & right rails
    const perfW = 46;
    const perfH = 30;
    const perfStep = 76;
    const leftPerfX = Math.round((railW - perfW) / 2);
    const rightPerfX = W - railW + leftPerfX;

    ctx.fillStyle = '#E9E3D8';
    for (let y = 38; y + perfH < H - 30; y += perfStep) {
      drawRoundedRect(ctx, leftPerfX, y, perfW, perfH, 6);
      drawRoundedRect(ctx, rightPerfX, y, perfW, perfH, 6);
    }

    // Top warm amber film header markings
    ctx.fillStyle = '#D89E54';
    ctx.font = '500 20px "JetBrains Mono", monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(
      `▸ STILL ${options.presetCode.toUpperCase()}`,
      railW,
      topMargin / 2 + 6
    );
    ctx.textAlign = 'right';
    ctx.fillText(dateLabel, W - railW, topMargin / 2 + 6);

    // 3 stacked graded film frames
    for (let i = 0; i < 3; i++) {
      const slot = slotAt(i);
      const y = topMargin + i * (frameH + gapY);
      const graded = await buildCoverGradedCanvas(
        slot.src,
        frameW,
        frameH,
        activeParams,
        `film-${i}`
      );
      ctx.drawImage(graded, railW, y);
      ctx.strokeStyle = 'rgba(233, 227, 216, 0.14)';
      ctx.lineWidth = 2;
      ctx.strokeRect(railW, y, frameW, frameH);

      // Subtle frame index between frames
      if (i < 2) {
        ctx.fillStyle = '#D89E54';
        ctx.font = '500 17px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`2${4 + i}A`, W / 2, y + frameH + gapY / 2 + 1);
      }
    }

    // Bottom edge colophon
    ctx.fillStyle = '#D89E54';
    ctx.font = '500 19px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      (cleanTitle || options.presetName).toUpperCase(),
      railW,
      H - bottomMargin / 2
    );
    ctx.textAlign = 'right';
    ctx.fillText('26A · 35MM', W - railW, H - bottomMargin / 2);
  } else {
    // ---- ARCHIVAL PAPER / INK / GALLERY STOCK ----
    ctx.fillStyle = stock.bgHex;
    ctx.fillRect(0, 0, W, H);

    const drawColophon = (
      leftX: number,
      rightX: number,
      footerTop: number,
      footerH: number
    ) => {
      ctx.strokeStyle = stock.borderHex;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(leftX, footerTop);
      ctx.lineTo(rightX, footerTop);
      ctx.stroke();

      const midY = footerTop + footerH * 0.56;
      ctx.textBaseline = 'middle';

      // Left: Serif editorial title or STILL. mark
      ctx.textAlign = 'left';
      ctx.fillStyle = stock.textHex;
      ctx.font = '400 36px "EB Garamond", Georgia, serif';
      ctx.fillText(cleanTitle || 'STILL.', leftX, midY - 4);

      // Right: Mono colophon
      ctx.textAlign = 'right';
      ctx.fillStyle = stock.mutedHex;
      ctx.font = '400 18px "JetBrains Mono", monospace';
      ctx.fillText(
        `${options.presetCode.toUpperCase()} · ${options.presetName.toUpperCase()} · ${dateLabel}`,
        rightX,
        midY
      );
    };

    if (options.layout === 'diptych-side') {
      const padX = 88;
      const padTop = 104;
      const footerH = 152;
      const gap = 28;
      const slotW = Math.floor((W - padX * 2 - gap) / 2);
      const slotH = H - padTop - footerH - 44;

      for (let i = 0; i < 2; i++) {
        const x = padX + i * (slotW + gap);
        const graded = await buildCoverGradedCanvas(
          slotAt(i).src,
          slotW,
          slotH,
          activeParams,
          `pair-${i}`
        );
        ctx.drawImage(graded, x, padTop);
        ctx.strokeStyle = stock.borderHex;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, padTop, slotW, slotH);
      }

      drawColophon(padX, W - padX, H - footerH, footerH);
    } else if (options.layout === 'diptych-stack') {
      const padX = 76;
      const headerH = 112;
      const footerH = 148;
      const gap = 26;
      const slotW = W - padX * 2;
      const slotH = Math.floor((H - headerH - footerH - gap - 28) / 2);

      // Top minimalist issue header
      ctx.fillStyle = stock.mutedHex;
      ctx.font = '400 18px "JetBrains Mono", monospace';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText('STILL. EDITORIAL ARCHIVE', padX, headerH * 0.56);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#A58C73';
      ctx.fillText(dateLabel, W - padX, headerH * 0.56);

      for (let i = 0; i < 2; i++) {
        const y = headerH + i * (slotH + gap);
        const graded = await buildCoverGradedCanvas(
          slotAt(i).src,
          slotW,
          slotH,
          activeParams,
          `story-${i}`
        );
        ctx.drawImage(graded, padX, y);
        ctx.strokeStyle = stock.borderHex;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(padX, y, slotW, slotH);
      }

      drawColophon(padX, W - padX, H - footerH, footerH);
    } else if (options.layout === 'diptych-before-after') {
      const padX = 88;
      const padTop = 104;
      const footerH = 166;
      const gap = 28;
      const slotW = Math.floor((W - padX * 2 - gap) / 2);
      const slotH = H - padTop - footerH - 86;

      const hero = slotAt(0);
      const beforeCanvas = await buildCoverGradedCanvas(
        hero.src,
        slotW,
        slotH,
        NEUTRAL_SHADER_PARAMS,
        'ba-orig'
      );
      const afterCanvas = await buildCoverGradedCanvas(
        hero.src,
        slotW,
        slotH,
        options.shaderParams,
        'ba-graded'
      );

      ctx.drawImage(beforeCanvas, padX, padTop);
      ctx.drawImage(afterCanvas, padX + slotW + gap, padTop);

      ctx.strokeStyle = stock.borderHex;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(padX, padTop, slotW, slotH);
      ctx.strokeRect(padX + slotW + gap, padTop, slotW, slotH);

      // Clean architectural plate labels beneath Before / After
      const labelY = padTop + slotH + 38;
      ctx.textBaseline = 'middle';
      ctx.font = '500 18px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = stock.mutedHex;
      ctx.fillText('01 · ORIGINAL PLATE', padX, labelY);

      ctx.fillStyle = '#A58C73';
      ctx.fillText(
        `02 · ${options.presetCode.toUpperCase()} ${options.presetName.toUpperCase()}`,
        padX + slotW + gap,
        labelY
      );

      drawColophon(padX, W - padX, H - footerH, footerH);
    } else if (options.layout === 'magazine-spread') {
      const padX = 88;
      const padTop = 94;
      const footerH = 152;
      const gap = 24;
      const innerW = W - padX * 2;
      const availH = H - padTop - footerH - 42;
      const heroH = Math.round(availH * 0.58);
      const subH = availH - heroH - gap;
      const subW = Math.floor((innerW - gap) / 2);

      // Top hero frame
      const heroGraded = await buildCoverGradedCanvas(
        slotAt(0).src,
        innerW,
        heroH,
        activeParams,
        'spread-0'
      );
      ctx.drawImage(heroGraded, padX, padTop);
      ctx.strokeStyle = stock.borderHex;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(padX, padTop, innerW, heroH);

      // Bottom 2 paired detail frames
      for (let i = 0; i < 2; i++) {
        const x = padX + i * (subW + gap);
        const y = padTop + heroH + gap;
        const graded = await buildCoverGradedCanvas(
          slotAt(i + 1).src,
          subW,
          subH,
          activeParams,
          `spread-${i + 1}`
        );
        ctx.drawImage(graded, x, y);
        ctx.strokeStyle = stock.borderHex;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, subW, subH);
      }

      drawColophon(padX, W - padX, H - footerH, footerH);
    }
  }

  const mime = options.format === 'png' ? 'image/png' : 'image/jpeg';
  const dataUrl = canvas.toDataURL(mime, 0.94);

  // Build crisp 420px thumbnail for Library Recent Exports
  const thumbScale = 420 / Math.max(W, H);
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = Math.round(W * thumbScale);
  thumbCanvas.height = Math.round(H * thumbScale);
  const tCtx = thumbCanvas.getContext('2d');
  if (tCtx) {
    tCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
  }
  const thumbnailDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.84);

  return { dataUrl, thumbnailDataUrl, width: W, height: H };
}
