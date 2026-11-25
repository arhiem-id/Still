import { PhotoCategoryId, ToneMood } from './stillColorEngine';

export interface OfflinePhotoAnalysis {
  suggestedCategory: PhotoCategoryId;
  suggestedTone: ToneMood;
  reason: string;
  avgLuminance: number;
}

const FILENAME_HINTS: {
  pattern: RegExp;
  category: PhotoCategoryId;
  reason: string;
}[] = [
  {
    pattern: /editorial|magazine|vogue|kinfolk|fashion|lookbook|runway|cover|couture|blazer/i,
    category: 'editorial',
    reason: 'Editorial magazine lighting detected',
  },
  {
    pattern: /waterfall|forest|mountain|tree|leaf|nature|river|lake|park|garden|botanical|olive|fern/i,
    category: 'nature',
    reason: 'Foliage & outdoor water profile detected',
  },
  {
    pattern: /beach|sea|ocean|coast|island|wave|shore|surf/i,
    category: 'coastal',
    reason: 'Coastal light & horizon profile detected',
  },
  {
    pattern: /selfie|selfportrait|self-portrait|frontcam|mirror|closeup|close-up/i,
    category: 'self-portrait',
    reason: 'Front-camera self-portrait & skin light detected',
  },
  {
    pattern: /portrait|face|model|people|wedding|woman|man/i,
    category: 'portrait',
    reason: 'Portrait & skin-tone profile detected',
  },
  {
    pattern: /coffee|espresso|latte|food|cake|pastry|matcha|cafe|meal|dish|breakfast/i,
    category: 'food-coffee',
    reason: 'Warm culinary & café lighting detected',
  },
  {
    pattern: /night|dusk|neon|evening|midnight|bar|club|citylight/i,
    category: 'night',
    reason: 'Low-light nocturnal exposure detected',
  },
  {
    pattern: /building|arch|interior|room|stair|concrete|stone|museum|facade/i,
    category: 'architecture',
    reason: 'Architectural structure & neutral stone detected',
  },
  {
    pattern: /street|urban|city|walk|road|metro|train|car|travel/i,
    category: 'street',
    reason: 'Urban documentary contrast detected',
  },
  {
    pattern: /ceramic|vase|book|desk|still|flatlay|object/i,
    category: 'still-life',
    reason: 'Tabletop still-life light detected',
  },
  {
    pattern: /mono|bw|blackandwhite|noir|grayscale/i,
    category: 'monochrome',
    reason: 'Monochrome tonal profile detected',
  },
  {
    pattern: /cinema|filmstill|movie|anamorphic|35mm|2383|wong|a24|neonrain/i,
    category: 'cinema',
    reason: 'Cinematic 35mm film framing detected',
  },
  {
    pattern: /darkroom|polaroid|sx70|expired|infrared|aerochrome|cinestill|bleach|analog/i,
    category: 'darkroom',
    reason: 'Analog darkroom & cult emulsion profile detected',
  },
  {
    pattern: /golden|sunset|sunrise|sunlight|promist|dream|glow|tuscany|twilight|amber/i,
    category: 'golden-dream',
    reason: 'Luminous golden-hour optical glow detected',
  },
];

export async function analyzePhotoOffline(
  imageSrc: string,
  fileName?: string
): Promise<OfflinePhotoAnalysis> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Image decode failed'));
      el.src = imageSrc;
    });

    const size = 48;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('No 2D context');

    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    const totalPixels = size * size;

    let lumSum = 0;
    let satSum = 0;
    let darkPixels = 0;
    let greenPixels = 0;
    let blueSkyPixels = 0;
    let warmPixels = 0;
    let skinPixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const sat = max === 0 ? 0 : (max - min) / max;

      lumSum += lum;
      satSum += sat;

      if (lum < 0.24) darkPixels++;
      if (g > r * 1.05 && g > b * 1.05 && sat > 0.12) greenPixels++;
      if (b > r * 1.08 && b > g * 0.98 && lum > 0.35 && sat > 0.1) blueSkyPixels++;
      if (r > b * 1.15 && lum > 0.28) warmPixels++;
      if (
        r > 0.36 &&
        g > 0.22 &&
        b > 0.16 &&
        r > g &&
        g > b &&
        r - b > 0.08 &&
        r - b < 0.42
      ) {
        skinPixels++;
      }
    }

    const avgLum = lumSum / totalPixels;
    const avgSat = satSum / totalPixels;
    const darkRatio = darkPixels / totalPixels;
    const greenRatio = greenPixels / totalPixels;
    const blueRatio = blueSkyPixels / totalPixels;
    const warmRatio = warmPixels / totalPixels;
    const skinRatio = skinPixels / totalPixels;

    const suggestedTone: ToneMood = avgLum >= 0.44 ? 'bright' : 'dark';

    if (fileName) {
      for (const hint of FILENAME_HINTS) {
        if (hint.pattern.test(fileName)) {
          return {
            suggestedCategory: hint.category,
            suggestedTone,
            reason: hint.reason,
            avgLuminance: avgLum,
          };
        }
      }
    }

    if (avgSat < 0.07) {
      return {
        suggestedCategory: 'monochrome',
        suggestedTone,
        reason: 'Low-chroma tonal range suited for monochrome',
        avgLuminance: avgLum,
      };
    }

    if (avgLum < 0.28 || darkRatio > 0.56) {
      return {
        suggestedCategory: 'night',
        suggestedTone: 'dark',
        reason: 'Low-light shadows & nocturnal contrast detected',
        avgLuminance: avgLum,
      };
    }

    if (greenRatio > 0.16) {
      return {
        suggestedCategory: 'nature',
        suggestedTone,
        reason: 'Natural foliage & organic tones detected',
        avgLuminance: avgLum,
      };
    }

    if (blueRatio > 0.2 && avgLum > 0.48) {
      return {
        suggestedCategory: 'coastal',
        suggestedTone: 'bright',
        reason: 'Open daylight sky & coastal horizon tones detected',
        avgLuminance: avgLum,
      };
    }

    if (skinRatio > 0.34) {
      return {
        suggestedCategory: 'self-portrait',
        suggestedTone,
        reason: 'Close-up self-portrait skin framing detected',
        avgLuminance: avgLum,
      };
    }

    if (skinRatio > 0.22 && avgSat < 0.22) {
      return {
        suggestedCategory: 'editorial',
        suggestedTone,
        reason: 'Restrained neutral editorial studio tones detected',
        avgLuminance: avgLum,
      };
    }

    if (skinRatio > 0.22 && warmRatio > 0.35) {
      return {
        suggestedCategory: 'portrait',
        suggestedTone,
        reason: 'Warm midtones & portrait light balance detected',
        avgLuminance: avgLum,
      };
    }

    if (warmRatio > 0.45 && avgLum > 0.38) {
      return {
        suggestedCategory: 'still-life',
        suggestedTone,
        reason: 'Warm tabletop & neutral studio tones detected',
        avgLuminance: avgLum,
      };
    }

    if (avgSat < 0.18) {
      return {
        suggestedCategory: 'architecture',
        suggestedTone,
        reason: 'Restrained stone & architectural neutrals detected',
        avgLuminance: avgLum,
      };
    }

    return {
      suggestedCategory: 'street',
      suggestedTone,
      reason: 'Balanced daylight street contrast detected',
      avgLuminance: avgLum,
    };
  } catch {
    return {
      suggestedCategory: 'editorial',
      suggestedTone: 'bright',
      reason: 'Editorial default profile selected',
      avgLuminance: 0.5,
    };
  }
}
