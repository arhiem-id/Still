import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Minimize2,
  Moon,
  Sun,
} from 'lucide-react';
import {
  CropRatio,
  MatteFrameStyle,
  PHOTO_CATEGORIES,
  PhotoCategoryId,
  STILL_PRESETS,
  StillPreset,
  ToneMood,
} from '../engine/stillColorEngine';
import { PhotoExifData } from '../engine/stillExifEngine';
import { FreeCropRect, GeometryTransform } from '../engine/stillGeometryEngine';
import { ShaderGradingParams } from '../engine/stillShaderEngine';
import { StillShaderViewport } from './StillShaderCanvas';
import { EditorialFrameWrapper } from './EditorialFrameWrapper';

export type FullscreenCategoryOption =
  | 'suggested'
  | 'all'
  | PhotoCategoryId;

interface FullscreenSwipeStudioProps {
  imageSrc: string;
  imageName: string;
  shaderParams: ShaderGradingParams;
  cropRatio: CropRatio;
  freeCrop: FreeCropRect;
  geometry: GeometryTransform;
  upscale2x: boolean;
  frameStyle: MatteFrameStyle;
  frameStamp: boolean;
  stampCaption: string;
  presetCode: string;
  exif?: PhotoExifData | null;
  frameCaption?: string;
  activePreset: StillPreset | null;
  intensity: number;
  toneMood: ToneMood;
  isFavorite: boolean;
  activeCategoryFilter: FullscreenCategoryOption;
  suggestedCategoryLabel: string;
  presets: StillPreset[];
  isExportSheetOpen: boolean;
  onSelectPreset: (preset: StillPreset) => void;
  onSelectCategory: (category: FullscreenCategoryOption) => void;
  onIntensityChange: (nextIntensity: number) => void;
  onIntensityDragStart: () => void;
  onIntensityDragEnd: () => void;
  onToggleToneMood: () => void;
  onToggleFavorite: (presetId: string) => void;
  onOpenExport: () => void;
  onClose: () => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function getFullscreenAspectStyle(
  ratio: CropRatio
): React.CSSProperties | undefined {
  switch (ratio) {
    case '4:5':
      return { aspectRatio: '4 / 5' };
    case '3:4':
      return { aspectRatio: '3 / 4' };
    case '1:1':
      return { aspectRatio: '1 / 1' };
    case '9:16':
      return { aspectRatio: '9 / 16' };
    case '16:9':
      return { aspectRatio: '16 / 9' };
    default:
      return undefined;
  }
}

export const FullscreenSwipeStudio: React.FC<FullscreenSwipeStudioProps> = ({
  imageSrc,
  imageName,
  shaderParams,
  cropRatio,
  freeCrop,
  geometry,
  upscale2x,
  frameStyle,
  frameStamp,
  stampCaption,
  presetCode,
  exif,
  frameCaption,
  activePreset,
  intensity,
  toneMood,
  isFavorite,
  activeCategoryFilter,
  suggestedCategoryLabel,
  presets,
  isExportSheetOpen,
  onSelectPreset,
  onSelectCategory,
  onIntensityChange,
  onIntensityDragStart,
  onIntensityDragEnd,
  onToggleToneMood,
  onToggleFavorite,
  onOpenExport,
  onClose,
}) => {
  const swipeList = useMemo(
    () => (presets.length > 0 ? presets : STILL_PRESETS),
    [presets]
  );

  const currentIndex = useMemo(() => {
    if (!activePreset) return 0;
    const idx = swipeList.findIndex((p) => p.id === activePreset.id);
    return idx >= 0 ? idx : 0;
  }, [activePreset, swipeList]);

  const [hudVisible, setHudVisible] = useState(true);
  const [showCategoryDrawer, setShowCategoryDrawer] = useState(false);
  const [isComparingOriginal, setIsComparingOriginal] = useState(false);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [swipeHintVisible, setSwipeHintVisible] = useState(true);
  const [directionFlash, setDirectionFlash] = useState<'prev' | 'next' | null>(
    null
  );

  // Smooth Pinch-to-Zoom, Double-Tap Zoom, Wheel Zoom & Pan State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(
    new Map()
  );
  const pinchSessionRef = useRef<{
    initialDistance: number;
    initialZoom: number;
    initialPan: { x: number; y: number };
    initialMidX: number;
    initialMidY: number;
  } | null>(null);
  const singleGestureRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startPan: { x: number; y: number };
    didMove: boolean;
    didSwipe: boolean;
    didLongPress: boolean;
    wasMultiTouch: boolean;
  } | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const tapTimerRef = useRef<number | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(
    null
  );

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const panRef = useRef(pan);
  panRef.current = pan;

  const activeCategoryName = useMemo(() => {
    if (activeCategoryFilter === 'suggested') {
      return `SUGGESTED · ${suggestedCategoryLabel.toUpperCase()}`;
    }
    if (activeCategoryFilter === 'all') {
      return `ALL PRESETS`;
    }
    const found = PHOTO_CATEGORIES.find((c) => c.id === activeCategoryFilter);
    return found ? found.label.toUpperCase() : 'PRESETS';
  }, [activeCategoryFilter, suggestedCategoryLabel]);

  const clampPan = useCallback(
    (nextX: number, nextY: number, targetZoom: number) => {
      if (targetZoom <= 1.01) return { x: 0, y: 0 };
      const rect = stageRef.current?.getBoundingClientRect();
      const stageW = rect?.width ?? 400;
      const stageH = rect?.height ?? 780;
      const maxX = ((targetZoom - 1) * stageW) / 2;
      const maxY = ((targetZoom - 1) * stageH) / 2;
      return {
        x: clamp(nextX, -maxX, maxX),
        y: clamp(nextY, -maxY, maxY),
      };
    },
    []
  );

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Gently fade out the one-time swipe/pinch hint
  useEffect(() => {
    const timer = window.setTimeout(() => setSwipeHintVisible(false), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  const stepPreset = useCallback(
    (delta: 1 | -1) => {
      if (swipeList.length === 0) return;
      const baseIdx =
        activePreset && swipeList.some((p) => p.id === activePreset.id)
          ? currentIndex
          : delta > 0
            ? -1
            : 0;
      const nextIdx = (baseIdx + delta + swipeList.length) % swipeList.length;
      const nextPreset = swipeList[nextIdx];
      if (!nextPreset) return;
      onSelectPreset(nextPreset);
      setSwipeHintVisible(false);
      setDirectionFlash(delta > 0 ? 'next' : 'prev');
      window.setTimeout(() => setDirectionFlash(null), 160);
    },
    [activePreset, currentIndex, onSelectPreset, swipeList]
  );

  // Keyboard shortcuts for desktop review (+ / - zoom, 0 reset, arrows, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isExportSheetOpen) return;
      if (e.key === 'Escape') {
        if (showCategoryDrawer) {
          setShowCategoryDrawer(false);
        } else if (zoomRef.current > 1.02) {
          resetZoom();
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepPreset(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepPreset(-1);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        const nextZ = clamp(zoomRef.current + 0.5, MIN_ZOOM, MAX_ZOOM);
        setZoom(nextZ);
        setPan((prev) => clampPan(prev.x, prev.y, nextZ));
      } else if (e.key === '-') {
        e.preventDefault();
        const nextZ = clamp(zoomRef.current - 0.5, MIN_ZOOM, MAX_ZOOM);
        setZoom(nextZ);
        setPan((prev) => clampPan(prev.x, prev.y, nextZ));
      } else if (e.key === '0') {
        e.preventDefault();
        resetZoom();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    clampPan,
    isExportSheetOpen,
    onClose,
    resetZoom,
    showCategoryDrawer,
    stepPreset,
  ]);

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearLongPress();
      if (tapTimerRef.current !== null) {
        window.clearTimeout(tapTimerRef.current);
      }
    };
  }, []);

  const getTwoPointerMetrics = () => {
    const pts = Array.from(activePointersRef.current.values());
    if (pts.length < 2) return null;
    const [a, b] = pts;
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    return {
      dist: Math.max(1, dist),
      midX: (a.x + b.x) / 2,
      midY: (a.y + b.y) / 2,
    };
  };

  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (showCategoryDrawer) {
      setShowCategoryDrawer(false);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setIsInteracting(true);

    // 2nd finger touched down -> enter smooth pinch-to-zoom session
    if (activePointersRef.current.size === 2) {
      clearLongPress();
      setIsComparingOriginal(false);
      setDragOffsetX(0);
      if (singleGestureRef.current) {
        singleGestureRef.current.wasMultiTouch = true;
      }
      const metrics = getTwoPointerMetrics();
      if (metrics) {
        pinchSessionRef.current = {
          initialDistance: metrics.dist,
          initialZoom: zoomRef.current,
          initialPan: { ...panRef.current },
          initialMidX: metrics.midX,
          initialMidY: metrics.midY,
        };
      }
      setSwipeHintVisible(false);
      return;
    }

    // Single pointer start
    if (activePointersRef.current.size === 1) {
      singleGestureRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startPan: { ...panRef.current },
        didMove: false,
        didSwipe: false,
        didLongPress: false,
        wasMultiTouch: false,
      };
      clearLongPress();
      longPressTimerRef.current = window.setTimeout(() => {
        const g = singleGestureRef.current;
        if (
          g &&
          !g.didMove &&
          !g.wasMultiTouch &&
          activePointersRef.current.size === 1
        ) {
          g.didLongPress = true;
          setIsComparingOriginal(true);
        }
      }, 280);
    }
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activePointersRef.current.has(e.pointerId)) return;
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Active 2-finger pinch-zoom + pan
    if (activePointersRef.current.size >= 2 && pinchSessionRef.current) {
      const metrics = getTwoPointerMetrics();
      if (!metrics) return;
      const session = pinchSessionRef.current;
      const rawZoom =
        session.initialZoom * (metrics.dist / session.initialDistance);
      const nextZoom = clamp(rawZoom, MIN_ZOOM, MAX_ZOOM);

      const rect = stageRef.current?.getBoundingClientRect();
      const centerX = rect ? rect.left + rect.width / 2 : 0;
      const centerY = rect ? rect.top + rect.height / 2 : 0;

      const scaleFactor = nextZoom / session.initialZoom;
      const originOffsetX = session.initialMidX - centerX;
      const originOffsetY = session.initialMidY - centerY;
      const midDeltaX = metrics.midX - session.initialMidX;
      const midDeltaY = metrics.midY - session.initialMidY;

      const nextPanX =
        originOffsetX * (1 - scaleFactor) +
        session.initialPan.x * scaleFactor +
        midDeltaX;
      const nextPanY =
        originOffsetY * (1 - scaleFactor) +
        session.initialPan.y * scaleFactor +
        midDeltaY;

      setZoom(nextZoom);
      setPan(clampPan(nextPanX, nextPanY, nextZoom));
      return;
    }

    // Single-finger gesture
    const g = singleGestureRef.current;
    if (
      !g ||
      g.pointerId !== e.pointerId ||
      g.wasMultiTouch ||
      g.didLongPress
    ) {
      return;
    }

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (Math.hypot(dx, dy) > 8) {
      g.didMove = true;
      clearLongPress();
    }

    // If zoomed in -> 1-finger pans the photo smoothly
    if (zoomRef.current > 1.02) {
      setPan(clampPan(g.startPan.x + dx, g.startPan.y + dy, zoomRef.current));
      return;
    }

    // If at 1x -> horizontal drag previews preset swipe
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      g.didSwipe = true;
      setDragOffsetX(clamp(dx * 0.24, -44, 44));
    }
  };

  const handleStagePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(e.pointerId);

    if (activePointersRef.current.size < 2) {
      pinchSessionRef.current = null;
      // Snap back cleanly to 1x if pinched near 1.0
      if (zoomRef.current < 1.06) {
        resetZoom();
      }
    }

    // If one finger remains after a pinch, re-anchor smooth panning
    if (activePointersRef.current.size === 1) {
      const [remId, remPos] = Array.from(activePointersRef.current.entries())[0];
      singleGestureRef.current = {
        pointerId: remId,
        startX: remPos.x,
        startY: remPos.y,
        startPan: { ...panRef.current },
        didMove: true,
        didSwipe: false,
        didLongPress: false,
        wasMultiTouch: false,
      };
      return;
    }

    setIsInteracting(false);
    clearLongPress();
    const g = singleGestureRef.current;
    singleGestureRef.current = null;
    setDragOffsetX(0);

    if (!g) {
      setIsComparingOriginal(false);
      return;
    }

    if (g.didLongPress) {
      setIsComparingOriginal(false);
      return;
    }

    if (g.wasMultiTouch) {
      return;
    }

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;

    // At 1x zoom, horizontal swipe switches presets
    if (
      zoomRef.current <= 1.02 &&
      Math.abs(dx) >= 40 &&
      Math.abs(dx) > Math.abs(dy) * 1.1
    ) {
      if (dx < 0) {
        stepPreset(1);
      } else {
        stepPreset(-1);
      }
      return;
    }

    // Tap / Double-tap detection
    if (!g.didMove && Math.hypot(dx, dy) < 10) {
      const now = Date.now();
      const prevTap = lastTapRef.current;
      if (
        prevTap &&
        now - prevTap.time < 260 &&
        Math.hypot(e.clientX - prevTap.x, e.clientY - prevTap.y) < 36
      ) {
        // Double-tap toggles 1x <-> 2.5x zoom centered toward tapped point
        if (tapTimerRef.current !== null) {
          window.clearTimeout(tapTimerRef.current);
          tapTimerRef.current = null;
        }
        lastTapRef.current = null;
        setSwipeHintVisible(false);

        if (zoomRef.current > 1.15) {
          resetZoom();
        } else {
          const targetZ = 2.5;
          const rect = stageRef.current?.getBoundingClientRect();
          if (rect) {
            const offsetX = e.clientX - (rect.left + rect.width / 2);
            const offsetY = e.clientY - (rect.top + rect.height / 2);
            setZoom(targetZ);
            setPan(
              clampPan(
                -offsetX * (targetZ - 1),
                -offsetY * (targetZ - 1),
                targetZ
              )
            );
          } else {
            setZoom(targetZ);
            setPan({ x: 0, y: 0 });
          }
        }
      } else {
        lastTapRef.current = { time: now, x: e.clientX, y: e.clientY };
        if (tapTimerRef.current !== null) {
          window.clearTimeout(tapTimerRef.current);
        }
        tapTimerRef.current = window.setTimeout(() => {
          setHudVisible((prev) => !prev);
          tapTimerRef.current = null;
        }, 230);
      }
    }
  };

  // Desktop mouse wheel / trackpad pinch-to-zoom support
  const handleStageWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.14 : 0.88;
    const nextZ = clamp(zoomRef.current * factor, MIN_ZOOM, MAX_ZOOM);
    if (nextZ <= 1.03) {
      resetZoom();
      return;
    }
    const rect = stageRef.current?.getBoundingClientRect();
    if (rect) {
      const offsetX = e.clientX - (rect.left + rect.width / 2);
      const offsetY = e.clientY - (rect.top + rect.height / 2);
      const scaleRatio = nextZ / zoomRef.current;
      const nextPanX =
        offsetX * (1 - scaleRatio) + panRef.current.x * scaleRatio;
      const nextPanY =
        offsetY * (1 - scaleRatio) + panRef.current.y * scaleRatio;
      setZoom(nextZ);
      setPan(clampPan(nextPanX, nextPanY, nextZ));
    } else {
      setZoom(nextZ);
    }
    setSwipeHintVisible(false);
  };

  const progressRatio =
    swipeList.length > 1 ? (currentIndex + 1) / swipeList.length : 1;

  const isZoomed = zoom > 1.02;
  const swipeTranslateX = !isZoomed
    ? dragOffsetX !== 0
      ? dragOffsetX
      : directionFlash === 'next'
        ? -8
        : directionFlash === 'prev'
          ? 8
          : 0
    : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Fullscreen darkroom preview"
      className="absolute inset-0 z-30 bg-[#0E0E0D] text-[#E9E3D8] flex flex-col overflow-hidden select-none"
    >
      {/* Full-Bleed Edge-to-Edge Zoomable & Swipeable Photo Stage */}
      <div
        ref={stageRef}
        className={`relative flex-1 min-h-0 w-full h-full flex items-center justify-center overflow-hidden touch-none ${
          isZoomed
            ? 'cursor-move'
            : 'cursor-grab active:cursor-grabbing'
        } ${frameStyle !== 'none' ? 'p-3' : 'p-0'}`}
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerEnd}
        onPointerCancel={handleStagePointerEnd}
        onWheel={handleStageWheel}
      >
        <div
          className={`relative w-full h-full flex flex-col items-center justify-center ${
            isInteracting
              ? ''
              : 'transition-transform duration-180 ease-out'
          }`}
          style={{
            transform: `translate3d(${pan.x + swipeTranslateX}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: 'center center',
            willChange: 'transform',
          }}
        >
          <EditorialFrameWrapper
            frameStyle={frameStyle}
            frameStamp={frameStamp}
            stampCaption={stampCaption}
            presetCode={presetCode}
            exif={exif}
            frameCaption={frameCaption}
            fullscreen={true}
          >
            <div
              style={getFullscreenAspectStyle(cropRatio)}
              className={`relative overflow-hidden flex items-center justify-center ${
                cropRatio === 'original' || cropRatio === 'free'
                  ? 'w-full h-full'
                  : cropRatio === '16:9'
                    ? 'w-full max-h-full'
                    : cropRatio === '9:16'
                      ? 'h-full max-w-full'
                      : 'w-full max-h-full'
              }`}
            >
              <StillShaderViewport
                src={imageSrc}
                alt={imageName}
                params={shaderParams}
                cropRatio={cropRatio}
                freeCrop={cropRatio === 'free' ? freeCrop : null}
                geometry={geometry}
                upscale2x={upscale2x}
                showOriginal={isComparingOriginal}
                fullscreen={true}
              />
            </div>
          </EditorialFrameWrapper>
        </div>

        {/* Before / After Hold Badge */}
        {isComparingOriginal && (
          <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#191919]/90 border border-[#E9E3D8]/25 font-mono text-[9.5px] tracking-[0.14em] text-[#E9E3D8]">
            ORIGINAL
          </div>
        )}

        {/* Active Zoom Indicator + 1-Tap Reset */}
        {isZoomed && !isComparingOriginal && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              resetZoom();
            }}
            className="absolute top-16 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#191919]/88 border border-[#A58C73]/60 font-mono text-[9.5px] tracking-[0.12em] text-[#E9E3D8] hover:border-[#E9E3D8] transition-colors cursor-pointer tabular-nums"
          >
            {zoom.toFixed(1)}× · RESET
          </button>
        )}

        {/* Brief First-Open Editorial Swipe & Pinch Cue */}
        {swipeHintVisible && !isComparingOriginal && !isZoomed && hudVisible && (
          <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#191919]/85 border border-[#E9E3D8]/20 font-mono text-[9px] tracking-[0.1em] text-[#E9E3D8]/85 whitespace-nowrap">
            SWIPE PRESETS · PINCH / DOUBLE-TAP TO ZOOM
          </div>
        )}

        {/* Subtle Edge Step Arrows (Hidden While Zoomed So Panning Is Unobstructed) */}
        {hudVisible && !showCategoryDrawer && !isZoomed && (
          <>
            <button
              type="button"
              aria-label="Previous preset"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                stepPreset(-1);
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-12 flex items-center justify-center bg-[#191919]/45 hover:bg-[#191919]/80 border border-[#E9E3D8]/15 text-[#E9E3D8]/80 hover:text-[#E9E3D8] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1.6} />
            </button>
            <button
              type="button"
              aria-label="Next preset"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                stepPreset(1);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-12 flex items-center justify-center bg-[#191919]/45 hover:bg-[#191919]/80 border border-[#E9E3D8]/15 text-[#E9E3D8]/80 hover:text-[#E9E3D8] transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={1.6} />
            </button>
          </>
        )}
      </div>

      {/* ================= TOP EDITORIAL HUD BAR ================= */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className={`absolute inset-x-0 top-0 pt-3 pb-5 px-4 bg-gradient-to-b from-black/78 via-black/40 to-transparent transition-opacity duration-200 ${
          hudVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          {/* Category Switcher Trigger */}
          <button
            type="button"
            onClick={() => setShowCategoryDrawer((prev) => !prev)}
            className="min-h-[34px] px-2 py-1 border border-[#E9E3D8]/20 bg-[#191919]/75 hover:border-[#A58C73] inline-flex items-center gap-1.5 min-w-0 max-w-[185px] transition-colors cursor-pointer"
          >
            <span className="font-mono text-[9.5px] tracking-[0.1em] text-[#E9E3D8] truncate">
              {activeCategoryName}
            </span>
            <span className="font-mono text-[9px] text-[#A58C73] tabular-nums shrink-0">
              {String(currentIndex + 1).padStart(2, '0')}/
              {String(swipeList.length).padStart(2, '0')}
            </span>
            <ChevronDown
              className={`w-3 h-3 text-[#E9E3D8]/70 shrink-0 transition-transform ${
                showCategoryDrawer ? 'rotate-180' : ''
              }`}
              strokeWidth={1.6}
            />
          </button>

          {/* Compact Action Strip: Bright/Dark, Bookmark, Export, Exit */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onToggleToneMood}
              title={`Tone: ${toneMood === 'bright' ? 'Bright' : 'Dark'} (tap to switch)`}
              className="h-[32px] px-2 border border-[#E9E3D8]/20 bg-[#191919]/75 hover:border-[#A58C73] inline-flex items-center gap-1 font-mono text-[9px] tracking-[0.08em] text-[#E9E3D8] transition-colors cursor-pointer"
            >
              {toneMood === 'bright' ? (
                <Sun className="w-3 h-3 text-[#A58C73]" strokeWidth={1.7} />
              ) : (
                <Moon className="w-3 h-3 text-[#A58C73]" strokeWidth={1.7} />
              )}
              <span>{toneMood === 'bright' ? 'BR' : 'DK'}</span>
            </button>

            {activePreset && (
              <button
                type="button"
                aria-label={isFavorite ? 'Remove favorite' : 'Save favorite'}
                onClick={() => onToggleFavorite(activePreset.id)}
                className="w-[32px] h-[32px] border border-[#E9E3D8]/20 bg-[#191919]/75 hover:border-[#A58C73] flex items-center justify-center transition-colors cursor-pointer"
              >
                <Bookmark
                  className={`w-3.5 h-3.5 ${
                    isFavorite ? 'text-[#A58C73] fill-[#A58C73]' : 'text-[#E9E3D8]'
                  }`}
                  strokeWidth={1.6}
                />
              </button>
            )}

            <button
              type="button"
              onClick={onOpenExport}
              className="h-[32px] px-2.5 bg-[#E9E3D8] text-[#191919] text-[10.5px] font-medium tracking-[0.05em] inline-flex items-center gap-1 hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Download className="w-3 h-3" strokeWidth={1.7} />
              <span>Export</span>
            </button>

            <button
              type="button"
              aria-label="Exit fullscreen"
              onClick={onClose}
              className="w-[32px] h-[32px] border border-[#E9E3D8]/20 bg-[#191919]/75 hover:border-[#E9E3D8] flex items-center justify-center text-[#E9E3D8] transition-colors cursor-pointer"
            >
              <Minimize2 className="w-3.5 h-3.5" strokeWidth={1.6} />
            </button>
          </div>
        </div>

        {/* Optional Quick Category Drawer inside Fullscreen */}
        {showCategoryDrawer && (
          <div className="mt-2.5 p-2.5 bg-[#191919]/95 border border-[#E9E3D8]/20 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <button
                type="button"
                onClick={() => {
                  onSelectCategory('suggested');
                  setShowCategoryDrawer(false);
                }}
                className={`flex-1 py-1.5 px-2 font-mono text-[9.5px] tracking-[0.08em] border transition-colors cursor-pointer ${
                  activeCategoryFilter === 'suggested'
                    ? 'bg-[#E9E3D8] text-[#191919] border-[#E9E3D8]'
                    : 'border-[#E9E3D8]/20 text-[#E9E3D8]/80 hover:border-[#A58C73]'
                }`}
              >
                SUGGESTED
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectCategory('all');
                  setShowCategoryDrawer(false);
                }}
                className={`flex-1 py-1.5 px-2 font-mono text-[9.5px] tracking-[0.08em] border transition-colors cursor-pointer ${
                  activeCategoryFilter === 'all'
                    ? 'bg-[#E9E3D8] text-[#191919] border-[#E9E3D8]'
                    : 'border-[#E9E3D8]/20 text-[#E9E3D8]/80 hover:border-[#A58C73]'
                }`}
              >
                ALL ({STILL_PRESETS.length})
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {PHOTO_CATEGORIES.map((cat) => {
                const isSelected = activeCategoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      onSelectCategory(cat.id);
                      setShowCategoryDrawer(false);
                    }}
                    className={`px-1.5 py-1.5 text-[10px] font-medium border text-center truncate transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#E9E3D8] text-[#191919] border-[#E9E3D8]'
                        : 'border-[#E9E3D8]/15 text-[#E9E3D8]/80 hover:border-[#A58C73]'
                    }`}
                  >
                    {cat.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ================= BOTTOM EDITORIAL PRESET & INTENSITY BAR ================= */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className={`absolute inset-x-0 bottom-0 pt-7 pb-5 px-5 bg-gradient-to-t from-black/82 via-black/48 to-transparent transition-opacity duration-200 ${
          hudVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[9.5px] tracking-[0.14em] text-[#A58C73] truncate">
              {activePreset
                ? `${activePreset.code} · ${activePreset.categoryLabel.toUpperCase()}${
                    activePreset.isSignature ? ' · SIGNATURE' : ''
                  }`
                : 'ORIGINAL · NO PRESET'}
            </p>
            <h2 className="font-serif text-[26px] leading-[1.12] text-[#E9E3D8] mt-0.5 truncate">
              {activePreset ? activePreset.name : 'Neutral Plate'}
            </h2>
          </div>

          <span className="font-mono text-[9px] tracking-[0.1em] text-[#E9E3D8]/60 shrink-0 pb-1">
            {isZoomed ? 'DRAG TO PAN' : 'TAP TO HIDE UI'}
          </span>
        </div>

        {/* Hairline Intensity Slider */}
        {activePreset && (
          <div className="mt-3 flex items-center gap-3">
            <span className="font-mono text-[9px] tracking-[0.12em] text-[#E9E3D8]/70 shrink-0">
              INTENSITY
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={intensity}
              aria-label="Preset intensity"
              onPointerDown={onIntensityDragStart}
              onPointerUp={onIntensityDragEnd}
              onChange={(e) => onIntensityChange(Number(e.target.value))}
              className="still-slider flex-1"
            />
            <span className="font-mono text-[10px] text-[#E9E3D8] tabular-nums w-8 text-right shrink-0">
              {intensity}%
            </span>
          </div>
        )}

        {/* Editorial Position Rail */}
        <div className="mt-3 h-[2px] w-full bg-[#E9E3D8]/18 overflow-hidden">
          <div
            className="h-full bg-[#A58C73] transition-all duration-150"
            style={{ width: `${Math.round(progressRatio * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
