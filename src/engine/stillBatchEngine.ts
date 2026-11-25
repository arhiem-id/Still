import {
  analyzeImageHistogram,
  computeSeriesExposureMatch,
  PhotoHistogramStats,
} from './stillHistogramEngine';
import {
  ExportRenderOptions,
  renderEditedPhotoToDataUrl,
} from './stillColorEngine';
import { loadImageCached, ShaderGradingParams } from './stillShaderEngine';
import { PhotoExifData } from './stillExifEngine';

export interface SeriesPhotoItem {
  id: string;
  src: string;
  name: string;
  dimensions: string | null;
  exif?: PhotoExifData | null;
  histogram: PhotoHistogramStats | null;
  /** Exposure compensation in slider units (-32..+32) computed against the hero frame */
  matchedExposureDelta: number;
}

/**
 * Loads an image, measures its dimensions and histogram statistics, and
 * returns a SeriesPhotoItem ready for batch synchronization.
 */
export async function createSeriesPhotoItem(
  src: string,
  name: string,
  dimensions: string | null = null,
  exif: PhotoExifData | null = null
): Promise<SeriesPhotoItem> {
  let histogram: PhotoHistogramStats | null = null;
  let resolvedDimensions = dimensions;

  try {
    const img = await loadImageCached(src);
    histogram = analyzeImageHistogram(img);
    if (!resolvedDimensions && img.naturalWidth > 0 && img.naturalHeight > 0) {
      resolvedDimensions = `${img.naturalWidth} × ${img.naturalHeight}`;
    }
  } catch {
    histogram = null;
  }

  return {
    id: `series-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    src,
    name,
    dimensions: resolvedDimensions,
    exif,
    histogram,
    matchedExposureDelta: 0,
  };
}

/**
 * Synchronizes exposure deltas across all photos in an Editorial Series
 * relative to the active Hero photo using the Histogram Engine.
 */
export function computeSeriesSyncOffsets(
  items: SeriesPhotoItem[],
  heroId: string,
  matchExposure: boolean
): SeriesPhotoItem[] {
  const hero = items.find((item) => item.id === heroId) ?? items[0];
  if (!hero) return items;

  return items.map((item) => {
    if (!matchExposure || item.id === hero.id) {
      return { ...item, matchedExposureDelta: 0 };
    }
    return {
      ...item,
      matchedExposureDelta: computeSeriesExposureMatch(
        hero.histogram,
        item.histogram
      ),
    };
  });
}

export interface ExportedSeriesResult {
  item: SeriesPhotoItem;
  dataUrl: string;
  thumbnailDataUrl: string;
  width: number;
  height: number;
}

/**
 * Exports every photograph in a synced Editorial Series through STILL.'s
 * WebGL2 Optical & Film Shader Engine with individual matched exposure compensation.
 */
export async function renderSeriesBatch(
  items: SeriesPhotoItem[],
  buildShaderParamsForItem: (item: SeriesPhotoItem) => ShaderGradingParams,
  exportOptions: Partial<ExportRenderOptions>,
  onProgress?: (completed: number, total: number) => void
): Promise<ExportedSeriesResult[]> {
  const results: ExportedSeriesResult[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const params = buildShaderParamsForItem(item);

    const itemOptions: Partial<ExportRenderOptions> = {
      ...exportOptions,
      exif: item.exif ?? exportOptions.exif ?? null,
    };

    const full = await renderEditedPhotoToDataUrl(
      item.src,
      params,
      itemOptions
    );
    const thumb = await renderEditedPhotoToDataUrl(
      item.src,
      params,
      { ...itemOptions, format: 'jpeg', quality: 'standard' },
      420
    );

    results.push({
      item,
      dataUrl: full.dataUrl,
      thumbnailDataUrl: thumb.dataUrl,
      width: full.width,
      height: full.height,
    });
    onProgress?.(i + 1, items.length);
  }

  return results;
}
