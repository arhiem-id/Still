import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CropRatio } from '../engine/stillColorEngine';
import {
  buildGeometryTransformedCanvas,
  DEFAULT_GEOMETRY,
  FreeCropRect,
  GeometryTransform,
  isFreeCropFull,
  isGeometryNeutral,
} from '../engine/stillGeometryEngine';
import { upscaleCanvasCrisp2x } from '../engine/stillRestoreEngine';
import {
  loadImageCached,
  NEUTRAL_SHADER_PARAMS,
  renderShaderThumbnail,
  renderWithShaderToCanvas,
  ShaderGradingParams,
} from '../engine/stillShaderEngine';

/**
 * Live WebGL2-powered editorial photo viewport with Geometry Transform,
 * Freeform Crop, 2x Crisp Super-Upscale, and Split-Screen alignment.
 */
export function StillShaderViewport({
  src,
  alt,
  params,
  cropRatio,
  freeCrop,
  geometry = DEFAULT_GEOMETRY,
  upscale2x = false,
  showOriginal,
  fullscreen = false,
  onImageLoaded,
}: {
  src: string;
  alt: string;
  params: ShaderGradingParams;
  cropRatio: CropRatio;
  freeCrop?: FreeCropRect | null;
  geometry?: GeometryTransform;
  upscale2x?: boolean;
  showOriginal: boolean;
  fullscreen?: boolean;
  onImageLoaded?: (img: HTMLImageElement) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);
  const onImageLoadedRef = useRef(onImageLoaded);
  onImageLoadedRef.current = onImageLoaded;

  useEffect(() => {
    let active = true;
    loadImageCached(src)
      .then((img) => {
        if (!active) return;
        setLoadedImg(img);
        onImageLoadedRef.current?.(img);
      })
      .catch(() => {
        if (active) setLoadedImg(null);
      });
    return () => {
      active = false;
    };
  }, [src]);

  const freeKey =
    cropRatio === 'free' && freeCrop && !isFreeCropFull(freeCrop)
      ? `${freeCrop.x.toFixed(3)},${freeCrop.y.toFixed(3)},${freeCrop.w.toFixed(3)},${freeCrop.h.toFixed(3)}`
      : 'full';

  const applyUpscale = Boolean(upscale2x && !showOriginal);

  // Cache the geometry-transformed (+ optional 2x CAS upscaled) buffer so color slider drags stay 60fps
  const geomBuffer = useMemo(() => {
    if (!loadedImg) return null;
    if (
      !applyUpscale &&
      isGeometryNeutral(geometry) &&
      (cropRatio === 'original' ||
        (cropRatio === 'free' && isFreeCropFull(freeCrop)))
    ) {
      const maxEdge = fullscreen ? 1600 : 960;
      const scale = Math.min(
        1,
        maxEdge / Math.max(loadedImg.naturalWidth, loadedImg.naturalHeight, 1)
      );
      return {
        source: loadedImg as HTMLImageElement | HTMLCanvasElement,
        key: `${loadedImg.src}::fs:${fullscreen}`,
        width: Math.max(1, Math.round(loadedImg.naturalWidth * scale)),
        height: Math.max(1, Math.round(loadedImg.naturalHeight * scale)),
      };
    }

    const base = buildGeometryTransformedCanvas(
      loadedImg,
      cropRatio,
      geometry,
      applyUpscale ? (fullscreen ? 1100 : 840) : fullscreen ? 1600 : 960,
      freeCrop
    );

    const finalPlate = applyUpscale
      ? upscaleCanvasCrisp2x(base.canvas, fullscreen ? 2048 : 1440, 0.72)
      : base;

    return {
      source: finalPlate.canvas as HTMLImageElement | HTMLCanvasElement,
      key: `${loadedImg.src}::g:${cropRatio}:${freeKey}:${geometry.rotate90}:${geometry.straighten.toFixed(1)}:${geometry.flipH}:${geometry.flipV}:u2x:${applyUpscale}:fs:${fullscreen}`,
      width: finalPlate.width,
      height: finalPlate.height,
    };
  }, [
    loadedImg,
    cropRatio,
    freeKey,
    freeCrop,
    applyUpscale,
    fullscreen,
    geometry.rotate90,
    geometry.straighten,
    geometry.flipH,
    geometry.flipV,
  ]);

  useEffect(() => {
    if (!geomBuffer || !canvasRef.current) return;

    const rafId = window.requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas || !geomBuffer) return;

      renderWithShaderToCanvas(
        geomBuffer.source,
        geomBuffer.key,
        canvas,
        geomBuffer.width,
        geomBuffer.height,
        showOriginal ? NEUTRAL_SHADER_PARAMS : params
      );
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [geomBuffer, params, showOriginal]);

  const isFixedRatio = cropRatio !== 'original' && cropRatio !== 'free';
  const sizeClass = fullscreen
    ? isFixedRatio
      ? 'w-full h-full object-cover block'
      : 'w-full h-full object-contain block'
    : isFixedRatio
      ? 'w-full h-full object-cover block'
      : 'max-w-full max-h-[262px] w-auto h-auto object-contain block';

  if (!loadedImg) {
    return <img src={src} alt={alt} draggable={false} className={sizeClass} />;
  }

  return <canvas ref={canvasRef} aria-label={alt} className={sizeClass} />;
}

/**
 * High-speed WebGL2 preset thumbnail that accurately previews
 * 6-Channel HSL, 3-Way Split Toning, Pro-Mist Bloom, and CineStill Halation.
 */
export function StillShaderThumb({
  src,
  alt,
  cacheKey,
  params,
  size = 132,
  className = 'w-full h-full object-cover',
}: {
  src: string;
  alt: string;
  cacheKey: string;
  params: ShaderGradingParams;
  size?: number;
  className?: string;
}) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadImageCached(src)
      .then((img) => {
        if (!active) return;
        const url = renderShaderThumbnail(img, cacheKey, params, size);
        if (active) setThumbUrl(url);
      })
      .catch(() => {
        if (active) setThumbUrl(null);
      });
    return () => {
      active = false;
    };
  }, [src, cacheKey, params, size]);

  return (
    <img
      src={thumbUrl ?? src}
      alt={alt}
      referrerPolicy="no-referrer"
      className={className}
    />
  );
}

/**
 * Minimalist architectural 48-bin luminance histogram sparkline for the Adjust panel.
 */
export function EditorialHistogramBar({
  bins,
  autoBalance,
}: {
  bins: number[];
  autoBalance: boolean;
}) {
  return (
    <div className="flex items-end gap-[1.5px] h-7 w-full pt-1">
      {bins.map((height, idx) => (
        <span
          key={idx}
          className={`flex-1 transition-all duration-150 ${
            autoBalance
              ? 'bg-still-taupe/75 dark:bg-still-taupe/80'
              : 'bg-still-ink/35 dark:bg-still-paper/35'
          }`}
          style={{
            height: `${Math.max(8, Math.round(height * 100))}%`,
          }}
        />
      ))}
    </div>
  );
}
