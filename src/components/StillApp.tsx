import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronLeft,
  Columns2,
  Compass,
  Crop,
  Download,
  Eye,
  FlipHorizontal2,
  FlipVertical2,
  Focus,
  Frame,
  ImagePlus,
  Layers,
  LayoutGrid,
  LayoutPanelLeft,
  Maximize2,
  Moon,
  Plus,
  Redo2,
  RotateCcw,
  RotateCw,
  Save,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  Undo2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  CATEGORY_SHOWCASES,
  CategoryShowcase,
  SAMPLE_PLATES,
  SampleEditorialPlate,
  getDailyEditionLabel,
  getDailyPhotosOfTheDay,
  getLocalCalendarKey,
} from '../data/stillCatalog';
import { PWAInstallButton } from './PWAInstallButton';
import {
  FullscreenCategoryOption,
  FullscreenSwipeStudio,
} from './FullscreenSwipeStudio';
import {
  CROP_RATIOS,
  ColorAdjustments,
  CropRatio,
  CustomEditorialPreset,
  DEFAULT_ADJUSTMENTS,
  ExportFormat,
  ExportQuality,
  MATTE_FRAMES,
  MatteFrameStyle,
  NumericAdjustmentKey,
  PHOTO_CATEGORIES,
  PhotoCategoryId,
  STILL_PRESETS,
  StillPreset,
  ToneMood,
  computeShaderParams,
  getPresetById,
  getPresetsByCategory,
  getSuggestedPresets,
  hasCurveOrSplitToneActive,
  hasManualAdjustments,
  renderEditedPhotoToDataUrl,
} from '../engine/stillColorEngine';
import { analyzePhotoOffline } from '../engine/photoAnalyzer';
import {
  analyzeImageHistogram,
  PhotoHistogramStats,
} from '../engine/stillHistogramEngine';
import {
  exportRecipeToCubeLut,
  parseCubeLut,
  ParsedCubeLut,
} from '../engine/stillLutEngine';
import {
  evaluatePixelColorPipeline,
  NEUTRAL_TONE_CURVE,
} from '../engine/stillShaderEngine';
import {
  parseExifFromFile,
  PhotoExifData,
} from '../engine/stillExifEngine';
import {
  computeSeriesSyncOffsets,
  createSeriesPhotoItem,
  renderSeriesBatch,
  SeriesPhotoItem,
} from '../engine/stillBatchEngine';
import {
  DEFAULT_FREE_CROP,
  DEFAULT_GEOMETRY,
  detectAutoHorizonAngle,
  FreeCropRect,
  GeometryTransform,
  isGeometryNeutral,
} from '../engine/stillGeometryEngine';
import {
  analyzeOpticalQuality,
  OpticalQualityReport,
} from '../engine/stillRestoreEngine';
import {
  SavedEditorialProject,
  useStillStorage,
} from '../hooks/useStillStorage';
import {
  EditorialHistogramBar,
  StillShaderThumb,
  StillShaderViewport,
} from './StillShaderCanvas';
import { FreeCropOverlay } from './FreeCropOverlay';
import { SeriesContactSheet } from './SeriesContactSheet';
import { ToneCurveEditor } from './ToneCurveEditor';
import { EditorialFrameWrapper } from './EditorialFrameWrapper';
import { DailyPotdCarousel } from './DailyPotdCarousel';
import { EditorialCollageStudio } from './EditorialCollageStudio';
import { StillEffectsStudio } from './StillEffectsStudio';
import {
  countActiveStillEffects,
  DEFAULT_STILL_EFFECTS,
  format90sDateStamp,
  mergeStillEffects,
  StillEffectsConfig,
} from '../engine/stillEffectsEngine';

type StillDestination = 'discover' | 'studio' | 'library';
type LibrarySection = 'favorites' | 'custom' | 'projects' | 'recent';
type StudioToolTab = 'presets' | 'adjust' | 'effects' | 'frame';
type AdjustSubTab = 'color' | 'curve' | 'restore';
type FrameSubTab = 'matte' | 'geometry';
type PresetBrowseFilter =
  | 'suggested'
  | 'custom'
  | 'lut'
  | 'all'
  | PhotoCategoryId;

interface ActivePhoto {
  src: string;
  name: string;
  dimensions: string | null;
  exif?: PhotoExifData | null;
}

interface EditSnapshot {
  presetId: string | null;
  customPresetId: string | null;
  intensity: number;
  toneMood: ToneMood;
  autoBalance: boolean;
  lutId: string | null;
  lutStrength: number;
  adjustments: ColorAdjustments;
  cropRatio: CropRatio;
  freeCrop: FreeCropRect;
  geometry: GeometryTransform;
  upscale2x: boolean;
  frameStyle: MatteFrameStyle;
  frameStamp: boolean;
  frameCaption: string;
}

const DEFAULT_SNAPSHOT: EditSnapshot = {
  presetId: null,
  customPresetId: null,
  intensity: 85,
  toneMood: 'bright',
  autoBalance: true,
  lutId: null,
  lutStrength: 85,
  adjustments: {
    ...DEFAULT_ADJUSTMENTS,
    toneCurve: [...NEUTRAL_TONE_CURVE],
  },
  cropRatio: 'original',
  freeCrop: { ...DEFAULT_FREE_CROP },
  geometry: { ...DEFAULT_GEOMETRY },
  upscale2x: false,
  frameStyle: 'none',
  frameStamp: false,
  frameCaption: '',
};

const ADJUSTMENT_CONTROLS: {
  key: NumericAdjustmentKey;
  label: string;
  min: number;
  max: number;
}[] = [
  { key: 'exposure', label: 'Exposure', min: -50, max: 50 },
  { key: 'contrast', label: 'Contrast', min: -50, max: 50 },
  { key: 'clarity', label: 'Clarity', min: -50, max: 100 },
  { key: 'sharpen', label: 'Sharpen', min: 0, max: 100 },
  { key: 'highlights', label: 'Highlights', min: -50, max: 50 },
  { key: 'shadows', label: 'Shadows', min: -50, max: 50 },
  { key: 'warmth', label: 'Warmth', min: -50, max: 50 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 50 },
  { key: 'fade', label: 'Fade', min: 0, max: 50 },
  { key: 'bloom', label: 'Pro-Mist Bloom', min: 0, max: 100 },
  { key: 'halation', label: 'Film Halation', min: 0, max: 100 },
  { key: 'chromaticAberration', label: 'Lens Fringe', min: 0, max: 100 },
  { key: 'grain', label: 'Film Grain', min: 0, max: 100 },
  { key: 'vignette', label: 'Vignette', min: 0, max: 100 },
  { key: 'skinProtect', label: 'Skin Guard', min: 0, max: 100 },
];

function getCropAspectStyle(ratio: CropRatio): React.CSSProperties | undefined {
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

function getCropContainerSizeClass(ratio: CropRatio): string {
  if (ratio === '16:9') return 'w-full max-w-[314px]';
  if (ratio === 'original' || ratio === 'free') {
    return 'max-w-full max-h-[268px]';
  }
  return 'h-[246px] max-w-[314px]';
}

function EditorialPhoto({
  src,
  alt,
  aspectClass,
  filterStyle,
}: {
  src: string;
  alt: string;
  aspectClass: string;
  filterStyle?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) {
    return (
      <div
        className={`w-full ${aspectClass} bg-paper-high dark:bg-ink-high border border-hairline-light dark:border-hairline-dark flex flex-col items-center justify-center p-6 text-center`}
      >
        <span className="font-mono text-[10px] tracking-[0.14em] text-still-taupe">
          STILL PLATE
        </span>
        <span className="font-serif text-lg mt-1.5">{alt}</span>
      </div>
    );
  }

  return (
    <div
      className={`w-full ${aspectClass} overflow-hidden bg-paper-low dark:bg-ink-low`}
    >
      <img
        src={src}
        alt={alt}
        crossOrigin={src.startsWith('http') ? 'anonymous' : undefined}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        style={filterStyle ? { filter: filterStyle } : undefined}
        className="w-full h-full object-cover block"
      />
    </div>
  );
}

export function StillApp() {
  const {
    favoritePresetIds,
    recentPresetIds,
    customPresets,
    savedProjects,
    editedPhotos,
    toggleFavoritePreset,
    recordRecentPreset,
    saveCustomPreset,
    deleteCustomPreset,
    saveProject,
    deleteProject,
    recordEditedPhoto,
  } = useStillStorage();

  const [destination, setDestination] = useState<StillDestination>('discover');
  const [librarySection, setLibrarySection] =
    useState<LibrarySection>('favorites');
  const [potdIndex, setPotdIndex] = useState<number>(0);
  const [calendarDayKey, setCalendarDayKey] = useState<string>(() =>
    getLocalCalendarKey()
  );
  const [selectedCategoryDetail, setSelectedCategoryDetail] =
    useState<CategoryShowcase | null>(null);
  const [categoryPreviewTone, setCategoryPreviewTone] =
    useState<ToneMood>('bright');

  // Studio Photo & Scene State
  const [activePhoto, setActivePhoto] = useState<ActivePhoto | null>(null);
  const [detectedCategory, setDetectedCategory] =
    useState<PhotoCategoryId>('editorial');
  const [detectionNote, setDetectionNote] = useState<string>('');
  const [presetBrowseFilter, setPresetBrowseFilter] =
    useState<PresetBrowseFilter>('suggested');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Undo / Redo Snapshot State
  const [edit, setEdit] = useState<EditSnapshot>(DEFAULT_SNAPSHOT);
  const [undoStack, setUndoStack] = useState<EditSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<EditSnapshot[]>([]);
  const dragStartSnapshotRef = useRef<EditSnapshot | null>(null);

  // Studio Tool & Compare UI
  const [studioTab, setStudioTab] = useState<StudioToolTab>('presets');
  const [adjustSubTab, setAdjustSubTab] = useState<AdjustSubTab>('color');
  const [frameSubTab, setFrameSubTab] = useState<FrameSubTab>('matte');
  const [isFreeCropEditing, setIsFreeCropEditing] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomPan, setZoomPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanningZoom, setIsPanningZoom] = useState(false);
  const isZoom2x = zoomScale > 1.02;
  const activeZoomPointersRef = useRef<Map<number, { x: number; y: number }>>(
    new Map()
  );
  const zoomPinchStartRef = useRef<{ dist: number; scale: number } | null>(null);
  const zoomDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  const [isDraggingStraighten, setIsDraggingStraighten] = useState(false);
  const [activeAdjustmentKey, setActiveAdjustmentKey] =
    useState<NumericAdjustmentKey>('exposure');
  const [isComparingOriginal, setIsComparingOriginal] = useState(false);
  const [splitCompareMode, setSplitCompareMode] = useState(false);
  const [splitPosition, setSplitPosition] = useState(50);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingSplitRef = useRef(false);
  const loadedViewportImgRef = useRef<HTMLImageElement | null>(null);

  const clampStudioPan = useCallback(
    (x: number, y: number, scale: number): { x: number; y: number } => {
      if (scale <= 1.02) return { x: 0, y: 0 };
      const rect = splitContainerRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) {
        return { x: 0, y: 0 };
      }
      const maxX = ((scale - 1) * rect.width) / 2;
      const maxY = ((scale - 1) * rect.height) / 2;
      return {
        x: Math.max(-maxX, Math.min(maxX, x)),
        y: Math.max(-maxY, Math.min(maxY, y)),
      };
    },
    []
  );

  const resetStudioZoom = useCallback(() => {
    setZoomScale(1);
    setZoomPan({ x: 0, y: 0 });
    setIsPanningZoom(false);
    activeZoomPointersRef.current.clear();
    zoomPinchStartRef.current = null;
    zoomDragRef.current = null;
  }, []);

  // Histogram, Optical Quality, 3D LUT (.CUBE), and Editorial Series State
  const [photoHistogram, setPhotoHistogram] =
    useState<PhotoHistogramStats | null>(null);
  const [opticalQuality, setOpticalQuality] =
    useState<OpticalQualityReport | null>(null);
  const [importedLuts, setImportedLuts] = useState<ParsedCubeLut[]>([]);
  const [seriesItems, setSeriesItems] = useState<SeriesPhotoItem[]>([]);
  const [seriesHeroId, setSeriesHeroId] = useState<string | null>(null);
  const [seriesMatchExposure, setSeriesMatchExposure] = useState(true);
  const [showSeriesSheet, setShowSeriesSheet] = useState(false);
  const [showCollageStudio, setShowCollageStudio] = useState(false);
  const [seriesExportProgress, setSeriesExportProgress] = useState<
    string | null
  >(null);

  // Save Custom Preset Sheet
  const [showSavePresetSheet, setShowSavePresetSheet] = useState(false);
  const [customPresetName, setCustomPresetName] = useState('');

  // Export Bottom Sheet
  const [showExportSheet, setShowExportSheet] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('jpeg');
  const [exportQuality, setExportQuality] = useState<ExportQuality>('high');
  const [isExporting, setIsExporting] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const seriesInputRef = useRef<HTMLInputElement | null>(null);
  const lutInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2200);
  }, []);

  // Commit a discrete edit change onto the undo stack
  const commitEdit = useCallback((updater: (prev: EditSnapshot) => EditSnapshot) => {
    setEdit((prev) => {
      const next = updater(prev);
      setUndoStack((stack) => [...stack.slice(-24), prev]);
      setRedoStack([]);
      return next;
    });
  }, []);

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((stack) => stack.slice(0, -1));
    setRedoStack((stack) => [...stack, edit]);
    setEdit(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((stack) => stack.slice(0, -1));
    setUndoStack((stack) => [...stack, edit]);
    setEdit(next);
  };

  const beginSliderDrag = () => {
    dragStartSnapshotRef.current = edit;
  };

  const endSliderDrag = () => {
    const startSnap = dragStartSnapshotRef.current;
    dragStartSnapshotRef.current = null;
    if (startSnap && JSON.stringify(startSnap) !== JSON.stringify(edit)) {
      setUndoStack((stack) => [...stack.slice(-24), startSnap]);
      setRedoStack([]);
    }
  };

  const activePreset = useMemo(
    () => getPresetById(edit.presetId),
    [edit.presetId]
  );

  const activeCustomPreset = useMemo(
    () => customPresets.find((p) => p.id === edit.customPresetId) ?? null,
    [customPresets, edit.customPresetId]
  );

  const activeLut = useMemo(
    () => importedLuts.find((l) => l.id === edit.lutId) ?? null,
    [importedLuts, edit.lutId]
  );

  const activeCodeLabel =
    activeCustomPreset?.code ??
    activePreset?.code ??
    (activeLut ? 'LUT-3D' : 'ORIGINAL');
  const activeNameLabel =
    activeCustomPreset?.name ??
    activePreset?.name ??
    activeLut?.name ??
    'Raw Plate';

  const currentMonthYear = useMemo(
    () =>
      new Date()
        .toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        .toUpperCase(),
    []
  );

  const stampCaption = `STILL.  ·  ${activeCodeLabel} ${activeNameLabel}  ·  ${currentMonthYear}`;

  const activeEffectsCount = useMemo(
    () => countActiveStillEffects(edit.adjustments.effects),
    [edit.adjustments.effects]
  );

  const computedShaderParams = useMemo(() => {
    const base = computeShaderParams(
      activePreset,
      edit.intensity,
      edit.adjustments,
      edit.toneMood,
      photoHistogram,
      edit.autoBalance,
      activeLut,
      edit.lutStrength
    );
    if (base.effects && base.effects.dateStamp.enabled && !base.effects.dateStamp.customText) {
      return {
        ...base,
        effects: {
          ...base.effects,
          dateStamp: {
            ...base.effects.dateStamp,
            autoExifText: format90sDateStamp(activePhoto?.exif?.dateTaken),
          },
        },
      };
    }
    return base;
  }, [
    activePreset,
    edit.intensity,
    edit.adjustments,
    edit.toneMood,
    photoHistogram,
    edit.autoBalance,
    activeLut,
    edit.lutStrength,
    activePhoto?.exif?.dateTaken,
  ]);

  const suggestedPresets = useMemo(
    () => getSuggestedPresets(detectedCategory),
    [detectedCategory]
  );

  const visibleStudioPresets = useMemo(() => {
    if (presetBrowseFilter === 'suggested') return suggestedPresets;
    if (presetBrowseFilter === 'all') return STILL_PRESETS;
    if (presetBrowseFilter === 'custom' || presetBrowseFilter === 'lut')
      return [];
    return getPresetsByCategory(presetBrowseFilter);
  }, [presetBrowseFilter, suggestedPresets]);

  const detectedCategoryMeta = useMemo(
    () =>
      PHOTO_CATEGORIES.find((c) => c.id === detectedCategory) ??
      PHOTO_CATEGORIES[0],
    [detectedCategory]
  );

  const activeFrameMeta = useMemo(
    () =>
      MATTE_FRAMES.find((f) => f.id === edit.frameStyle) ?? MATTE_FRAMES[0],
    [edit.frameStyle]
  );

  const handleViewportImageLoaded = useCallback((img: HTMLImageElement) => {
    loadedViewportImgRef.current = img;
    const stats = analyzeImageHistogram(img);
    setPhotoHistogram(stats);
    setOpticalQuality(analyzeOpticalQuality(img));
  }, []);

  const handleAutoRestore = () => {
    const q =
      opticalQuality ??
      (loadedViewportImgRef.current
        ? analyzeOpticalQuality(loadedViewportImgRef.current)
        : null);
    const nextDeblur = q?.suggestedDeblur ?? 52;
    const nextDenoise = q?.suggestedDenoise ?? 24;
    const nextUpscale = q?.suggestedUpscale2x ?? true;

    commitEdit((prev) => ({
      ...prev,
      customPresetId: null,
      upscale2x: nextUpscale,
      adjustments: {
        ...prev.adjustments,
        deblur: nextDeblur,
        denoise: nextDenoise,
      },
    }));
    showToast(
      `Auto Restore · Deblur ${nextDeblur}${nextUpscale ? ' · 2× HD' : ''}`
    );
  };

  const handleResetRestore = () => {
    commitEdit((prev) => ({
      ...prev,
      upscale2x: false,
      adjustments: {
        ...prev.adjustments,
        deblur: 0,
        denoise: 0,
      },
    }));
    showToast('Optical Restore reset');
  };

  const handleResetCurveAndSplit = () => {
    commitEdit((prev) => ({
      ...prev,
      customPresetId: null,
      adjustments: {
        ...prev.adjustments,
        toneCurve: [...NEUTRAL_TONE_CURVE],
        manualShadowTintHex: null,
        manualShadowTintStrength: 0,
        manualHighlightTintHex: null,
        manualHighlightTintStrength: 0,
      },
    }));
    showToast('Curve & Split-Tone reset');
  };

  const handleAutoLevelHorizon = () => {
    const img = loadedViewportImgRef.current;
    if (!img) return;
    const detected = detectAutoHorizonAngle(img);
    if (Math.abs(detected) < 0.1) {
      commitEdit((prev) => ({
        ...prev,
        geometry: { ...prev.geometry, straighten: 0 },
      }));
      showToast('Horizon already level (0.0°)');
      return;
    }
    commitEdit((prev) => ({
      ...prev,
      geometry: { ...prev.geometry, straighten: detected },
    }));
    showToast(
      `Auto-Level aligned (${detected > 0 ? `+${detected.toFixed(1)}` : detected.toFixed(1)}°)`
    );
  };

  const handleRotate90 = () => {
    commitEdit((prev) => ({
      ...prev,
      geometry: {
        ...prev.geometry,
        rotate90: (((prev.geometry.rotate90 + 90) % 360) as 0 | 90 | 180 | 270),
      },
    }));
  };

  const handleFlipH = () => {
    commitEdit((prev) => ({
      ...prev,
      geometry: { ...prev.geometry, flipH: !prev.geometry.flipH },
    }));
  };

  const handleFlipV = () => {
    commitEdit((prev) => ({
      ...prev,
      geometry: { ...prev.geometry, flipV: !prev.geometry.flipV },
    }));
  };

  const handleResetGeometry = () => {
    commitEdit((prev) => ({
      ...prev,
      geometry: { ...DEFAULT_GEOMETRY },
    }));
    showToast('Geometry reset');
  };

  const buildShaderParamsForSeriesItem = useCallback(
    (item: SeriesPhotoItem) => {
      const delta = seriesMatchExposure ? item.matchedExposureDelta : 0;
      return computeShaderParams(
        activePreset,
        edit.intensity,
        edit.adjustments,
        edit.toneMood,
        item.histogram,
        edit.autoBalance,
        activeLut,
        edit.lutStrength,
        delta
      );
    },
    [
      activePreset,
      edit.intensity,
      edit.adjustments,
      edit.toneMood,
      edit.autoBalance,
      activeLut,
      edit.lutStrength,
      seriesMatchExposure,
    ]
  );

  const applyNewPhotoWithSuggestions = async (
    photo: ActivePhoto,
    explicitCategory?: PhotoCategoryId,
    explicitTone?: ToneMood,
    explicitPresetId?: string | null
  ) => {
    setActivePhoto(photo);
    setUndoStack([]);
    setRedoStack([]);
    setStudioTab('presets');
    setPresetBrowseFilter('suggested');
    setShowCategoryPicker(false);
    setSelectedCategoryDetail(null);
    setSplitCompareMode(false);
    resetStudioZoom();
    setDestination('studio');

    if (explicitCategory && explicitTone) {
      setDetectedCategory(explicitCategory);
      setDetectionNote(
        PHOTO_CATEGORIES.find((c) => c.id === explicitCategory)?.label ??
          'Editorial'
      );
      const best =
        explicitPresetId ?? getSuggestedPresets(explicitCategory)[0]?.id ?? null;
      setEdit({
        ...DEFAULT_SNAPSHOT,
        presetId: best,
        toneMood: explicitTone,
      });
      if (best) recordRecentPreset(best);
      return;
    }

    const analysis = await analyzePhotoOffline(photo.src, photo.name);
    setDetectedCategory(analysis.suggestedCategory);
    setDetectionNote(analysis.reason);

    const topSuggestion = getSuggestedPresets(analysis.suggestedCategory)[0];

    setEdit({
      ...DEFAULT_SNAPSHOT,
      presetId: topSuggestion?.id ?? null,
      toneMood: analysis.suggestedTone,
    });

    if (topSuggestion) {
      recordRecentPreset(topSuggestion.id);
      const catName =
        PHOTO_CATEGORIES.find((c) => c.id === analysis.suggestedCategory)
          ?.label ?? 'Editorial';
      showToast(`Suggested ${catName} · ${analysis.suggestedTone.toUpperCase()}`);
    }
  };

  const handleToneMoodChange = (nextTone: ToneMood) => {
    if (edit.toneMood === nextTone) return;
    commitEdit((prev) => ({
      ...prev,
      toneMood: nextTone,
    }));
  };

  const handleOverrideCategory = (nextCat: PhotoCategoryId) => {
    setDetectedCategory(nextCat);
    setShowCategoryPicker(false);
    setPresetBrowseFilter('suggested');
    const nextTop = getSuggestedPresets(nextCat)[0];
    if (nextTop) {
      commitEdit((prev) => ({
        ...prev,
        presetId: nextTop.id,
        customPresetId: null,
        intensity: 85,
      }));
      recordRecentPreset(nextTop.id);
    }
    const label =
      PHOTO_CATEGORIES.find((c) => c.id === nextCat)?.label ?? nextCat;
    setDetectionNote(`Curated for ${label}`);
  };

  const handleSelectPreset = (preset: StillPreset | null) => {
    commitEdit((prev) => ({
      ...prev,
      presetId: preset?.id ?? null,
      customPresetId: null,
      intensity: 85,
    }));
    if (preset) recordRecentPreset(preset.id);
  };

  const handleSelectCustomPreset = (custom: CustomEditorialPreset) => {
    commitEdit((prev) => ({
      ...prev,
      presetId: custom.basePresetId,
      customPresetId: custom.id,
      toneMood: custom.tone,
      intensity: custom.intensity,
      adjustments: {
        ...DEFAULT_ADJUSTMENTS,
        ...custom.adjustments,
        effects: mergeStillEffects(custom.adjustments?.effects),
      },
    }));
    showToast(`Applied ${custom.code} ${custom.name}`);
  };

  const handleTryPresetInStudio = (
    preset: StillPreset,
    fallbackPlate?: SampleEditorialPlate,
    preferredTone?: ToneMood
  ) => {
    if (!activePhoto) {
      const plate =
        fallbackPlate ??
        SAMPLE_PLATES.find((p) => p.categoryId === preset.categoryId) ??
        SAMPLE_PLATES[0];
      void applyNewPhotoWithSuggestions(
        { src: plate.imageUrl, name: plate.name, dimensions: null },
        preset.categoryId,
        preferredTone ?? plate.suggestedTone,
        preset.id
      );
      return;
    }

    setDetectedCategory(preset.categoryId);
    commitEdit((prev) => ({
      ...prev,
      toneMood: preferredTone ?? prev.toneMood,
      presetId: preset.id,
      customPresetId: null,
      intensity: 85,
    }));
    recordRecentPreset(preset.id);
    setSelectedCategoryDetail(null);
    setStudioTab('presets');
    setPresetBrowseFilter('suggested');
    setDestination('studio');
  };

  const handleTryCustomPresetInStudio = (custom: CustomEditorialPreset) => {
    if (!activePhoto) {
      setActivePhoto({
        src: SAMPLE_PLATES[0].imageUrl,
        name: SAMPLE_PLATES[0].name,
        dimensions: null,
      });
    }
    commitEdit((prev) => ({
      ...prev,
      presetId: custom.basePresetId,
      customPresetId: custom.id,
      toneMood: custom.tone,
      intensity: custom.intensity,
      adjustments: {
        ...DEFAULT_ADJUSTMENTS,
        ...custom.adjustments,
        effects: mergeStillEffects(custom.adjustments?.effects),
      },
    }));
    setStudioTab('presets');
    setPresetBrowseFilter('custom');
    setDestination('studio');
  };

  const handleOpenProject = (project: SavedEditorialProject) => {
    const preset = getPresetById(project.presetId);
    setActivePhoto({
      src: project.photoSrc,
      name: project.title,
      dimensions: null,
    });
    if (preset) setDetectedCategory(preset.categoryId);
    setUndoStack([]);
    setRedoStack([]);
    setEdit({
      presetId: project.presetId,
      customPresetId: project.customPresetId ?? null,
      intensity: project.intensity,
      toneMood: project.toneMood ?? 'bright',
      autoBalance: true,
      lutId: null,
      lutStrength: 85,
      adjustments: {
        ...DEFAULT_ADJUSTMENTS,
        ...project.adjustments,
        effects: mergeStillEffects(project.adjustments?.effects),
        toneCurve:
          Array.isArray(project.adjustments?.toneCurve) &&
          project.adjustments.toneCurve.length === 5
            ? [...project.adjustments.toneCurve]
            : [...NEUTRAL_TONE_CURVE],
      },
      cropRatio: project.cropRatio ?? 'original',
      freeCrop: project.freeCrop
        ? { ...DEFAULT_FREE_CROP, ...project.freeCrop }
        : { ...DEFAULT_FREE_CROP },
      geometry: project.geometry
        ? { ...DEFAULT_GEOMETRY, ...project.geometry }
        : { ...DEFAULT_GEOMETRY },
      upscale2x: project.upscale2x ?? false,
      frameStyle: project.frameStyle ?? 'none',
      frameStamp: project.frameStamp ?? false,
      frameCaption: project.frameCaption ?? '',
    });
    setIsFreeCropEditing(false);
    resetStudioZoom();
    setDestination('studio');
    showToast(`Opened ${project.title}`);
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []).slice(0, 8);
    event.target.value = '';
    if (files.length === 0) return;

    const loadedItems: SeriesPhotoItem[] = [];
    for (const file of files) {
      const [dataUrl, exif] = await Promise.all([
        readFileAsDataUrl(file),
        parseExifFromFile(file),
      ]);
      if (!dataUrl) continue;
      const item = await createSeriesPhotoItem(
        dataUrl,
        file.name.replace(/\.[^.]+$/, ''),
        null,
        exif
      );
      loadedItems.push(item);
    }

    if (loadedItems.length === 0) return;

    const hero = loadedItems[0];
    const synced = computeSeriesSyncOffsets(
      loadedItems,
      hero.id,
      seriesMatchExposure
    );
    setSeriesItems(synced);
    setSeriesHeroId(hero.id);

    await applyNewPhotoWithSuggestions({
      src: hero.src,
      name: hero.name,
      dimensions: hero.dimensions,
      exif: hero.exif ?? null,
    });

    if (loadedItems.length > 1) {
      showToast(`Editorial Series loaded (${loadedItems.length} plates)`);
    }
  };

  const handleAddSeriesFiles = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;

    const baseList =
      seriesItems.length > 0
        ? seriesItems
        : activePhoto
          ? [
              await createSeriesPhotoItem(
                activePhoto.src,
                activePhoto.name,
                activePhoto.dimensions,
                activePhoto.exif ?? null
              ),
            ]
          : [];

    const remainingSlots = Math.max(0, 8 - baseList.length);
    const additions: SeriesPhotoItem[] = [];
    for (const file of files.slice(0, remainingSlots)) {
      const [dataUrl, exif] = await Promise.all([
        readFileAsDataUrl(file),
        parseExifFromFile(file),
      ]);
      if (!dataUrl) continue;
      additions.push(
        await createSeriesPhotoItem(
          dataUrl,
          file.name.replace(/\.[^.]+$/, ''),
          null,
          exif
        )
      );
    }

    const combined = [...baseList, ...additions];
    const heroId = seriesHeroId ?? combined[0]?.id ?? null;
    if (!heroId) return;
    setSeriesHeroId(heroId);
    setSeriesItems(
      computeSeriesSyncOffsets(combined, heroId, seriesMatchExposure)
    );
    showToast(`Series updated (${combined.length} plates)`);
  };

  const handleOpenSeriesSheet = async () => {
    if (seriesItems.length === 0 && activePhoto) {
      const current = await createSeriesPhotoItem(
        activePhoto.src,
        activePhoto.name,
        activePhoto.dimensions,
        activePhoto.exif ?? null
      );
      setSeriesItems([current]);
      setSeriesHeroId(current.id);
    }
    setShowSeriesSheet(true);
  };

  const handleLoadSampleSeries = async () => {
    const samples = SAMPLE_PLATES.slice(0, 3);
    const created: SeriesPhotoItem[] = [];
    for (const plate of samples) {
      created.push(await createSeriesPhotoItem(plate.imageUrl, plate.name));
    }
    if (created.length === 0) return;
    const hero = created[0];
    setSeriesHeroId(hero.id);
    setSeriesItems(
      computeSeriesSyncOffsets(created, hero.id, seriesMatchExposure)
    );
    await applyNewPhotoWithSuggestions(
      { src: hero.src, name: hero.name, dimensions: hero.dimensions },
      samples[0].categoryId,
      samples[0].suggestedTone
    );
    setShowSeriesSheet(true);
  };

  const handleSelectSeriesHero = (id: string) => {
    const found = seriesItems.find((item) => item.id === id);
    if (!found) return;
    setSeriesHeroId(id);
    setSeriesItems((prev) =>
      computeSeriesSyncOffsets(prev, id, seriesMatchExposure)
    );
    setActivePhoto({
      src: found.src,
      name: found.name,
      dimensions: found.dimensions,
      exif: found.exif ?? null,
    });
    if (found.histogram) setPhotoHistogram(found.histogram);
    setShowSeriesSheet(false);
    showToast(`Hero switched to ${found.name}`);
  };

  const handleToggleSeriesMatchExposure = () => {
    setSeriesMatchExposure((prev) => {
      const next = !prev;
      if (seriesHeroId) {
        setSeriesItems((items) =>
          computeSeriesSyncOffsets(items, seriesHeroId, next)
        );
      }
      return next;
    });
  };

  const handleRemoveSeriesItem = (id: string) => {
    setSeriesItems((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      if (filtered.length === 0) return prev;
      const nextHero =
        seriesHeroId === id ? filtered[0].id : (seriesHeroId ?? filtered[0].id);
      setSeriesHeroId(nextHero);
      return computeSeriesSyncOffsets(
        filtered,
        nextHero,
        seriesMatchExposure
      );
    });
  };

  const handleLutFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseCubeLut(text, file.name);
      setImportedLuts((prev) => [parsed, ...prev].slice(0, 12));
      commitEdit((prev) => ({
        ...prev,
        lutId: parsed.id,
        lutStrength: 85,
      }));
      setPresetBrowseFilter('lut');
      showToast(`Imported 3D LUT · ${parsed.name}`);
    } catch {
      showToast('Invalid .CUBE 3D LUT file');
    }
  };

  const handleExportCubeLut = () => {
    const title = `STILL ${activeCodeLabel} ${activeNameLabel} (${edit.toneMood.toUpperCase()})`;
    const cubeContent = exportRecipeToCubeLut(
      title,
      (r, g, b) => evaluatePixelColorPipeline(r, g, b, computedShaderParams),
      17
    );
    const blob = new Blob([cubeContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `still_${activeCodeLabel.toLowerCase()}_${edit.toneMood}.cube`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported 17³ .CUBE 3D LUT`);
  };

  const handleExportSeriesAll = async () => {
    if (seriesItems.length === 0 || isExporting) return;
    setIsExporting(true);
    setSeriesExportProgress(`0 / ${seriesItems.length}`);
    try {
      const renderOptions = {
        cropRatio: edit.cropRatio,
        freeCrop: edit.freeCrop,
        geometry: edit.geometry,
        upscale2x: edit.upscale2x,
        frameStyle: edit.frameStyle,
        frameStamp: edit.frameStamp,
        stampText: stampCaption,
        presetCode: activeCodeLabel,
        exif: activePhoto?.exif ?? null,
        frameCaption: edit.frameCaption,
        format: exportFormat,
        quality: exportQuality,
      };
      const results = await renderSeriesBatch(
        seriesItems,
        buildShaderParamsForSeriesItem,
        renderOptions,
        (done, total) => setSeriesExportProgress(`Rendering ${done} / ${total}...`)
      );

      const ext = exportFormat === 'png' ? 'png' : 'jpg';
      const codeSlug = activeCodeLabel.toLowerCase();
      results.forEach((res, idx) => {
        const link = document.createElement('a');
        link.download = `${res.item.name.replace(/\s+/g, '_').toLowerCase()}_${codeSlug}_0${idx + 1}.${ext}`;
        link.href = res.dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        recordEditedPhoto({
          id: `edit-${Date.now()}-${idx}`,
          title: res.item.name,
          thumbnailDataUrl: res.thumbnailDataUrl,
          presetCode: activeCodeLabel,
          resolution: `${res.width} × ${res.height}`,
          formatLabel: exportFormat.toUpperCase(),
          exportedAt: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        });
      });

      setShowSeriesSheet(false);
      showToast(`Exported ${results.length} synced plates`);
    } catch {
      showToast('Unable to export series');
    } finally {
      setIsExporting(false);
      setSeriesExportProgress(null);
    }
  };

  const handleResetEdits = () => {
    commitEdit((prev) => ({
      ...DEFAULT_SNAPSHOT,
      toneMood: prev.toneMood,
    }));
    showToast('Edits reset');
  };

  const handleCreateCustomPreset = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customPresetName.trim();
    if (!trimmed) return;
    const nextNum = String(customPresets.length + 1).padStart(2, '0');
    const created: CustomEditorialPreset = {
      id: `custom-${Date.now()}`,
      code: `MY-${nextNum}`,
      name: trimmed,
      basePresetId: edit.presetId,
      tone: edit.toneMood,
      intensity: edit.intensity,
      adjustments: { ...edit.adjustments },
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    };
    saveCustomPreset(created);
    setEdit((prev) => ({ ...prev, customPresetId: created.id }));
    setCustomPresetName('');
    setShowSavePresetSheet(false);
    setPresetBrowseFilter('custom');
    showToast(`Saved ${created.code} ${created.name}`);
  };

  const handleSaveProject = () => {
    if (!activePhoto) return;
    const dateLabel = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    saveProject({
      id: `proj-${Date.now()}`,
      title: activePhoto.name,
      photoSrc: activePhoto.src,
      presetId: edit.presetId,
      customPresetId: edit.customPresetId,
      presetCode: activeCodeLabel,
      toneMood: edit.toneMood,
      intensity: edit.intensity,
      adjustments: { ...edit.adjustments },
      cropRatio: edit.cropRatio,
      freeCrop: { ...edit.freeCrop },
      geometry: { ...edit.geometry },
      upscale2x: edit.upscale2x,
      frameStyle: edit.frameStyle,
      frameStamp: edit.frameStamp,
      frameCaption: edit.frameCaption,
      savedAt: dateLabel,
    });
    showToast('Project saved to Library');
  };

  const handleConfirmExport = async () => {
    if (!activePhoto || isExporting) return;
    setIsExporting(true);
    try {
      const renderOptions = {
        cropRatio: edit.cropRatio,
        freeCrop: edit.freeCrop,
        geometry: edit.geometry,
        upscale2x: edit.upscale2x,
        frameStyle: edit.frameStyle,
        frameStamp: edit.frameStamp,
        stampText: stampCaption,
        presetCode: activeCodeLabel,
        exif: activePhoto.exif ?? null,
        frameCaption: edit.frameCaption,
        format: exportFormat,
        quality: exportQuality,
      };
      const { dataUrl, width, height } = await renderEditedPhotoToDataUrl(
        activePhoto.src,
        computedShaderParams,
        renderOptions
      );

      const ext = exportFormat === 'png' ? 'png' : 'jpg';
      const link = document.createElement('a');
      const codeSlug = activeCodeLabel.toLowerCase();
      link.download = `${activePhoto.name.replace(/\s+/g, '_').toLowerCase()}_${codeSlug}.${ext}`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const thumb = await renderEditedPhotoToDataUrl(
        activePhoto.src,
        computedShaderParams,
        { ...renderOptions, format: 'jpeg', quality: 'standard' },
        420
      );
      recordEditedPhoto({
        id: `edit-${Date.now()}`,
        title: activePhoto.name,
        thumbnailDataUrl: thumb.dataUrl,
        presetCode: activeCodeLabel,
        resolution: `${width} × ${height}`,
        formatLabel: exportFormat.toUpperCase(),
        exportedAt: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
      setShowExportSheet(false);
      showToast(`Exported ${exportFormat.toUpperCase()} (${width}×${height})`);
    } catch {
      showToast('Unable to export image');
    } finally {
      setIsExporting(false);
    }
  };

  const updateSplitFromPointer = (clientX: number) => {
    const el = splitContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplitPosition(Math.max(4, Math.min(96, pct)));
  };

  const hasRestoreActive =
    edit.adjustments.deblur > 0 ||
    edit.adjustments.denoise > 0 ||
    edit.upscale2x;

  const hasCurveOrSplitActive = hasCurveOrSplitToneActive(edit.adjustments);

  const hasAnyEdit =
    edit.presetId !== null ||
    edit.customPresetId !== null ||
    edit.lutId !== null ||
    edit.cropRatio !== 'original' ||
    !isGeometryNeutral(edit.geometry) ||
    edit.upscale2x ||
    edit.frameStyle !== 'none' ||
    hasManualAdjustments(edit.adjustments);

  const favoritePresets = useMemo(
    () =>
      favoritePresetIds
        .map((id) => getPresetById(id))
        .filter((p): p is StillPreset => p !== null),
    [favoritePresetIds]
  );

  const recentPresets = useMemo(
    () =>
      recentPresetIds
        .map((id) => getPresetById(id))
        .filter((p): p is StillPreset => p !== null),
    [recentPresetIds]
  );

  const activeControlMeta =
    ADJUSTMENT_CONTROLS.find((c) => c.key === activeAdjustmentKey) ??
    ADJUSTMENT_CONTROLS[0];

  useEffect(() => {
    const syncDay = () => {
      const nextKey = getLocalCalendarKey();
      setCalendarDayKey((prev) => (prev === nextKey ? prev : nextKey));
    };
    window.addEventListener('focus', syncDay);
    document.addEventListener('visibilitychange', syncDay);
    return () => {
      window.removeEventListener('focus', syncDay);
      document.removeEventListener('visibilitychange', syncDay);
    };
  }, []);

  const dailyPhotosOfTheDay = useMemo(() => {
    const [y, m, d] = calendarDayKey.split('-').map(Number);
    return getDailyPhotosOfTheDay(new Date(y, (m || 1) - 1, d || 1));
  }, [calendarDayKey]);

  const dailyEditionLabel = useMemo(() => {
    const [y, m, d] = calendarDayKey.split('-').map(Number);
    return getDailyEditionLabel(new Date(y, (m || 1) - 1, d || 1));
  }, [calendarDayKey]);

  const navigateTo = (next: StillDestination) => {
    setSelectedCategoryDetail(null);
    setShowCategoryPicker(false);
    setShowSavePresetSheet(false);
    setShowExportSheet(false);
    setShowSeriesSheet(false);
    setShowCollageStudio(false);
    setIsFullscreenPreview(false);
    setDestination(next);
  };

  return (
    <div className="relative w-full h-full bg-still-paper dark:bg-still-ink text-still-ink dark:text-still-paper flex flex-col overflow-hidden transition-colors duration-200 select-none">
      {/* Android Status Bar */}
      <div className="px-6 pt-3 pb-1.5 flex items-center justify-between font-mono text-[10px] tracking-[0.06em] text-muted-ink dark:text-muted-paper shrink-0">
        <span className="tabular-nums">09:41</span>
        <div className="flex items-center gap-2">
          <span>5G</span>
          <span className="inline-block w-4 h-2 border border-current relative">
            <span className="absolute inset-[1px] right-[3px] bg-current" />
          </span>
        </div>
      </div>

      {/* Transient Editorial Toast */}
      {toastMessage && (
        <div
          role="status"
          className="absolute top-12 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink font-mono text-[10px] tracking-[0.12em] uppercase whitespace-nowrap"
        >
          {toastMessage}
        </div>
      )}

      {/* Hidden Device Photo, Series & 3D LUT (.CUBE) Pickers */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => void handleFileChange(e)}
        className="hidden"
        aria-label="Add photograph or series to edit"
      />
      <input
        ref={seriesInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => void handleAddSeriesFiles(e)}
        className="hidden"
        aria-label="Add photographs to editorial series"
      />
      <input
        ref={lutInputRef}
        type="file"
        accept=".cube,.CUBE,text/plain"
        onChange={(e) => void handleLutFileChange(e)}
        className="hidden"
        aria-label="Import 3D .CUBE LUT file"
      />

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* ================= DISCOVER: CATEGORY DETAIL ================= */}
        {destination === 'discover' && selectedCategoryDetail && (
          <div className="flex-1 overflow-y-auto still-scroll px-6 pt-2 pb-10">
            <button
              type="button"
              onClick={() => setSelectedCategoryDetail(null)}
              className="inline-flex items-center gap-1 min-h-[44px] -ml-1 text-xs font-medium text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
              <span>Discover</span>
            </button>

            <div className="mt-2 flex items-center justify-between font-mono text-[10px] tracking-[0.12em]">
              <span className="text-muted-ink dark:text-muted-paper">
                {selectedCategoryDetail.indexCode} ·{' '}
                {selectedCategoryDetail.name.toUpperCase()}
              </span>
              <span className="text-still-taupe">
                {String(
                  getPresetsByCategory(selectedCategoryDetail.categoryId).length
                ).padStart(2, '0')}{' '}
                PRESETS · BRIGHT / DARK
              </span>
            </div>

            <div className="mt-3">
              <EditorialPhoto
                src={selectedCategoryDetail.coverUrl}
                alt={selectedCategoryDetail.name}
                aspectClass="aspect-[4/3]"
              />
            </div>

            <h1 className="font-serif text-[30px] leading-[1.12] mt-5">
              {selectedCategoryDetail.name}
            </h1>
            <p className="text-[13.5px] leading-[1.6] text-muted-ink dark:text-muted-paper mt-1.5">
              {selectedCategoryDetail.tagline}
            </p>
            <p className="font-mono text-[10px] tracking-[0.1em] text-muted-ink dark:text-muted-paper mt-2">
              {selectedCategoryDetail.examples.toUpperCase()}
            </p>

            <div className="mt-6 pb-2.5 border-b border-hairline-light dark:border-hairline-dark flex items-center justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <h2 className="font-serif text-[20px]">Installed Presets</h2>
                <span className="font-mono text-[10px] tracking-[0.12em] text-muted-ink dark:text-muted-paper">
                  {String(
                    getPresetsByCategory(selectedCategoryDetail.categoryId).length
                  ).padStart(2, '0')}{' '}
                  LOOKS
                </span>
              </div>
              <div
                role="group"
                aria-label="Preview tone"
                className="inline-flex border border-hairline-light dark:border-hairline-dark shrink-0"
              >
                <button
                  type="button"
                  onClick={() => setCategoryPreviewTone('bright')}
                  className={`px-2 py-1 inline-flex items-center gap-1 text-[10px] font-medium transition-colors cursor-pointer ${
                    categoryPreviewTone === 'bright'
                      ? 'bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink'
                      : 'text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
                  }`}
                >
                  <Sun className="w-2.5 h-2.5" strokeWidth={1.6} />
                  <span>Bright</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryPreviewTone('dark')}
                  className={`px-2 py-1 inline-flex items-center gap-1 text-[10px] font-medium border-l border-hairline-light dark:border-hairline-dark transition-colors cursor-pointer ${
                    categoryPreviewTone === 'dark'
                      ? 'bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink'
                      : 'text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
                  }`}
                >
                  <Moon className="w-2.5 h-2.5" strokeWidth={1.6} />
                  <span>Dark</span>
                </button>
              </div>
            </div>

            <div className="divide-y divide-hairline-light dark:divide-hairline-dark">
              {getPresetsByCategory(selectedCategoryDetail.categoryId).map(
                (preset) => {
                  const thumbParams = computeShaderParams(
                    preset,
                    85,
                    DEFAULT_ADJUSTMENTS,
                    categoryPreviewTone,
                    null,
                    false
                  );
                  const isFav = favoritePresetIds.includes(preset.id);
                  return (
                    <div key={preset.id} className="py-4 flex items-center gap-4">
                      <div className="relative w-16 h-16 shrink-0 overflow-hidden bg-paper-low dark:bg-ink-low">
                        <StillShaderThumb
                          src={selectedCategoryDetail.coverUrl}
                          alt={preset.name}
                          cacheKey={`cat::${selectedCategoryDetail.categoryId}::${preset.id}::${categoryPreviewTone}`}
                          params={thumbParams}
                          size={144}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 font-mono text-[9.5px] tracking-[0.1em]">
                          <span className="text-still-taupe">{preset.code}</span>
                          {preset.isSignature ? (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-still-ink dark:text-still-paper uppercase">
                                SIGNATURE PROCESS
                              </span>
                            </>
                          ) : (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-muted-ink dark:text-muted-paper uppercase">
                                {categoryPreviewTone}
                              </span>
                            </>
                          )}
                        </div>
                        <h3 className="font-serif text-[19px] leading-tight mt-0.5 truncate">
                          {preset.name}
                        </h3>
                        <p className="text-[12px] leading-snug text-muted-ink dark:text-muted-paper mt-0.5">
                          {preset.description}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            handleTryPresetInStudio(
                              preset,
                              {
                                id: `cat-${selectedCategoryDetail.categoryId}`,
                                name: selectedCategoryDetail.name,
                                categoryId: selectedCategoryDetail.categoryId,
                                suggestedTone: categoryPreviewTone,
                                imageUrl: selectedCategoryDetail.coverUrl,
                              },
                              categoryPreviewTone
                            )
                          }
                          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium tracking-[0.06em] text-still-ink dark:text-still-paper hover:text-still-taupe transition-colors cursor-pointer"
                        >
                          <span>Try in Studio</span>
                          <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
                        </button>
                      </div>
                      <button
                        type="button"
                        aria-label={
                          isFav ? 'Remove from favorites' : 'Save to favorites'
                        }
                        onClick={() => {
                          toggleFavoritePreset(preset.id);
                          showToast(
                            isFav
                              ? `Removed ${preset.code}`
                              : `Saved ${preset.code} to Favorites`
                          );
                        }}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper transition-colors cursor-pointer shrink-0"
                      >
                        <Bookmark
                          className={`w-4 h-4 ${
                            isFav ? 'fill-current text-still-taupe' : ''
                          }`}
                          strokeWidth={1.5}
                        />
                      </button>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}

        {/* ================= DISCOVER: HOME ================= */}
        {destination === 'discover' && !selectedCategoryDetail && (
          <div className="flex-1 overflow-y-auto still-scroll px-6 pt-3 pb-10">
            <header className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src="/icon-192.png"
                  alt="STILL. app icon"
                  className="w-9 h-9 shrink-0 object-cover border border-hairline-light dark:border-hairline-dark"
                />
                <div className="min-w-0">
                  <h1 className="font-serif text-[32px] leading-none tracking-[0.07em] font-normal">
                    STILL.
                  </h1>
                  <p className="font-mono text-[9.5px] tracking-[0.12em] text-muted-ink dark:text-muted-paper mt-1">
                    THE EDITORIAL COLOR STUDIO
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[40px] px-3.5 py-2 bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink text-[11px] font-medium tracking-[0.06em] inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={1.8} />
                <span>Add Photo</span>
              </button>
            </header>

            <div className="my-5 border-t border-hairline-light dark:border-hairline-dark" />

            {/* 3 DAILY ROTATING & SWIPEABLE PHOTOS OF THE DAY (HYBRID ONLINE + OFFLINE FALLBACK) */}
            <DailyPotdCarousel
              items={dailyPhotosOfTheDay}
              editionLabel={dailyEditionLabel}
              activeIndex={potdIndex}
              onSelectIndex={setPotdIndex}
              onTryInStudio={(item, resolvedImageUrl) =>
                void applyNewPhotoWithSuggestions(
                  {
                    src: resolvedImageUrl,
                    name: item.title,
                    dimensions: null,
                  },
                  item.categoryId,
                  item.recommendedTone,
                  item.featuredPresetId
                )
              }
            />

            {/* Categories */}
            <section className="mt-9" aria-label="Preset categories">
              <div className="flex items-baseline justify-between pb-3 border-b border-hairline-light dark:border-hairline-dark">
                <h2 className="font-serif text-[22px] leading-tight">
                  Categories
                </h2>
                <span className="font-mono text-[10px] tracking-[0.12em] text-muted-ink dark:text-muted-paper tabular-nums">
                  {PHOTO_CATEGORIES.length} SERIES · {STILL_PRESETS.length} PRESETS
                </span>
              </div>

              <div className="divide-y divide-hairline-light dark:divide-hairline-dark">
                {CATEGORY_SHOWCASES.map((cat) => {
                  const presetCount = String(
                    getPresetsByCategory(cat.categoryId).length
                  ).padStart(2, '0');
                  return (
                  <button
                    key={cat.categoryId}
                    type="button"
                    onClick={() => setSelectedCategoryDetail(cat)}
                    className="w-full py-4 flex items-center gap-4 text-left group cursor-pointer"
                  >
                    <div className="w-16 h-16 shrink-0 overflow-hidden bg-paper-low dark:bg-ink-low">
                      <img
                        src={cat.coverUrl}
                        alt={cat.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 font-mono text-[9.5px] tracking-[0.1em]">
                        <span className="text-still-taupe">{cat.indexCode}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-muted-ink dark:text-muted-paper">
                          {presetCount} PRESETS · BRIGHT / DARK
                        </span>
                      </div>
                      <h3 className="font-serif text-[20px] leading-snug mt-0.5 group-hover:text-still-taupe transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-[12px] text-muted-ink dark:text-muted-paper truncate">
                        {cat.examples}
                      </p>
                    </div>
                    <ArrowRight
                      className="w-4 h-4 text-muted-ink dark:text-muted-paper group-hover:translate-x-0.5 transition-transform shrink-0"
                      strokeWidth={1.5}
                    />
                  </button>
                  );
                })}
              </div>
            </section>

            {/* Recently Used */}
            <section className="mt-8" aria-label="Recently used">
              <div className="flex items-baseline justify-between pb-3 border-b border-hairline-light dark:border-hairline-dark">
                <h2 className="font-serif text-[22px] leading-tight">
                  Recently Used
                </h2>
                <span className="font-mono text-[10px] tracking-[0.12em] text-muted-ink dark:text-muted-paper tabular-nums">
                  {String(recentPresets.length).padStart(2, '0')} ITEMS
                </span>
              </div>

              {recentPresets.length === 0 ? (
                <div className="py-6">
                  <p className="font-mono text-[10px] tracking-[0.12em] text-still-taupe">
                    NO RECENT ACTIVITY
                  </p>
                  <p className="text-[13px] leading-[1.55] text-muted-ink dark:text-muted-paper mt-1.5">
                    Presets applied in Studio appear here for quick access.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-hairline-light dark:divide-hairline-dark">
                  {recentPresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleTryPresetInStudio(preset)}
                      className="w-full py-3.5 flex items-center justify-between gap-4 text-left group cursor-pointer"
                    >
                      <div>
                        <p className="font-mono text-[10px] tracking-[0.1em] text-still-taupe">
                          {preset.code} · {preset.categoryLabel.toUpperCase()}
                          {preset.isSignature ? ' · SIGNATURE' : ''}
                        </p>
                        <p className="font-serif text-[19px] mt-0.5 group-hover:text-still-taupe transition-colors">
                          {preset.name}
                        </p>
                      </div>
                      <ArrowRight
                        className="w-3.5 h-3.5 text-muted-ink dark:text-muted-paper group-hover:translate-x-0.5 transition-transform shrink-0"
                        strokeWidth={1.5}
                      />
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Offline Install Prompt & Editorial Colophon */}
            <footer className="mt-8 pt-6 border-t border-hairline-light dark:border-hairline-dark space-y-4">
              <PWAInstallButton />
              <div className="flex items-center justify-between gap-2 font-mono text-[9.5px] tracking-[0.1em] text-muted-ink dark:text-muted-paper">
                <span>STILL. V1.0 · 100% ON-DEVICE</span>
                <a
                  href="/privacy.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-still-taupe hover:underline"
                >
                  PRIVACY POLICY
                </a>
              </div>
            </footer>
          </div>
        )}

        {/* ================= STUDIO ================= */}
        {destination === 'studio' && (
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Studio Top Action Bar with Undo / Redo / Save / Export */}
            <div className="px-4 py-2 border-b border-hairline-light dark:border-hairline-dark flex items-center justify-between gap-1.5 shrink-0">
              <div className="flex items-baseline gap-2 min-w-0">
                <h1 className="font-serif text-[22px] leading-none">Studio</h1>
                {activePhoto && (
                  <span className="font-mono text-[9.5px] tracking-[0.1em] text-still-taupe truncate">
                    {activeCodeLabel}
                  </span>
                )}
              </div>

              {activePhoto ? (
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    title="Undo"
                    aria-label="Undo"
                    disabled={undoStack.length === 0}
                    onClick={handleUndo}
                    className="min-w-[34px] min-h-[34px] flex items-center justify-center text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper disabled:opacity-30 transition-opacity cursor-pointer disabled:cursor-default"
                  >
                    <Undo2 className="w-[15px] h-[15px]" strokeWidth={1.6} />
                  </button>
                  <button
                    type="button"
                    title="Redo"
                    aria-label="Redo"
                    disabled={redoStack.length === 0}
                    onClick={handleRedo}
                    className="min-w-[34px] min-h-[34px] flex items-center justify-center text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper disabled:opacity-30 transition-opacity cursor-pointer disabled:cursor-default"
                  >
                    <Redo2 className="w-[15px] h-[15px]" strokeWidth={1.6} />
                  </button>
                  <button
                    type="button"
                    title="Editorial Series / Batch Sync"
                    aria-label="Editorial Series Batch Sync"
                    onClick={() => void handleOpenSeriesSheet()}
                    className="relative min-w-[34px] min-h-[34px] flex items-center justify-center text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper transition-colors cursor-pointer"
                  >
                    <Layers className="w-[15px] h-[15px]" strokeWidth={1.6} />
                    {seriesItems.length > 1 && (
                      <span className="absolute top-1 right-0.5 px-1 bg-still-taupe text-still-ink font-mono text-[7.5px] leading-tight">
                        {seriesItems.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    title="Editorial Diptych & Spread Layout"
                    aria-label="Open Editorial Diptych and Spread Layout"
                    onClick={() => setShowCollageStudio(true)}
                    className="min-w-[34px] min-h-[34px] flex items-center justify-center text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper transition-colors cursor-pointer"
                  >
                    <LayoutPanelLeft className="w-[15px] h-[15px]" strokeWidth={1.6} />
                  </button>
                  <button
                    type="button"
                    title="Import another photo or series"
                    aria-label="Import another photo or series"
                    onClick={() => fileInputRef.current?.click()}
                    className="min-w-[34px] min-h-[34px] flex items-center justify-center text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper transition-colors cursor-pointer"
                  >
                    <ImagePlus className="w-[15px] h-[15px]" strokeWidth={1.6} />
                  </button>
                  {hasAnyEdit && (
                    <button
                      type="button"
                      title="Reset edits"
                      aria-label="Reset edits"
                      onClick={handleResetEdits}
                      className="min-w-[34px] min-h-[34px] flex items-center justify-center text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-[14px] h-[14px]" strokeWidth={1.6} />
                    </button>
                  )}
                  <button
                    type="button"
                    title="Save project to Library"
                    aria-label="Save project to Library"
                    onClick={handleSaveProject}
                    className="min-w-[34px] min-h-[34px] flex items-center justify-center text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper transition-colors cursor-pointer"
                  >
                    <Bookmark className="w-[15px] h-[15px]" strokeWidth={1.6} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowExportSheet(true)}
                    className="ml-1 px-3 py-1.5 bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink text-[11px] font-medium tracking-[0.05em] inline-flex items-center gap-1 hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-3 h-3" strokeWidth={1.7} />
                    <span>Export</span>
                  </button>
                </div>
              ) : (
                <span className="font-mono text-[10px] tracking-[0.12em] text-muted-ink dark:text-muted-paper">
                  {STILL_PRESETS.length} PRESETS READY
                </span>
              )}
            </div>

            {!activePhoto ? (
              /* Empty Studio Import Canvas + Sample Plates */
              <div className="flex-1 overflow-y-auto still-scroll px-6 py-5 flex flex-col justify-between gap-6">
                <div className="relative w-full aspect-[4/5] bg-paper-low dark:bg-ink-low border border-hairline-light dark:border-hairline-dark flex items-center justify-center">
                  <span className="pointer-events-none absolute top-3.5 left-3.5 w-3 h-3 border-t border-l border-still-taupe" />
                  <span className="pointer-events-none absolute top-3.5 right-3.5 w-3 h-3 border-t border-r border-still-taupe" />
                  <span className="pointer-events-none absolute bottom-3.5 left-3.5 w-3 h-3 border-b border-l border-still-taupe" />
                  <span className="pointer-events-none absolute bottom-3.5 right-3.5 w-3 h-3 border-b border-r border-still-taupe" />

                  <div className="px-7 text-center">
                    <p className="font-mono text-[10px] tracking-[0.14em] text-still-taupe">
                      OFFLINE SMART DARKROOM
                    </p>
                    <h2 className="font-serif text-[25px] leading-snug mt-2.5">
                      Add a photograph
                    </h2>
                    <p className="text-[13px] leading-[1.55] text-muted-ink dark:text-muted-paper mt-2">
                      STILL. analyzes your photo offline and suggests matching
                      presets in Bright or Dark tone.
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-6 min-h-[44px] px-6 py-2.5 bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink text-xs font-medium tracking-[0.08em] hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      Add Photo
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between mb-2.5">
                    <p className="font-mono text-[10px] tracking-[0.12em] text-muted-ink dark:text-muted-paper">
                      TRY AN EDITORIAL PLATE · {PHOTO_CATEGORIES.length} CATEGORIES
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleLoadSampleSeries()}
                      className="font-mono text-[9.5px] tracking-[0.1em] text-still-taupe hover:underline cursor-pointer"
                    >
                      3-PLATE SERIES →
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {SAMPLE_PLATES.map((plate) => {
                      const catLabel =
                        PHOTO_CATEGORIES.find((c) => c.id === plate.categoryId)
                          ?.shortLabel ?? '';
                      return (
                        <button
                          key={plate.id}
                          type="button"
                          onClick={() =>
                            void applyNewPhotoWithSuggestions(
                              {
                                src: plate.imageUrl,
                                name: plate.name,
                                dimensions: null,
                              },
                              plate.categoryId,
                              plate.suggestedTone
                            )
                          }
                          className="group text-left cursor-pointer"
                        >
                          <div className="aspect-[3/4] overflow-hidden bg-paper-low dark:bg-ink-low border border-hairline-light dark:border-hairline-dark">
                            <img
                              src={plate.imageUrl}
                              alt={plate.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                            />
                          </div>
                          <p className="font-mono text-[9px] tracking-[0.08em] text-still-taupe mt-1 truncate">
                            {catLabel.toUpperCase()}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Active Darkroom Workspace */
              (() => {
                const activeFreeCropMode =
                  studioTab === 'frame' &&
                  frameSubTab === 'matte' &&
                  edit.cropRatio === 'free' &&
                  isFreeCropEditing;
                const viewportCropRatio: CropRatio = activeFreeCropMode
                  ? 'original'
                  : edit.cropRatio;

                return (
              <div className="flex-1 min-h-0 flex flex-col">
                  {/* Live Filtered Photo Viewport (with Matte Frame, Crop Ratio, Freeform Crop & Split-Screen Curtain) */}
                  <div
                    className="flex-1 min-h-0 relative bg-paper-low dark:bg-[#111110] flex items-center justify-center p-3.5 overflow-hidden"
                    onPointerDown={() => {
                      if (!splitCompareMode && !activeFreeCropMode && !isZoom2x) {
                        setIsComparingOriginal(true);
                      }
                    }}
                    onPointerUp={() => {
                      isDraggingSplitRef.current = false;
                      setIsComparingOriginal(false);
                    }}
                    onPointerLeave={() => {
                      isDraggingSplitRef.current = false;
                      setIsComparingOriginal(false);
                    }}
                  >
                    {/* Optional Editorial / EXIF / Analog Frame Wrapper */}
                    <EditorialFrameWrapper
                      frameStyle={edit.frameStyle}
                      frameStamp={edit.frameStamp}
                      stampCaption={stampCaption}
                      presetCode={activeCodeLabel}
                      exif={activePhoto.exif}
                      frameCaption={edit.frameCaption}
                      disabled={activeFreeCropMode}
                    >
                      {/* Cropped Photo Container */}
                      <div
                        ref={splitContainerRef}
                        onDoubleClick={(e) => {
                          if (splitCompareMode || activeFreeCropMode) return;
                          e.stopPropagation();
                          if (isZoom2x) {
                            resetStudioZoom();
                          } else {
                            setZoomScale(2);
                            setZoomPan({ x: 0, y: 0 });
                          }
                        }}
                        onPointerDown={(e) => {
                          if (activeFreeCropMode) return;
                          if (splitCompareMode) {
                            e.stopPropagation();
                            isDraggingSplitRef.current = true;
                            updateSplitFromPointer(e.clientX);
                            return;
                          }

                          activeZoomPointersRef.current.set(e.pointerId, {
                            x: e.clientX,
                            y: e.clientY,
                          });

                          // 2-finger pinch-to-zoom right inside Studio
                          if (activeZoomPointersRef.current.size === 2) {
                            e.stopPropagation();
                            setIsComparingOriginal(false);
                            zoomDragRef.current = null;
                            const pts = Array.from(activeZoomPointersRef.current.values());
                            const dist = Math.hypot(
                              pts[1].x - pts[0].x,
                              pts[1].y - pts[0].y
                            );
                            zoomPinchStartRef.current = {
                              dist: Math.max(10, dist),
                              scale: zoomScale,
                            };
                            setIsPanningZoom(true);
                            return;
                          }

                          // 1-finger / mouse drag-to-pan when zoomed > 1x
                          if (isZoom2x) {
                            e.stopPropagation();
                            setIsComparingOriginal(false);
                            try {
                              e.currentTarget.setPointerCapture(e.pointerId);
                            } catch {
                              // ignore synthetic pointer capture failure
                            }
                            zoomDragRef.current = {
                              pointerId: e.pointerId,
                              startX: e.clientX,
                              startY: e.clientY,
                              originX: zoomPan.x,
                              originY: zoomPan.y,
                            };
                            setIsPanningZoom(true);
                          }
                        }}
                        onPointerMove={(e) => {
                          if (
                            splitCompareMode &&
                            !activeFreeCropMode &&
                            isDraggingSplitRef.current
                          ) {
                            updateSplitFromPointer(e.clientX);
                            return;
                          }

                          if (activeZoomPointersRef.current.has(e.pointerId)) {
                            activeZoomPointersRef.current.set(e.pointerId, {
                              x: e.clientX,
                              y: e.clientY,
                            });
                          }

                          // Pinch zoom update
                          if (
                            activeZoomPointersRef.current.size === 2 &&
                            zoomPinchStartRef.current
                          ) {
                            e.stopPropagation();
                            const pts = Array.from(activeZoomPointersRef.current.values());
                            const dist = Math.hypot(
                              pts[1].x - pts[0].x,
                              pts[1].y - pts[0].y
                            );
                            const nextScale = Math.max(
                              1,
                              Math.min(
                                4,
                                zoomPinchStartRef.current.scale *
                                  (dist / zoomPinchStartRef.current.dist)
                              )
                            );
                            setZoomScale(nextScale);
                            setZoomPan((prev) =>
                              clampStudioPan(prev.x, prev.y, nextScale)
                            );
                            return;
                          }

                          // Single-pointer pan update
                          if (
                            zoomDragRef.current &&
                            zoomDragRef.current.pointerId === e.pointerId &&
                            isZoom2x
                          ) {
                            e.stopPropagation();
                            const dx = e.clientX - zoomDragRef.current.startX;
                            const dy = e.clientY - zoomDragRef.current.startY;
                            setZoomPan(
                              clampStudioPan(
                                zoomDragRef.current.originX + dx,
                                zoomDragRef.current.originY + dy,
                                zoomScale
                              )
                            );
                          }
                        }}
                        onPointerUp={(e) => {
                          activeZoomPointersRef.current.delete(e.pointerId);
                          if (activeZoomPointersRef.current.size < 2) {
                            zoomPinchStartRef.current = null;
                          }
                          if (
                            zoomDragRef.current &&
                            zoomDragRef.current.pointerId === e.pointerId
                          ) {
                            zoomDragRef.current = null;
                          }
                          if (activeZoomPointersRef.current.size === 0) {
                            setIsPanningZoom(false);
                          }
                        }}
                        onPointerCancel={(e) => {
                          activeZoomPointersRef.current.delete(e.pointerId);
                          zoomPinchStartRef.current = null;
                          zoomDragRef.current = null;
                          setIsPanningZoom(false);
                        }}
                        style={getCropAspectStyle(viewportCropRatio)}
                        className={`relative overflow-hidden flex items-center justify-center select-none ${getCropContainerSizeClass(
                          viewportCropRatio
                        )} ${
                          splitCompareMode && !activeFreeCropMode
                            ? 'cursor-ew-resize touch-none'
                            : isZoom2x && !activeFreeCropMode
                              ? isPanningZoom
                                ? 'cursor-grabbing touch-none'
                                : 'cursor-grab touch-none'
                              : !activeFreeCropMode
                                ? 'touch-none'
                                : ''
                        }`}
                      >
                        {/* Live WebGL2 Optical & Film Shader Layer */}
                        <div
                          className={`w-full h-full flex items-center justify-center ${
                            isPanningZoom ? '' : 'transition-transform duration-200'
                          }`}
                          style={
                            isZoom2x && !activeFreeCropMode
                              ? {
                                  transform: `translate3d(${zoomPan.x}px, ${zoomPan.y}px, 0) scale(${zoomScale})`,
                                  transformOrigin: 'center center',
                                }
                              : undefined
                          }
                        >
                          <StillShaderViewport
                            src={activePhoto.src}
                            alt={activePhoto.name}
                            params={computedShaderParams}
                            cropRatio={viewportCropRatio}
                            freeCrop={
                              viewportCropRatio === 'free' ? edit.freeCrop : null
                            }
                            geometry={edit.geometry}
                            upscale2x={edit.upscale2x}
                            showOriginal={
                              !splitCompareMode &&
                              !activeFreeCropMode &&
                              isComparingOriginal
                            }
                            onImageLoaded={handleViewportImageLoaded}
                          />
                        </div>

                        {/* Interactive Freeform Crop Handles */}
                        {activeFreeCropMode && (
                          <FreeCropOverlay
                            rect={edit.freeCrop}
                            onDragStart={beginSliderDrag}
                            onDragEnd={endSliderDrag}
                            onChange={(nextRect) =>
                              setEdit((prev) => ({
                                ...prev,
                                freeCrop: nextRect,
                              }))
                            }
                          />
                        )}

                        {/* Subtle 3x3 Architectural Horizon Alignment Grid (Geometry Mode) */}
                        {studioTab === 'frame' &&
                          frameSubTab === 'geometry' &&
                          (isDraggingStraighten ||
                            !isGeometryNeutral(edit.geometry)) && (
                            <div className="pointer-events-none absolute inset-0">
                              <div className="absolute inset-x-0 top-1/3 h-[1px] bg-[#E9E3D8]/45" />
                              <div className="absolute inset-x-0 top-2/3 h-[1px] bg-[#E9E3D8]/45" />
                              <div className="absolute inset-x-0 top-1/2 h-[1px] bg-[#A58C73]/60" />
                              <div className="absolute inset-y-0 left-1/3 w-[1px] bg-[#E9E3D8]/45" />
                              <div className="absolute inset-y-0 left-2/3 w-[1px] bg-[#E9E3D8]/45" />
                              <div className="absolute inset-y-0 left-1/2 w-[1px] bg-[#A58C73]/40" />
                              {Math.abs(edit.geometry.straighten) >= 0.1 && (
                                <span className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-still-ink/80 text-still-paper font-mono text-[8.5px] tracking-[0.08em] tabular-nums">
                                  {edit.geometry.straighten > 0
                                    ? `+${edit.geometry.straighten.toFixed(1)}°`
                                    : `${edit.geometry.straighten.toFixed(1)}°`}
                                </span>
                              )}
                            </div>
                          )}

                        {/* Split-Screen Original Curtain (Left Half, Geometry, FreeCrop & Pan/Zoom-Synced) */}
                        {splitCompareMode && !activeFreeCropMode && (
                          <>
                            <div
                              className="pointer-events-none absolute inset-0 flex items-center justify-center"
                              style={{
                                clipPath: `inset(0 ${100 - splitPosition}% 0 0)`,
                              }}
                            >
                              <div
                                className={`w-full h-full flex items-center justify-center ${
                                  isPanningZoom ? '' : 'transition-transform duration-200'
                                }`}
                                style={
                                  isZoom2x
                                    ? {
                                        transform: `translate3d(${zoomPan.x}px, ${zoomPan.y}px, 0) scale(${zoomScale})`,
                                        transformOrigin: 'center center',
                                      }
                                    : undefined
                                }
                              >
                                <StillShaderViewport
                                  src={activePhoto.src}
                                  alt="Original comparison"
                                  params={computedShaderParams}
                                  cropRatio={viewportCropRatio}
                                  freeCrop={
                                    viewportCropRatio === 'free'
                                      ? edit.freeCrop
                                      : null
                                  }
                                  geometry={edit.geometry}
                                  upscale2x={false}
                                  showOriginal={true}
                                />
                              </div>
                            </div>

                            {/* Razor-thin Split Divider & Tactile Handle */}
                            <div
                              className="pointer-events-none absolute inset-y-0 w-[1px] bg-[#E9E3D8] shadow-sm"
                              style={{ left: `${splitPosition}%` }}
                            >
                              <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-[#191919]/90 border border-[#E9E3D8]/80 text-[#E9E3D8] flex items-center justify-center font-mono text-[9px]">
                                ↔
                              </div>
                            </div>

                            <span className="pointer-events-none absolute top-2 left-2 px-1.5 py-0.5 bg-still-ink/75 text-still-paper font-mono text-[8.5px] tracking-[0.1em]">
                              BEFORE
                            </span>
                            <span className="pointer-events-none absolute top-2 right-2 px-1.5 py-0.5 bg-still-ink/75 text-still-paper font-mono text-[8.5px] tracking-[0.1em]">
                              AFTER
                            </span>
                          </>
                        )}
                      </div>
                    </EditorialFrameWrapper>

                    {/* Viewport Fullscreen, Compare & 2x Loupe Inspect Controls */}
                    {!activeFreeCropMode && (
                      <div
                        className="absolute bottom-2 right-2.5 flex items-center gap-1.5"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            resetStudioZoom();
                            setSplitCompareMode(false);
                            setIsFullscreenPreview(true);
                          }}
                          title="Fullscreen swipe-filter preview"
                          aria-label="Open fullscreen swipe preview"
                          className="px-2 py-1 inline-flex items-center gap-1 font-mono text-[9px] tracking-[0.1em] bg-still-ink/80 text-still-paper hover:bg-still-ink transition-colors cursor-pointer"
                        >
                          <Maximize2 className="w-3 h-3" strokeWidth={1.6} />
                          <span>FULL</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (isZoom2x) {
                              resetStudioZoom();
                            } else {
                              setZoomScale(2);
                              setZoomPan({ x: 0, y: 0 });
                            }
                          }}
                          title="Toggle zoom & drag to inspect detail"
                          className={`px-2 py-1 inline-flex items-center gap-1 font-mono text-[9px] tracking-[0.1em] tabular-nums transition-colors cursor-pointer ${
                            isZoom2x
                              ? 'bg-still-taupe text-still-ink'
                              : 'bg-still-ink/80 text-still-paper hover:bg-still-ink'
                          }`}
                        >
                          {isZoom2x ? (
                            <ZoomOut className="w-3 h-3" strokeWidth={1.6} />
                          ) : (
                            <ZoomIn className="w-3 h-3" strokeWidth={1.6} />
                          )}
                          <span>
                            {isZoom2x ? `${zoomScale.toFixed(1)}×` : '2×'}
                          </span>
                        </button>

                        {hasAnyEdit && (
                          <>
                            <button
                              type="button"
                              onClick={() => setSplitCompareMode((prev) => !prev)}
                              title="Toggle split-screen before/after"
                              className={`px-2 py-1 inline-flex items-center gap-1 font-mono text-[9px] tracking-[0.1em] transition-colors cursor-pointer ${
                                splitCompareMode
                                  ? 'bg-still-taupe text-still-ink'
                                  : 'bg-still-ink/80 text-still-paper hover:bg-still-ink'
                              }`}
                            >
                              <Columns2 className="w-3 h-3" strokeWidth={1.6} />
                              <span>SPLIT</span>
                            </button>
                            {!splitCompareMode && !isZoom2x && (
                              <div className="px-2 py-1 bg-still-ink/80 text-still-paper font-mono text-[9px] tracking-[0.1em] inline-flex items-center gap-1 pointer-events-none">
                                <Eye className="w-3 h-3" strokeWidth={1.5} />
                                <span>
                                  {isComparingOriginal ? 'ORIGINAL' : 'HOLD'}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                    </div>
                  )}
                </div>

                {/* Smart Context Bar: Scene Category + Histogram Auto-Balance + Bright / Dark Toggle */}
                <div className="px-4 py-2 border-t border-hairline-light dark:border-hairline-dark bg-still-paper dark:bg-still-ink flex items-center justify-between gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowCategoryPicker((prev) => !prev)}
                    className="text-left min-w-0 cursor-pointer group"
                    title="Change photo subject category"
                  >
                    <p className="font-mono text-[8.5px] tracking-[0.1em] text-still-taupe">
                      SCENE · {showCategoryPicker ? 'CLOSE' : 'TAP TO CHANGE'}
                    </p>
                    <p className="text-xs font-medium truncate group-hover:text-still-taupe transition-colors">
                      {detectedCategoryMeta.label}
                      {detectionNote ? (
                        <span className="text-muted-ink dark:text-muted-paper font-normal">
                          {' '}
                          · {detectionNote.split(' ')[0]}
                        </span>
                      ) : null}
                    </p>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      title="Smart Histogram Highlight & Shadow Auto-Balance"
                      onClick={() => {
                        commitEdit((prev) => ({
                          ...prev,
                          autoBalance: !prev.autoBalance,
                        }));
                        showToast(
                          edit.autoBalance
                            ? 'Histogram Auto-Balance OFF'
                            : 'Histogram Auto-Balance ON'
                        );
                      }}
                      className={`px-2 py-1.5 font-mono text-[9px] tracking-[0.08em] border transition-colors cursor-pointer ${
                        edit.autoBalance
                          ? 'border-still-taupe text-still-taupe bg-paper-low/60 dark:bg-ink-low'
                          : 'border-hairline-light dark:border-hairline-dark text-muted-ink dark:text-muted-paper'
                      }`}
                    >
                      AUTO
                    </button>

                    <div
                      role="group"
                      aria-label="Tone preference"
                      className="inline-flex border border-hairline-light dark:border-hairline-dark shrink-0"
                    >
                      <button
                        type="button"
                        onClick={() => handleToneMoodChange('bright')}
                        className={`px-2.5 py-1.5 inline-flex items-center gap-1 text-[10.5px] font-medium transition-colors cursor-pointer ${
                          edit.toneMood === 'bright'
                            ? 'bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink'
                            : 'text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
                        }`}
                      >
                        <Sun className="w-3 h-3" strokeWidth={1.6} />
                        <span>Bright</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToneMoodChange('dark')}
                        className={`px-2.5 py-1.5 inline-flex items-center gap-1 text-[10.5px] font-medium border-l border-hairline-light dark:border-hairline-dark transition-colors cursor-pointer ${
                          edit.toneMood === 'dark'
                            ? 'bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink'
                            : 'text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
                        }`}
                      >
                        <Moon className="w-3 h-3" strokeWidth={1.6} />
                        <span>Dark</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expandable 10-Category Scene Picker */}
                {showCategoryPicker && (
                  <div className="px-4 py-2.5 border-t border-hairline-light dark:border-hairline-dark bg-paper-low dark:bg-ink-low grid grid-cols-2 gap-1.5 shrink-0">
                    {PHOTO_CATEGORIES.map((cat) => {
                      const active = detectedCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleOverrideCategory(cat.id)}
                          className={`px-2.5 py-1.5 text-[11px] font-medium border text-left transition-colors cursor-pointer truncate flex items-center justify-between gap-1 ${
                            active
                              ? 'bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink border-still-ink dark:border-still-paper'
                              : 'border-hairline-light dark:border-hairline-dark text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
                          }`}
                        >
                          <span className="truncate">{cat.label}</span>
                          <span
                            className={`font-mono text-[8.5px] shrink-0 ${
                              active ? 'opacity-75' : 'text-still-taupe'
                            }`}
                          >
                            {cat.indexCode}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Editing Controls Area */}
                <div className="border-t border-hairline-light dark:border-hairline-dark bg-still-paper dark:bg-still-ink shrink-0">
                  {/* TAB 1: PRESETS */}
                  {studioTab === 'presets' && (
                    <div className="pt-2 pb-1.5">
                      {/* Quick Filter Bar */}
                      <div className="flex items-center justify-between gap-2 px-4 pb-1.5 border-b border-hairline-light dark:border-hairline-dark">
                        {(
                          [
                            {
                              id: 'suggested' as PresetBrowseFilter,
                              label: `Suggested (${suggestedPresets.length})`,
                            },
                            {
                              id: 'custom' as PresetBrowseFilter,
                              label: `Saved (${customPresets.length})`,
                            },
                            {
                              id: 'lut' as PresetBrowseFilter,
                              label: `3D LUT (${importedLuts.length})`,
                            },
                            {
                              id: 'all' as PresetBrowseFilter,
                              label: `All (${STILL_PRESETS.length})`,
                            },
                          ]
                        ).map((tab) => {
                          const isActive = presetBrowseFilter === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setPresetBrowseFilter(tab.id)}
                              className={`text-[10.5px] font-medium pb-1 border-b whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                                isActive
                                  ? 'border-still-taupe text-still-ink dark:text-still-paper'
                                  : 'border-transparent text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
                              }`}
                            >
                              {tab.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* All 12 Categories — Always Visible at a Glance */}
                      <div
                        role="tablist"
                        aria-label="All 12 preset categories"
                        className="px-4 py-1.5 grid grid-cols-4 gap-1 border-b border-hairline-light dark:border-hairline-dark bg-paper-low/60 dark:bg-ink-low/60"
                      >
                        {PHOTO_CATEGORIES.map((c) => {
                          const isActive = presetBrowseFilter === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              role="tab"
                              aria-selected={isActive}
                              onClick={() => setPresetBrowseFilter(c.id)}
                              className={`px-1.5 py-1 text-[10px] font-medium border text-center truncate transition-colors cursor-pointer ${
                                isActive
                                  ? 'bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink border-still-ink dark:border-still-paper'
                                  : 'border-hairline-light dark:border-hairline-dark text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper hover:border-still-taupe'
                              }`}
                            >
                              {c.shortLabel}
                            </button>
                          );
                        })}
                      </div>

                      {/* Active Preset / 3D LUT Intensity + Save Custom Recipe Button */}
                      <div className="px-4 h-7 flex items-center justify-between gap-2 my-1.5">
                        {presetBrowseFilter === 'lut' && activeLut ? (
                          <>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-mono text-[10px] tracking-[0.08em] text-still-taupe">
                                .CUBE
                              </span>
                              <span className="text-xs font-medium truncate">
                                {activeLut.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <input
                                type="range"
                                min={0}
                                max={100}
                                value={edit.lutStrength}
                                aria-label="3D LUT strength"
                                onPointerDown={beginSliderDrag}
                                onPointerUp={endSliderDrag}
                                onChange={(e) =>
                                  setEdit((prev) => ({
                                    ...prev,
                                    lutStrength: Number(e.target.value),
                                  }))
                                }
                                className="w-16 accent-[#A58C73] cursor-pointer"
                              />
                              <span className="font-mono text-[10px] tabular-nums w-7 text-right text-muted-ink dark:text-muted-paper">
                                {edit.lutStrength}%
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  commitEdit((prev) => ({
                                    ...prev,
                                    lutId: null,
                                  }))
                                }
                                className="px-2 py-0.5 border border-hairline-light dark:border-hairline-dark font-mono text-[9px] text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper cursor-pointer"
                              >
                                CLEAR
                              </button>
                            </div>
                          </>
                        ) : activePreset || activeCustomPreset ? (
                          <>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-mono text-[10px] tracking-[0.08em] text-still-taupe">
                                {activeCodeLabel}
                              </span>
                              <span className="text-xs font-medium truncate">
                                {activeNameLabel}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <input
                                type="range"
                                min={0}
                                max={100}
                                value={edit.intensity}
                                aria-label="Filter intensity"
                                onPointerDown={beginSliderDrag}
                                onPointerUp={endSliderDrag}
                                onChange={(e) =>
                                  setEdit((prev) => ({
                                    ...prev,
                                    intensity: Number(e.target.value),
                                  }))
                                }
                                className="w-16 accent-[#A58C73] cursor-pointer"
                              />
                              <span className="font-mono text-[10px] tabular-nums w-7 text-right text-muted-ink dark:text-muted-paper">
                                {edit.intensity}%
                              </span>
                              {activePreset && (
                                <button
                                  type="button"
                                  aria-label="Favorite preset"
                                  onClick={() => {
                                    toggleFavoritePreset(activePreset.id);
                                    const exists = favoritePresetIds.includes(
                                      activePreset.id
                                    );
                                    showToast(
                                      exists
                                        ? `Removed ${activePreset.code}`
                                        : `Saved ${activePreset.code}`
                                    );
                                  }}
                                  className="p-1 text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper cursor-pointer"
                                >
                                  <Bookmark
                                    className={`w-3.5 h-3.5 ${
                                      favoritePresetIds.includes(activePreset.id)
                                        ? 'fill-current text-still-taupe'
                                        : ''
                                    }`}
                                    strokeWidth={1.6}
                                  />
                                </button>
                              )}
                              <button
                                type="button"
                                title="Save current look as custom preset"
                                onClick={() => setShowSavePresetSheet(true)}
                                className="px-2 py-0.5 border border-hairline-light dark:border-hairline-dark font-mono text-[9px] tracking-[0.08em] text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper hover:border-still-ink dark:hover:border-still-paper transition-colors cursor-pointer"
                              >
                                + SAVE
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-between w-full font-mono text-[9.5px] tracking-[0.1em] text-muted-ink dark:text-muted-paper">
                            <span>
                              FOR {detectedCategoryMeta.label.toUpperCase()} ·{' '}
                              {edit.toneMood.toUpperCase()}
                            </span>
                            {hasAnyEdit && (
                              <button
                                type="button"
                                onClick={() => setShowSavePresetSheet(true)}
                                className="text-still-taupe hover:underline cursor-pointer"
                              >
                                + SAVE RECIPE
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Filmstrip */}
                      {presetBrowseFilter === 'lut' ? (
                        <div className="flex items-start gap-2.5 overflow-x-auto still-scroll px-4 pb-1.5">
                          <button
                            type="button"
                            onClick={() => lutInputRef.current?.click()}
                            className="shrink-0 w-[62px] text-left cursor-pointer"
                          >
                            <div className="w-[62px] h-[62px] border border-dashed border-still-taupe flex flex-col items-center justify-center gap-1 text-still-taupe hover:bg-paper-low dark:hover:bg-ink-low transition-colors">
                              <Upload className="w-4 h-4" strokeWidth={1.5} />
                              <span className="font-mono text-[8px]">.CUBE</span>
                            </div>
                            <p className="font-mono text-[9px] text-still-taupe mt-1">
                              IMPORT
                            </p>
                            <p className="text-[10px] text-muted-ink dark:text-muted-paper truncate">
                              3D LUT
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={handleExportCubeLut}
                            className="shrink-0 w-[62px] text-left cursor-pointer"
                          >
                            <div className="w-[62px] h-[62px] border border-hairline-light dark:border-hairline-dark flex flex-col items-center justify-center gap-1 text-still-ink dark:text-still-paper hover:border-still-taupe transition-colors">
                              <Download className="w-4 h-4" strokeWidth={1.5} />
                              <span className="font-mono text-[8px]">17³</span>
                            </div>
                            <p className="font-mono text-[9px] text-still-taupe mt-1">
                              EXPORT
                            </p>
                            <p className="text-[10px] text-muted-ink dark:text-muted-paper truncate">
                              .CUBE
                            </p>
                          </button>

                          {importedLuts.length === 0 ? (
                            <div className="flex items-center px-2 h-[62px] text-[11px] leading-snug text-muted-ink dark:text-muted-paper">
                              Import any .CUBE 3D LUT file or export your current
                              STILL. grade.
                            </div>
                          ) : (
                            importedLuts.map((lut) => {
                              const isSelected = edit.lutId === lut.id;
                              const lutParams = computeShaderParams(
                                null,
                                0,
                                DEFAULT_ADJUSTMENTS,
                                edit.toneMood,
                                photoHistogram,
                                edit.autoBalance,
                                lut,
                                85
                              );
                              return (
                                <button
                                  key={lut.id}
                                  type="button"
                                  onClick={() =>
                                    commitEdit((prev) => ({
                                      ...prev,
                                      lutId: isSelected ? null : lut.id,
                                      lutStrength: 85,
                                    }))
                                  }
                                  className="shrink-0 w-[62px] text-left cursor-pointer"
                                >
                                  <div
                                    className={`relative w-[62px] h-[62px] overflow-hidden border ${
                                      isSelected
                                        ? 'border-still-taupe ring-1 ring-still-taupe'
                                        : 'border-hairline-light dark:border-hairline-dark'
                                    }`}
                                  >
                                    <StillShaderThumb
                                      src={activePhoto.src}
                                      alt={lut.name}
                                      cacheKey={`lut::${activePhoto.name}::${lut.id}::${edit.toneMood}`}
                                      params={lutParams}
                                    />
                                  </div>
                                  <p className="font-mono text-[9px] text-still-taupe mt-1 truncate">
                                    {lut.size}³
                                  </p>
                                  <p className="text-[10px] truncate">
                                    {lut.name}
                                  </p>
                                </button>
                              );
                            })
                          )}
                        </div>
                      ) : presetBrowseFilter === 'custom' ? (
                        <div className="flex items-start gap-2.5 overflow-x-auto still-scroll px-4 pb-1.5">
                          <button
                            type="button"
                            onClick={() => setShowSavePresetSheet(true)}
                            className="shrink-0 w-[62px] text-left cursor-pointer"
                          >
                            <div className="w-[62px] h-[62px] border border-dashed border-still-taupe flex flex-col items-center justify-center gap-1 text-still-taupe hover:bg-paper-low dark:hover:bg-ink-low transition-colors">
                              <Save className="w-4 h-4" strokeWidth={1.5} />
                              <span className="font-mono text-[8px]">NEW</span>
                            </div>
                            <p className="font-mono text-[9px] text-still-taupe mt-1">
                              SAVE
                            </p>
                            <p className="text-[10px] text-muted-ink dark:text-muted-paper truncate">
                              Recipe
                            </p>
                          </button>

                          {customPresets.length === 0 ? (
                            <div className="flex items-center px-3 h-[62px] text-xs text-muted-ink dark:text-muted-paper">
                              Save your current adjustments as a reusable custom
                              preset.
                            </div>
                          ) : (
                            customPresets.map((custom) => {
                              const isSelected =
                                edit.customPresetId === custom.id;
                              const base = getPresetById(custom.basePresetId);
                              const thumbParams = computeShaderParams(
                                base,
                                custom.intensity,
                                custom.adjustments,
                                custom.tone,
                                photoHistogram,
                                edit.autoBalance
                              );
                              return (
                                <button
                                  key={custom.id}
                                  type="button"
                                  onClick={() =>
                                    handleSelectCustomPreset(custom)
                                  }
                                  className="shrink-0 w-[62px] text-left cursor-pointer"
                                >
                                  <div
                                    className={`relative w-[62px] h-[62px] overflow-hidden border ${
                                      isSelected
                                        ? 'border-still-taupe ring-1 ring-still-taupe'
                                        : 'border-hairline-light dark:border-hairline-dark'
                                    }`}
                                  >
                                    <StillShaderThumb
                                      src={activePhoto.src}
                                      alt={custom.name}
                                      cacheKey={`custom::${activePhoto.name}::${custom.id}`}
                                      params={thumbParams}
                                    />
                                  </div>
                                  <p className="font-mono text-[9px] text-still-taupe mt-1 truncate">
                                    {custom.code}
                                  </p>
                                  <p className="text-[10px] truncate">
                                    {custom.name}
                                  </p>
                                </button>
                              );
                            })
                          )}
                        </div>
                      ) : (
                        <div className="flex items-start gap-2.5 overflow-x-auto still-scroll px-4 pb-1.5">
                          <button
                            type="button"
                            onClick={() => handleSelectPreset(null)}
                            className="shrink-0 w-[62px] text-left cursor-pointer"
                          >
                            <div
                              className={`w-[62px] h-[62px] overflow-hidden border transition-colors ${
                                edit.presetId === null &&
                                edit.customPresetId === null
                                  ? 'border-still-ink dark:border-still-paper'
                                  : 'border-hairline-light dark:border-hairline-dark'
                              }`}
                            >
                              <img
                                src={activePhoto.src}
                                alt="Original"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <p className="font-mono text-[9px] tracking-[0.08em] mt-1 truncate">
                              RAW
                            </p>
                            <p className="text-[10px] text-muted-ink dark:text-muted-paper truncate">
                              Original
                            </p>
                          </button>

                          {visibleStudioPresets.map((preset) => {
                            const isSelected =
                              edit.presetId === preset.id &&
                              edit.customPresetId === null;
                            const thumbParams = computeShaderParams(
                              preset,
                              85,
                              DEFAULT_ADJUSTMENTS,
                              edit.toneMood,
                              photoHistogram,
                              edit.autoBalance
                            );
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => handleSelectPreset(preset)}
                                className="shrink-0 w-[62px] text-left cursor-pointer"
                              >
                                <div
                                  className={`relative w-[62px] h-[62px] overflow-hidden border transition-colors ${
                                    isSelected
                                      ? 'border-still-taupe ring-1 ring-still-taupe'
                                      : 'border-hairline-light dark:border-hairline-dark'
                                  }`}
                                >
                                  <StillShaderThumb
                                    src={activePhoto.src}
                                    alt={preset.name}
                                    cacheKey={`studio::${activePhoto.name}::${preset.id}::${edit.toneMood}::${edit.autoBalance ? 'a' : 'm'}`}
                                    params={thumbParams}
                                  />
                                  {preset.isSignature && (
                                    <span className="pointer-events-none absolute bottom-1 left-1 px-1 py-[1px] bg-still-ink/85 text-still-paper font-mono text-[7px] tracking-[0.08em]">
                                      SIG
                                    </span>
                                  )}
                                  {isSelected && (
                                    <span className="absolute top-1 right-1 w-4 h-4 bg-still-ink/85 text-still-paper flex items-center justify-center">
                                      <Check
                                        className="w-2.5 h-2.5"
                                        strokeWidth={2}
                                      />
                                    </span>
                                  )}
                                </div>
                                <p
                                  className={`font-mono text-[9px] tracking-[0.08em] mt-1 truncate ${
                                    isSelected
                                      ? 'text-still-taupe font-medium'
                                      : 'text-muted-ink dark:text-muted-paper'
                                  }`}
                                >
                                  {preset.code}
                                </p>
                                <p
                                  className={`text-[10px] truncate ${
                                    isSelected
                                      ? 'text-still-ink dark:text-still-paper font-medium'
                                      : 'text-muted-ink dark:text-muted-paper'
                                  }`}
                                >
                                  {preset.name}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: ADJUST (Color & Light | Curve & Tone | Optical Restore) */}
                  {studioTab === 'adjust' && (
                    <div className="px-4 pt-2 pb-2.5">
                      {/* Sub-Tab Switcher: Color & Light | Curve & Tone | Restore */}
                      <div className="flex items-center justify-between border-b border-hairline-light dark:border-hairline-dark pb-1.5 mb-2">
                        <div className="flex items-center gap-3.5">
                          <button
                            type="button"
                            onClick={() => setAdjustSubTab('color')}
                            className={`text-[11px] font-medium pb-1 border-b transition-colors cursor-pointer ${
                              adjustSubTab === 'color'
                                ? 'border-still-taupe text-still-ink dark:text-still-paper'
                                : 'border-transparent text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
                            }`}
                          >
                            Color &amp; Light
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdjustSubTab('curve')}
                            className={`text-[11px] font-medium pb-1 border-b transition-colors cursor-pointer inline-flex items-center gap-1 ${
                              adjustSubTab === 'curve'
                                ? 'border-still-taupe text-still-ink dark:text-still-paper'
                                : 'border-transparent text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
                            }`}
                          >
                            <span>Curve &amp; Tone</span>
                            {hasCurveOrSplitActive && (
                              <span className="font-mono text-[8.5px] text-still-taupe">
                                •
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdjustSubTab('restore')}
                            className={`text-[11px] font-medium pb-1 border-b transition-colors cursor-pointer inline-flex items-center gap-1 ${
                              adjustSubTab === 'restore'
                                ? 'border-still-taupe text-still-ink dark:text-still-paper'
                                : 'border-transparent text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
                            }`}
                          >
                            <span>Restore</span>
                            {hasRestoreActive && (
                              <span className="font-mono text-[8.5px] text-still-taupe">
                                •
                              </span>
                            )}
                          </button>
                        </div>

                        {adjustSubTab === 'curve' && hasCurveOrSplitActive && (
                          <button
                            type="button"
                            onClick={handleResetCurveAndSplit}
                            className="font-mono text-[9.5px] tracking-[0.08em] text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper cursor-pointer"
                          >
                            RESET
                          </button>
                        )}
                        {adjustSubTab === 'restore' && hasRestoreActive && (
                          <button
                            type="button"
                            onClick={handleResetRestore}
                            className="font-mono text-[9.5px] tracking-[0.08em] text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper cursor-pointer"
                          >
                            RESET
                          </button>
                        )}
                      </div>

                      {adjustSubTab === 'color' ? (
                        <>
                          {photoHistogram && (
                            <div className="mb-2 pb-1.5 border-b border-hairline-light dark:border-hairline-dark">
                              <div className="flex items-center justify-between font-mono text-[8.5px] tracking-[0.1em] text-muted-ink dark:text-muted-paper">
                                <span>
                                  HISTOGRAM ·{' '}
                                  {edit.autoBalance
                                    ? 'AUTO GUARD ON'
                                    : 'MANUAL CURVE'}
                                </span>
                                <span className="tabular-nums text-still-taupe">
                                  DR{' '}
                                  {Math.round(
                                    (photoHistogram.p95 - photoHistogram.p05) *
                                      100
                                  )}
                                  %
                                </span>
                              </div>
                              <EditorialHistogramBar
                                bins={photoHistogram.bins}
                                autoBalance={edit.autoBalance}
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium">
                              {activeControlMeta.label}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-[11px] tabular-nums text-still-taupe">
                                {edit.adjustments[activeAdjustmentKey] > 0
                                  ? `+${edit.adjustments[activeAdjustmentKey]}`
                                  : edit.adjustments[activeAdjustmentKey]}
                              </span>
                              {edit.adjustments[activeAdjustmentKey] !== 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    commitEdit((prev) => ({
                                      ...prev,
                                      customPresetId: null,
                                      adjustments: {
                                        ...prev.adjustments,
                                        [activeAdjustmentKey]: 0,
                                      },
                                    }))
                                  }
                                  className="font-mono text-[10px] text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper cursor-pointer"
                                >
                                  RESET
                                </button>
                              )}
                            </div>
                          </div>

                          <input
                            type="range"
                            min={activeControlMeta.min}
                            max={activeControlMeta.max}
                            value={edit.adjustments[activeAdjustmentKey]}
                            aria-label={activeControlMeta.label}
                            onPointerDown={beginSliderDrag}
                            onPointerUp={endSliderDrag}
                            onChange={(e) =>
                              setEdit((prev) => ({
                                ...prev,
                                customPresetId: null,
                                adjustments: {
                                  ...prev.adjustments,
                                  [activeAdjustmentKey]: Number(e.target.value),
                                },
                              }))
                            }
                            className="w-full accent-[#A58C73] cursor-pointer"
                          />

                          <div className="mt-2.5 flex items-center gap-4 overflow-x-auto still-scroll pb-1">
                            {ADJUSTMENT_CONTROLS.map((ctrl) => {
                              const isSelected =
                                activeAdjustmentKey === ctrl.key;
                              const val = edit.adjustments[ctrl.key];
                              return (
                                <button
                                  key={ctrl.key}
                                  type="button"
                                  onClick={() =>
                                    setActiveAdjustmentKey(ctrl.key)
                                  }
                                  className={`shrink-0 py-1 text-left cursor-pointer border-b transition-colors ${
                                    isSelected
                                      ? 'border-still-taupe text-still-ink dark:text-still-paper'
                                      : 'border-transparent text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
                                  }`}
                                >
                                  <span className="text-[11px] font-medium block whitespace-nowrap">
                                    {ctrl.label}
                                  </span>
                                  <span className="font-mono text-[9px] tabular-nums text-still-taupe block">
                                    {val === 0 ? '0' : val > 0 ? `+${val}` : val}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      ) : adjustSubTab === 'curve' ? (
                        <ToneCurveEditor
                          toneCurve={edit.adjustments.toneCurve}
                          histogramBins={photoHistogram?.bins ?? null}
                          shadowTintHex={edit.adjustments.manualShadowTintHex}
                          shadowTintStrength={
                            edit.adjustments.manualShadowTintStrength
                          }
                          highlightTintHex={
                            edit.adjustments.manualHighlightTintHex
                          }
                          highlightTintStrength={
                            edit.adjustments.manualHighlightTintStrength
                          }
                          onDragStart={beginSliderDrag}
                          onDragEnd={endSliderDrag}
                          onCurveChange={(nextCurve) =>
                            setEdit((prev) => ({
                              ...prev,
                              customPresetId: null,
                              adjustments: {
                                ...prev.adjustments,
                                toneCurve: nextCurve,
                              },
                            }))
                          }
                          onCurvePresetCommit={(nextCurve) =>
                            commitEdit((prev) => ({
                              ...prev,
                              customPresetId: null,
                              adjustments: {
                                ...prev.adjustments,
                                toneCurve: nextCurve,
                              },
                            }))
                          }
                          onShadowTintChange={(hex, strength, commit) => {
                            const apply = (prev: EditSnapshot): EditSnapshot => ({
                              ...prev,
                              customPresetId: null,
                              adjustments: {
                                ...prev.adjustments,
                                manualShadowTintHex: hex,
                                manualShadowTintStrength: strength,
                              },
                            });
                            if (commit) {
                              commitEdit(apply);
                            } else {
                              setEdit(apply);
                            }
                          }}
                          onHighlightTintChange={(hex, strength, commit) => {
                            const apply = (prev: EditSnapshot): EditSnapshot => ({
                              ...prev,
                              customPresetId: null,
                              adjustments: {
                                ...prev.adjustments,
                                manualHighlightTintHex: hex,
                                manualHighlightTintStrength: strength,
                              },
                            });
                            if (commit) {
                              commitEdit(apply);
                            } else {
                              setEdit(apply);
                            }
                          }}
                        />
                      ) : (
                        /* OFFLINE OPTICAL RESTORE ENGINE: DEBLUR + DENOISE + 2X CRISP UPSCALE */
                        <div className="space-y-2.5">
                          {/* Diagnostics Strip + 1-Tap Auto Restore */}
                          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-hairline-light dark:border-hairline-dark">
                            <div className="font-mono text-[8.5px] tracking-[0.09em] text-muted-ink dark:text-muted-paper min-w-0 truncate">
                              <span>
                                FOCUS{' '}
                                <span className="text-still-ink dark:text-still-paper">
                                  {opticalQuality?.sharpnessLabel ?? 'READY'}
                                </span>
                              </span>
                              {opticalQuality && (
                                <>
                                  <span> · </span>
                                  <span className="tabular-nums">
                                    {opticalQuality.naturalWidth}×
                                    {opticalQuality.naturalHeight}
                                    {opticalQuality.isLowRes ? ' LOW-RES' : ''}
                                  </span>
                                </>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={handleAutoRestore}
                              className="shrink-0 px-2 py-0.5 border border-still-taupe text-still-taupe font-mono text-[8.5px] tracking-[0.1em] inline-flex items-center gap-1 hover:bg-still-taupe hover:text-still-ink transition-colors cursor-pointer"
                            >
                              <Focus className="w-2.5 h-2.5" strokeWidth={1.7} />
                              <span>AUTO RESTORE</span>
                            </button>
                          </div>

                          {/* Deblur (Optical Focus Recovery) Slider */}
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[11px] font-medium">
                                Deblur · Focus Recovery
                              </span>
                              <span className="font-mono text-[10px] tabular-nums text-still-taupe">
                                {edit.adjustments.deblur}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={edit.adjustments.deblur}
                              aria-label="Deblur focus recovery"
                              onPointerDown={beginSliderDrag}
                              onPointerUp={endSliderDrag}
                              onChange={(e) =>
                                setEdit((prev) => ({
                                  ...prev,
                                  customPresetId: null,
                                  adjustments: {
                                    ...prev.adjustments,
                                    deblur: Number(e.target.value),
                                  },
                                }))
                              }
                              className="w-full accent-[#A58C73] cursor-pointer"
                            />
                          </div>

                          {/* Denoise + 2x Crisp Super-Upscale Row */}
                          <div className="grid grid-cols-12 gap-3 items-end">
                            <div className="col-span-7">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[11px] font-medium">
                                  Denoise · Clean
                                </span>
                                <span className="font-mono text-[10px] tabular-nums text-still-taupe">
                                  {edit.adjustments.denoise}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                value={edit.adjustments.denoise}
                                aria-label="Edge-preserving denoise"
                                onPointerDown={beginSliderDrag}
                                onPointerUp={endSliderDrag}
                                onChange={(e) =>
                                  setEdit((prev) => ({
                                    ...prev,
                                    customPresetId: null,
                                    adjustments: {
                                      ...prev.adjustments,
                                      denoise: Number(e.target.value),
                                    },
                                  }))
                                }
                                className="w-full accent-[#A58C73] cursor-pointer"
                              />
                            </div>

                            <div className="col-span-5">
                              <p className="font-mono text-[8.5px] tracking-[0.1em] text-muted-ink dark:text-muted-paper mb-1 truncate">
                                {opticalQuality && edit.upscale2x
                                  ? `OUT ${Math.min(3840, opticalQuality.naturalWidth * 2)}×${Math.min(3840, opticalQuality.naturalHeight * 2)}`
                                  : 'HD SUPER-UPSCALE'}
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = !edit.upscale2x;
                                  commitEdit((prev) => ({
                                    ...prev,
                                    upscale2x: next,
                                  }));
                                  showToast(
                                    next
                                      ? '2× Crisp Super-Upscale ON'
                                      : '2× Crisp Super-Upscale OFF'
                                  );
                                }}
                                className={`w-full py-1.5 px-2 font-mono text-[9.5px] tracking-[0.08em] border transition-colors cursor-pointer ${
                                  edit.upscale2x
                                    ? 'bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink border-still-ink dark:border-still-paper'
                                    : 'border-hairline-light dark:border-hairline-dark text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
                                }`}
                              >
                                {edit.upscale2x ? '2× CRISP ON' : '2× UPSCALE'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: CROP RATIO, EDITORIAL MATTE FRAME & GEOMETRY ENGINE */}
                  {studioTab === 'frame' && (
                    <div className="px-4 pt-2 pb-2.5 space-y-2.5">
                      {/* Sub-Tab Switcher: Crop & Matte | Geometry */}
                      <div className="flex items-center justify-between border-b border-hairline-light dark:border-hairline-dark pb-1.5">
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => setFrameSubTab('matte')}
                            className={`text-[11px] font-medium pb-1 border-b transition-colors cursor-pointer ${
                              frameSubTab === 'matte'
                                ? 'border-still-taupe text-still-ink dark:text-still-paper'
                                : 'border-transparent text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
                            }`}
                          >
                            Crop &amp; Matte
                          </button>
                          <button
                            type="button"
                            onClick={() => setFrameSubTab('geometry')}
                            className={`text-[11px] font-medium pb-1 border-b transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                              frameSubTab === 'geometry'
                                ? 'border-still-taupe text-still-ink dark:text-still-paper'
                                : 'border-transparent text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
                            }`}
                          >
                            <span>Geometry</span>
                            {!isGeometryNeutral(edit.geometry) && (
                              <span className="font-mono text-[8.5px] text-still-taupe">
                                •
                              </span>
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          {frameSubTab === 'geometry' &&
                            !isGeometryNeutral(edit.geometry) && (
                              <button
                                type="button"
                                onClick={handleResetGeometry}
                                className="font-mono text-[9.5px] tracking-[0.08em] text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper cursor-pointer"
                              >
                                RESET
                              </button>
                            )}
                          <button
                            type="button"
                            onClick={() => setShowCollageStudio(true)}
                            className="px-2 py-0.5 border border-still-taupe text-still-taupe font-mono text-[8.5px] tracking-[0.1em] inline-flex items-center gap-1 hover:bg-still-taupe hover:text-still-ink transition-colors cursor-pointer"
                          >
                            <LayoutPanelLeft className="w-2.5 h-2.5" strokeWidth={1.7} />
                            <span>DIPTYCH →</span>
                          </button>
                        </div>
                      </div>

                      {frameSubTab === 'matte' ? (
                        <>
                          {/* Aspect Ratio Row (Orig · Free · 4:5 · 3:4 · 1:1 · 9:16 · 16:9) */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="font-mono text-[9px] tracking-[0.12em] text-muted-ink dark:text-muted-paper">
                                ASPECT RATIO
                              </p>
                              {edit.cropRatio === 'free' && (
                                <div className="flex items-center gap-2">
                                  {isFreeCropEditing ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          commitEdit((prev) => ({
                                            ...prev,
                                            freeCrop: { ...DEFAULT_FREE_CROP },
                                          }))
                                        }
                                        className="font-mono text-[9px] tracking-[0.08em] text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper cursor-pointer"
                                      >
                                        RESET
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setIsFreeCropEditing(false);
                                          showToast('Freeform crop applied');
                                        }}
                                        className="px-2 py-0.5 bg-still-taupe text-still-ink font-mono text-[8.5px] tracking-[0.1em] hover:opacity-90 cursor-pointer"
                                      >
                                        APPLY CROP
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSplitCompareMode(false);
                                        setIsFreeCropEditing(true);
                                      }}
                                      className="font-mono text-[9px] tracking-[0.08em] text-still-taupe hover:underline cursor-pointer"
                                    >
                                      ADJUST CROP
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                              {CROP_RATIOS.map((ratio) => {
                                const active = edit.cropRatio === ratio.id;
                                return (
                                  <button
                                    key={ratio.id}
                                    type="button"
                                    onClick={() => {
                                      if (ratio.id === 'free') {
                                        setSplitCompareMode(false);
                                        if (edit.cropRatio === 'free') {
                                          setIsFreeCropEditing((prev) => !prev);
                                        } else {
                                          commitEdit((prev) => ({
                                            ...prev,
                                            cropRatio: 'free',
                                          }));
                                          setIsFreeCropEditing(true);
                                        }
                                        return;
                                      }
                                      setIsFreeCropEditing(false);
                                      commitEdit((prev) => ({
                                        ...prev,
                                        cropRatio: ratio.id,
                                      }));
                                    }}
                                    className={`py-1.5 text-[10px] font-mono border transition-colors cursor-pointer ${
                                      active
                                        ? 'bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink border-still-ink dark:border-still-paper'
                                        : 'border-hairline-light dark:border-hairline-dark text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
                                    }`}
                                  >
                                    {ratio.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Matte & Analog Editorial Frames (2 Rows × 4) */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-mono text-[9px] tracking-[0.12em] text-muted-ink dark:text-muted-paper">
                                EDITORIAL &amp; ANALOG FRAMES
                              </p>
                              {(edit.frameStyle === 'paper' ||
                                edit.frameStyle === 'ink' ||
                                edit.frameStyle === 'white') && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    commitEdit((prev) => ({
                                      ...prev,
                                      frameStamp: !prev.frameStamp,
                                    }))
                                  }
                                  className={`px-2 py-0.5 text-[9px] font-mono tracking-[0.08em] border transition-colors cursor-pointer ${
                                    edit.frameStamp
                                      ? 'bg-still-taupe text-still-ink border-still-taupe'
                                      : 'border-hairline-light dark:border-hairline-dark text-muted-ink dark:text-muted-paper'
                                  }`}
                                >
                                  STAMP {edit.frameStamp ? 'ON' : 'OFF'}
                                </button>
                              )}
                              {activePhoto.exif &&
                                (edit.frameStyle === 'exif-light' ||
                                  edit.frameStyle === 'exif-dark' ||
                                  edit.frameStyle === 'film-35mm') && (
                                  <span className="font-mono text-[8.5px] tracking-[0.08em] text-still-taupe truncate max-w-[165px]">
                                    EXIF · {activePhoto.exif.cameraLabel}
                                  </span>
                                )}
                            </div>

                            <div className="grid grid-cols-4 gap-1">
                              {MATTE_FRAMES.map((frame) => {
                                const active = edit.frameStyle === frame.id;
                                return (
                                  <button
                                    key={frame.id}
                                    type="button"
                                    onClick={() => {
                                      setIsFreeCropEditing(false);
                                      commitEdit((prev) => ({
                                        ...prev,
                                        frameStyle: frame.id,
                                        frameStamp:
                                          frame.id === 'none'
                                            ? false
                                            : prev.frameStamp,
                                      }));
                                    }}
                                    className={`py-1.5 px-1 text-[10px] font-medium border truncate transition-colors cursor-pointer ${
                                      active
                                        ? 'bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink border-still-ink dark:border-still-paper'
                                        : 'border-hairline-light dark:border-hairline-dark text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
                                    }`}
                                  >
                                    {frame.label}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Optional Custom Caption / Camera Override for EXIF, Instant & 35mm Frames */}
                            {(edit.frameStyle === 'exif-light' ||
                              edit.frameStyle === 'exif-dark' ||
                              edit.frameStyle === 'instant' ||
                              edit.frameStyle === 'film-35mm') && (
                              <div className="flex items-center gap-2 pt-0.5">
                                <span className="font-mono text-[8.5px] tracking-[0.1em] text-muted-ink dark:text-muted-paper shrink-0">
                                  {edit.frameStyle === 'instant'
                                    ? 'CAPTION'
                                    : 'LABEL'}
                                </span>
                                <input
                                  type="text"
                                  maxLength={36}
                                  value={edit.frameCaption}
                                  onChange={(e) =>
                                    setEdit((prev) => ({
                                      ...prev,
                                      frameCaption: e.target.value,
                                    }))
                                  }
                                  placeholder={
                                    activePhoto.exif?.cameraLabel ??
                                    (edit.frameStyle === 'instant'
                                      ? 'e.g. Kyoto Rain, Nov 2026'
                                      : 'e.g. LEICA Q3 / STILL. STUDIO')
                                  }
                                  className="flex-1 min-w-0 px-2 py-1 bg-paper-low dark:bg-ink-low border border-hairline-light dark:border-hairline-dark text-[11px] text-still-ink dark:text-still-paper focus:outline-none focus:border-still-taupe"
                                />
                                {edit.frameCaption && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEdit((prev) => ({
                                        ...prev,
                                        frameCaption: '',
                                      }))
                                    }
                                    className="font-mono text-[8.5px] text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper cursor-pointer shrink-0"
                                  >
                                    CLR
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Straighten & Offline Auto-Horizon Row */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono text-[9px] tracking-[0.12em] text-muted-ink dark:text-muted-paper">
                                STRAIGHTEN · AUTO-ZOOM
                              </span>
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono text-[10.5px] tabular-nums text-still-taupe">
                                  {edit.geometry.straighten > 0
                                    ? `+${edit.geometry.straighten.toFixed(1)}°`
                                    : `${edit.geometry.straighten.toFixed(1)}°`}
                                </span>
                                <button
                                  type="button"
                                  onClick={handleAutoLevelHorizon}
                                  className="px-2 py-0.5 border border-still-taupe text-still-taupe font-mono text-[8.5px] tracking-[0.1em] inline-flex items-center gap-1 hover:bg-still-taupe hover:text-still-ink transition-colors cursor-pointer"
                                >
                                  <Compass
                                    className="w-2.5 h-2.5"
                                    strokeWidth={1.7}
                                  />
                                  <span>AUTO LEVEL</span>
                                </button>
                              </div>
                            </div>
                            <input
                              type="range"
                              min={-15}
                              max={15}
                              step={0.5}
                              value={edit.geometry.straighten}
                              aria-label="Straighten horizon angle"
                              onPointerDown={() => {
                                setIsDraggingStraighten(true);
                                beginSliderDrag();
                              }}
                              onPointerUp={() => {
                                setIsDraggingStraighten(false);
                                endSliderDrag();
                              }}
                              onPointerCancel={() => {
                                setIsDraggingStraighten(false);
                                endSliderDrag();
                              }}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setEdit((prev) => ({
                                  ...prev,
                                  geometry: {
                                    ...prev.geometry,
                                    straighten: val,
                                  },
                                }));
                              }}
                              className="w-full accent-[#A58C73] cursor-pointer"
                            />
                          </div>

                          {/* Rotate 90° / Flip H / Flip V Row */}
                          <div className="grid grid-cols-3 gap-1.5">
                            <button
                              type="button"
                              onClick={handleRotate90}
                              className={`py-1.5 px-2 text-[10.5px] font-medium border inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                edit.geometry.rotate90 !== 0
                                  ? 'bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink border-still-ink dark:border-still-paper'
                                  : 'border-hairline-light dark:border-hairline-dark text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
                              }`}
                            >
                              <RotateCw className="w-3.5 h-3.5" strokeWidth={1.6} />
                              <span>
                                {edit.geometry.rotate90 !== 0
                                  ? `${edit.geometry.rotate90}°`
                                  : 'Rotate 90°'}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={handleFlipH}
                              className={`py-1.5 px-2 text-[10.5px] font-medium border inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                edit.geometry.flipH
                                  ? 'bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink border-still-ink dark:border-still-paper'
                                  : 'border-hairline-light dark:border-hairline-dark text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
                              }`}
                            >
                              <FlipHorizontal2
                                className="w-3.5 h-3.5"
                                strokeWidth={1.6}
                              />
                              <span>Flip H</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleFlipV}
                              className={`py-1.5 px-2 text-[10.5px] font-medium border inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                edit.geometry.flipV
                                  ? 'bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink border-still-ink dark:border-still-paper'
                                  : 'border-hairline-light dark:border-hairline-dark text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
                              }`}
                            >
                              <FlipVertical2
                                className="w-3.5 h-3.5"
                                strokeWidth={1.6}
                              />
                              <span>Flip V</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* ---- TAB 3: EFFECTS (NATURAL LIGHT & OPTICAL ANALOG) ---- */}
                  {studioTab === 'effects' && (
                    <StillEffectsStudio
                      effects={mergeStillEffects(edit.adjustments.effects)}
                      exifDateLabel={activePhoto?.exif?.dateTaken ?? null}
                      onDragStart={beginSliderDrag}
                      onDragEnd={endSliderDrag}
                      onLiveChange={(nextEffects: StillEffectsConfig) => {
                        setEdit((prev) => ({
                          ...prev,
                          customPresetId: null,
                          adjustments: {
                            ...prev.adjustments,
                            effects: nextEffects,
                          },
                        }));
                      }}
                      onChange={(nextEffects: StillEffectsConfig) => {
                        commitEdit((prev) => ({
                          ...prev,
                          customPresetId: null,
                          adjustments: {
                            ...prev.adjustments,
                            effects: nextEffects,
                          },
                        }));
                      }}
                      onClearAll={() => {
                        commitEdit((prev) => ({
                          ...prev,
                          adjustments: {
                            ...prev.adjustments,
                            effects: mergeStillEffects(DEFAULT_STILL_EFFECTS),
                          },
                        }));
                        showToast('All effects cleared');
                      }}
                    />
                  )}

                  {/* Studio 4-Mode Switcher (Presets / Adjust / Effects / Frame) */}
                  <div className="grid grid-cols-4 border-t border-hairline-light dark:border-hairline-dark">
                    <button
                      type="button"
                      onClick={() => {
                        setIsFreeCropEditing(false);
                        setStudioTab('presets');
                      }}
                      className={`h-9 flex items-center justify-center gap-1 text-[10.5px] font-medium tracking-[0.04em] whitespace-nowrap transition-colors cursor-pointer ${
                        studioTab === 'presets'
                          ? 'text-still-ink dark:text-still-paper bg-paper-low/70 dark:bg-ink-low'
                          : 'text-muted-ink dark:text-muted-paper'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                      <span>Presets</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsFreeCropEditing(false);
                        setStudioTab('adjust');
                      }}
                      className={`h-9 flex items-center justify-center gap-1 text-[10.5px] font-medium tracking-[0.04em] whitespace-nowrap border-l border-hairline-light dark:border-hairline-dark transition-colors cursor-pointer ${
                        studioTab === 'adjust'
                          ? 'text-still-ink dark:text-still-paper bg-paper-low/70 dark:bg-ink-low'
                          : 'text-muted-ink dark:text-muted-paper'
                      }`}
                    >
                      <SlidersHorizontal
                        className="w-3.5 h-3.5 shrink-0"
                        strokeWidth={1.5}
                      />
                      <span>Adjust</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsFreeCropEditing(false);
                        setStudioTab('effects');
                      }}
                      className={`h-9 flex items-center justify-center gap-1 text-[10.5px] font-medium tracking-[0.04em] whitespace-nowrap border-l border-hairline-light dark:border-hairline-dark transition-colors cursor-pointer ${
                        studioTab === 'effects'
                          ? 'text-still-ink dark:text-still-paper bg-paper-low/70 dark:bg-ink-low'
                          : 'text-muted-ink dark:text-muted-paper'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                      <span>Effects</span>
                      {activeEffectsCount > 0 && (
                        <span className="font-mono text-[9px] tabular-nums text-still-taupe">
                          {activeEffectsCount}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudioTab('frame')}
                      className={`h-9 flex items-center justify-center gap-1 text-[10.5px] font-medium tracking-[0.04em] whitespace-nowrap border-l border-hairline-light dark:border-hairline-dark transition-colors cursor-pointer ${
                        studioTab === 'frame'
                          ? 'text-still-ink dark:text-still-paper bg-paper-low/70 dark:bg-ink-low'
                          : 'text-muted-ink dark:text-muted-paper'
                      }`}
                    >
                      <Crop className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                      <span>Frame</span>
                    </button>
                  </div>
                </div>
              </div>
                );
              })()
            )}
          </div>
        )}

        {/* ================= LIBRARY ================= */}
        {destination === 'library' && (
          <div className="flex-1 overflow-y-auto still-scroll px-6 pt-3 pb-10">
            <div className="flex items-baseline justify-between pb-3.5 border-b border-hairline-light dark:border-hairline-dark">
              <h1 className="font-serif text-[26px] leading-none">Library</h1>
              <span className="font-mono text-[10px] tracking-[0.12em] text-muted-ink dark:text-muted-paper">
                LOCAL ARCHIVE
              </span>
            </div>

            <div
              role="tablist"
              aria-label="Library sections"
              className="flex items-center gap-5 overflow-x-auto still-scroll border-b border-hairline-light dark:border-hairline-dark mt-2"
            >
              {(
                [
                  {
                    id: 'favorites',
                    label: 'Favorites',
                    count: favoritePresets.length,
                  },
                  {
                    id: 'custom',
                    label: 'Custom',
                    count: customPresets.length,
                  },
                  {
                    id: 'projects',
                    label: 'Projects',
                    count: savedProjects.length,
                  },
                  {
                    id: 'recent',
                    label: 'Recent',
                    count: editedPhotos.length,
                  },
                ] as const
              ).map((tab) => {
                const isActive = librarySection === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setLibrarySection(tab.id)}
                    className={`relative min-h-[44px] py-2.5 flex items-baseline gap-1.5 text-[13.5px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'text-still-ink dark:text-still-paper'
                        : 'text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`font-mono text-[10px] tabular-nums ${
                        isActive
                          ? 'text-still-taupe'
                          : 'text-muted-ink dark:text-muted-paper'
                      }`}
                    >
                      {String(tab.count).padStart(2, '0')}
                    </span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 w-6 h-[1.5px] bg-still-ink dark:bg-still-paper" />
                    )}
                  </button>
                );
              })}
            </div>

            {librarySection === 'favorites' && (
              <>
                {favoritePresets.length === 0 ? (
                  <div className="py-10">
                    <p className="font-mono text-[10px] tracking-[0.12em] text-still-taupe">
                      00 FAVORITE PRESETS
                    </p>
                    <h2 className="font-serif text-[21px] mt-2.5">
                      No saved presets yet
                    </h2>
                    <p className="text-[13.5px] leading-[1.6] text-muted-ink dark:text-muted-paper mt-2">
                      Bookmark your favorite looks across all{' '}
                      {PHOTO_CATEGORIES.length} categories to keep them ready
                      offline.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigateTo('discover')}
                      className="mt-5 inline-flex items-center gap-1.5 min-h-[44px] text-xs font-medium tracking-[0.06em] text-still-ink dark:text-still-paper hover:text-still-taupe transition-colors cursor-pointer"
                    >
                      <span>Explore Discover</span>
                      <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-hairline-light dark:divide-hairline-dark mt-2">
                    {favoritePresets.map((preset) => (
                      <div
                        key={preset.id}
                        className="py-4 flex items-center justify-between gap-3"
                      >
                        <button
                          type="button"
                          onClick={() => handleTryPresetInStudio(preset)}
                          className="text-left flex-1 min-w-0 group cursor-pointer"
                        >
                          <p className="font-mono text-[10px] tracking-[0.1em] text-still-taupe">
                            {preset.code} · {preset.categoryLabel.toUpperCase()}
                            {preset.isSignature ? ' · SIGNATURE' : ''}
                          </p>
                          <p className="font-serif text-[20px] mt-0.5 group-hover:text-still-taupe transition-colors">
                            {preset.name}
                          </p>
                          <p className="text-[12px] text-muted-ink dark:text-muted-paper mt-0.5 truncate">
                            {preset.description}
                          </p>
                        </button>
                        <button
                          type="button"
                          aria-label="Remove favorite"
                          onClick={() => toggleFavoritePreset(preset.id)}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-still-taupe hover:opacity-70 cursor-pointer shrink-0"
                        >
                          <Bookmark
                            className="w-4 h-4 fill-current"
                            strokeWidth={1.5}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {librarySection === 'custom' && (
              <>
                {customPresets.length === 0 ? (
                  <div className="py-10">
                    <p className="font-mono text-[10px] tracking-[0.12em] text-still-taupe">
                      00 CUSTOM RECIPES
                    </p>
                    <h2 className="font-serif text-[21px] mt-2.5">
                      No custom presets yet
                    </h2>
                    <p className="text-[13.5px] leading-[1.6] text-muted-ink dark:text-muted-paper mt-2">
                      Dial in your signature filter &amp; slider combination in
                      Studio, then tap + Save to reuse it on any photograph.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigateTo('studio')}
                      className="mt-5 inline-flex items-center gap-1.5 min-h-[44px] text-xs font-medium tracking-[0.06em] text-still-ink dark:text-still-paper hover:text-still-taupe transition-colors cursor-pointer"
                    >
                      <span>Create in Studio</span>
                      <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-hairline-light dark:divide-hairline-dark mt-2">
                    {customPresets.map((custom) => {
                      const base = getPresetById(custom.basePresetId);
                      return (
                        <div
                          key={custom.id}
                          className="py-4 flex items-center justify-between gap-3"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              handleTryCustomPresetInStudio(custom)
                            }
                            className="text-left flex-1 min-w-0 group cursor-pointer"
                          >
                            <p className="font-mono text-[10px] tracking-[0.1em] text-still-taupe">
                              {custom.code} · {custom.tone.toUpperCase()} ·{' '}
                              {custom.createdAt}
                            </p>
                            <p className="font-serif text-[20px] mt-0.5 group-hover:text-still-taupe transition-colors">
                              {custom.name}
                            </p>
                            <p className="text-[12px] text-muted-ink dark:text-muted-paper mt-0.5 truncate">
                              {base
                                ? `Based on ${base.code} ${base.name} (${custom.intensity}%)`
                                : 'Custom manual adjustment curve'}
                            </p>
                          </button>
                          <button
                            type="button"
                            aria-label="Delete custom preset"
                            onClick={() => deleteCustomPreset(custom.id)}
                            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {librarySection === 'projects' && (
              <>
                {savedProjects.length === 0 ? (
                  <div className="py-10">
                    <p className="font-mono text-[10px] tracking-[0.12em] text-still-taupe">
                      00 SAVED PROJECTS
                    </p>
                    <h2 className="font-serif text-[21px] mt-2.5">
                      No editorial projects yet
                    </h2>
                    <p className="text-[13.5px] leading-[1.6] text-muted-ink dark:text-muted-paper mt-2">
                      Tap the bookmark icon in Studio to store non-destructive
                      editing sessions locally on this device.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigateTo('studio')}
                      className="mt-5 inline-flex items-center gap-1.5 min-h-[44px] text-xs font-medium tracking-[0.06em] text-still-ink dark:text-still-paper hover:text-still-taupe transition-colors cursor-pointer"
                    >
                      <span>Open Studio</span>
                      <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-hairline-light dark:divide-hairline-dark mt-2">
                    {savedProjects.map((project) => {
                      const preset = getPresetById(project.presetId);
                      const projParams = computeShaderParams(
                        preset,
                        project.intensity,
                        project.adjustments,
                        project.toneMood
                      );
                      return (
                        <div
                          key={project.id}
                          className="py-4 flex items-center gap-3.5"
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenProject(project)}
                            className="flex items-center gap-3.5 flex-1 min-w-0 text-left group cursor-pointer"
                          >
                            <div className="w-14 h-16 shrink-0 overflow-hidden bg-paper-low dark:bg-ink-low">
                              <StillShaderThumb
                                src={project.photoSrc}
                                alt={project.title}
                                cacheKey={`proj::${project.id}`}
                                params={projParams}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="font-mono text-[10px] tracking-[0.1em] text-still-taupe">
                                {project.presetCode} · {project.savedAt}
                              </p>
                              <p className="font-serif text-[19px] truncate mt-0.5 group-hover:text-still-taupe transition-colors">
                                {project.title}
                              </p>
                              <p className="text-[11px] text-muted-ink dark:text-muted-paper mt-0.5">
                                {project.cropRatio &&
                                project.cropRatio !== 'original'
                                  ? `${project.cropRatio} · `
                                  : ''}
                                Tap to reopen in Studio
                              </p>
                            </div>
                          </button>
                          <button
                            type="button"
                            aria-label="Delete project"
                            onClick={() => deleteProject(project.id)}
                            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {librarySection === 'recent' && (
              <>
                {editedPhotos.length === 0 ? (
                  <div className="py-10">
                    <p className="font-mono text-[10px] tracking-[0.12em] text-still-taupe">
                      00 RECENTLY EDITED
                    </p>
                    <h2 className="font-serif text-[21px] mt-2.5">
                      No edited photographs yet
                    </h2>
                    <p className="text-[13.5px] leading-[1.6] text-muted-ink dark:text-muted-paper mt-2">
                      Photographs exported from Studio appear here with their
                      preset recipe, format, and resolution.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigateTo('studio')}
                      className="mt-5 inline-flex items-center gap-1.5 min-h-[44px] text-xs font-medium tracking-[0.06em] text-still-ink dark:text-still-paper hover:text-still-taupe transition-colors cursor-pointer"
                    >
                      <span>Open Studio</span>
                      <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 mt-5">
                    {editedPhotos.map((item) => (
                      <article key={item.id}>
                        <div className="aspect-[3/4] overflow-hidden bg-paper-low dark:bg-ink-low border border-hairline-light dark:border-hairline-dark">
                          <img
                            src={item.thumbnailDataUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="font-mono text-[9px] tracking-[0.1em] text-still-taupe mt-2">
                          {item.presetCode} · {item.formatLabel ?? 'JPEG'} ·{' '}
                          {item.exportedAt}
                        </p>
                        <p className="font-serif text-[16px] truncate">
                          {item.title}
                        </p>
                        <p className="font-mono text-[9px] text-muted-ink dark:text-muted-paper tabular-nums">
                          {item.resolution}
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* ================= FULLSCREEN SWIPE-FILTER DARKROOM ================= */}
      {isFullscreenPreview && activePhoto && destination === 'studio' && (
        <FullscreenSwipeStudio
          imageSrc={activePhoto.src}
          imageName={activePhoto.name}
          shaderParams={computedShaderParams}
          cropRatio={edit.cropRatio}
          freeCrop={edit.freeCrop}
          geometry={edit.geometry}
          upscale2x={edit.upscale2x}
          frameStyle={edit.frameStyle}
          frameStamp={edit.frameStamp}
          stampCaption={stampCaption}
          presetCode={activeCodeLabel}
          exif={activePhoto.exif}
          frameCaption={edit.frameCaption}
          activePreset={activePreset}
          intensity={edit.intensity}
          toneMood={edit.toneMood}
          isFavorite={
            activePreset ? favoritePresetIds.includes(activePreset.id) : false
          }
          activeCategoryFilter={
            presetBrowseFilter === 'custom' || presetBrowseFilter === 'lut'
              ? 'all'
              : (presetBrowseFilter as FullscreenCategoryOption)
          }
          suggestedCategoryLabel={detectedCategoryMeta.shortLabel}
          presets={visibleStudioPresets}
          isExportSheetOpen={showExportSheet}
          onSelectPreset={(preset) => handleSelectPreset(preset)}
          onSelectCategory={(cat) => {
            setPresetBrowseFilter(cat);
            const nextList =
              cat === 'suggested'
                ? suggestedPresets
                : cat === 'all'
                  ? STILL_PRESETS
                  : getPresetsByCategory(cat);
            if (nextList.length > 0) {
              handleSelectPreset(nextList[0]);
            }
          }}
          onIntensityChange={(nextVal) =>
            setEdit((prev) => ({ ...prev, intensity: nextVal }))
          }
          onIntensityDragStart={beginSliderDrag}
          onIntensityDragEnd={endSliderDrag}
          onToggleToneMood={() =>
            handleToneMoodChange(edit.toneMood === 'bright' ? 'dark' : 'bright')
          }
          onToggleFavorite={(presetId) => toggleFavoritePreset(presetId)}
          onOpenExport={() => setShowExportSheet(true)}
          onClose={() => setIsFullscreenPreview(false)}
        />
      )}

      {/* ================= SAVE CUSTOM PRESET BOTTOM SHEET ================= */}
      {showSavePresetSheet && (
        <div
          className="absolute inset-0 z-40 bg-black/45 flex items-end"
          onClick={() => setShowSavePresetSheet(false)}
        >
          <form
            onSubmit={handleCreateCustomPreset}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-still-paper dark:bg-still-ink border-t border-hairline-light dark:border-hairline-dark p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-mono text-[9.5px] tracking-[0.12em] text-still-taupe">
                  CUSTOM RECIPE · MY-
                  {String(customPresets.length + 1).padStart(2, '0')}
                </p>
                <h2 className="font-serif text-[23px] leading-tight mt-0.5">
                  Save Custom Preset
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowSavePresetSheet(false)}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.6} />
              </button>
            </div>

            <label className="block">
              <span className="font-mono text-[9.5px] tracking-[0.1em] text-muted-ink dark:text-muted-paper">
                PRESET NAME
              </span>
              <input
                type="text"
                autoFocus
                maxLength={28}
                placeholder="e.g. Kyoto Morning"
                value={customPresetName}
                onChange={(e) => setCustomPresetName(e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 bg-paper-low dark:bg-ink-low border border-hairline-light dark:border-hairline-dark text-sm text-still-ink dark:text-still-paper focus:outline-none focus:border-still-taupe"
              />
            </label>

            <p className="font-mono text-[10px] text-muted-ink dark:text-muted-paper mt-3">
              Includes {activePreset ? `${activePreset.code} (${edit.intensity}%)` : 'base curve'},{' '}
              {edit.toneMood.toUpperCase()} mood &amp; all manual adjustments.
            </p>

            <button
              type="submit"
              disabled={!customPresetName.trim()}
              className="mt-5 w-full h-11 bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink text-xs font-medium tracking-[0.08em] hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer"
            >
              Save to Library
            </button>
          </form>
        </div>
      )}

      {/* ================= EXPORT QUALITY BOTTOM SHEET ================= */}
      {showExportSheet && activePhoto && (
        <div
          className="absolute inset-0 z-40 bg-black/45 flex items-end"
          onClick={() => setShowExportSheet(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-still-paper dark:bg-still-ink border-t border-hairline-light dark:border-hairline-dark p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-mono text-[9.5px] tracking-[0.12em] text-still-taupe">
                  DARKROOM OUTPUT
                </p>
                <h2 className="font-serif text-[23px] leading-tight mt-0.5">
                  Export Photograph
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowExportSheet(false)}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.6} />
              </button>
            </div>

            {/* Format */}
            <div>
              <p className="font-mono text-[9.5px] tracking-[0.12em] text-muted-ink dark:text-muted-paper mb-1.5">
                FILE FORMAT
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'jpeg', label: 'JPEG', sub: 'Editorial Share' },
                    { id: 'png', label: 'PNG', sub: 'Lossless Print' },
                  ] as const
                ).map((fmt) => {
                  const active = exportFormat === fmt.id;
                  return (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setExportFormat(fmt.id)}
                      className={`p-2.5 text-left border transition-colors cursor-pointer ${
                        active
                          ? 'bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink border-still-ink dark:border-still-paper'
                          : 'border-hairline-light dark:border-hairline-dark text-still-ink dark:text-still-paper'
                      }`}
                    >
                      <span className="font-mono text-xs block">
                        {fmt.label}
                      </span>
                      <span
                        className={`text-[10.5px] block mt-0.5 ${
                          active
                            ? 'opacity-75'
                            : 'text-muted-ink dark:text-muted-paper'
                        }`}
                      >
                        {fmt.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resolution / Quality Tier */}
            <div className="mt-4">
              <p className="font-mono text-[9.5px] tracking-[0.12em] text-muted-ink dark:text-muted-paper mb-1.5">
                RESOLUTION &amp; QUALITY
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'standard', label: 'Standard', meta: '1440px' },
                    { id: 'high', label: 'High', meta: '2048px' },
                    { id: 'print', label: 'Print Max', meta: 'Full Res' },
                  ] as const
                ).map((q) => {
                  const active = exportQuality === q.id;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setExportQuality(q.id)}
                      className={`py-2 px-2 text-left border transition-colors cursor-pointer ${
                        active
                          ? 'bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink border-still-ink dark:border-still-paper'
                          : 'border-hairline-light dark:border-hairline-dark'
                      }`}
                    >
                      <span className="text-[11px] font-medium block">
                        {q.label}
                      </span>
                      <span
                        className={`font-mono text-[9px] block mt-0.5 ${
                          active
                            ? 'opacity-75'
                            : 'text-muted-ink dark:text-muted-paper'
                        }`}
                      >
                        {q.meta}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Metadata Summary */}
            <div className="mt-4 pt-3 border-t border-hairline-light dark:border-hairline-dark flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[9.5px] text-muted-ink dark:text-muted-paper">
              <span>{activeCodeLabel}</span>
              <span>·</span>
              <span>{edit.toneMood.toUpperCase()}</span>
              {edit.autoBalance && (
                <>
                  <span>·</span>
                  <span>AUTO BAL</span>
                </>
              )}
              <span>·</span>
              <span>RATIO {edit.cropRatio.toUpperCase()}</span>
              {!isGeometryNeutral(edit.geometry) && (
                <>
                  <span>·</span>
                  <span>
                    GEOM
                    {Math.abs(edit.geometry.straighten) >= 0.1
                      ? ` ${edit.geometry.straighten > 0 ? '+' : ''}${edit.geometry.straighten.toFixed(1)}°`
                      : ''}
                    {edit.geometry.rotate90 !== 0
                      ? ` ${edit.geometry.rotate90}°`
                      : ''}
                    {edit.geometry.flipH ? ' H' : ''}
                    {edit.geometry.flipV ? ' V' : ''}
                  </span>
                </>
              )}
              <span>·</span>
              <span>FRAME {edit.frameStyle.toUpperCase()}</span>
              {hasRestoreActive && (
                <>
                  <span>·</span>
                  <span>
                    RESTORE
                    {edit.upscale2x ? ' 2× HD' : ''}
                  </span>
                </>
              )}
              {activeLut && (
                <>
                  <span>·</span>
                  <span>LUT {activeLut.size}³</span>
                </>
              )}
              {edit.frameStamp && edit.frameStyle !== 'none' && (
                <>
                  <span>·</span>
                  <span>STAMP ON</span>
                </>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                disabled={isExporting}
                onClick={handleConfirmExport}
                className="w-full h-11 bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink text-xs font-medium tracking-[0.08em] inline-flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" strokeWidth={1.7} />
                <span>
                  {isExporting
                    ? 'Rendering WebGL Darkroom File...'
                    : `Export ${exportFormat.toUpperCase()}`}
                </span>
              </button>

              <button
                type="button"
                onClick={handleExportCubeLut}
                className="w-full h-10 border border-hairline-light dark:border-hairline-dark text-still-ink dark:text-still-paper font-mono text-[10px] tracking-[0.1em] hover:border-still-taupe hover:text-still-taupe transition-colors cursor-pointer"
              >
                EXPORT 3D LUT (.CUBE 17³)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= EDITORIAL SERIES CONTACT SHEET ================= */}
      {showSeriesSheet && seriesItems.length > 0 && (
        <SeriesContactSheet
          items={seriesItems}
          heroId={seriesHeroId}
          matchExposure={seriesMatchExposure}
          activeCodeLabel={activeCodeLabel}
          toneMood={edit.toneMood}
          isExporting={isExporting}
          exportProgress={seriesExportProgress}
          buildParamsForItem={buildShaderParamsForSeriesItem}
          onToggleMatchExposure={handleToggleSeriesMatchExposure}
          onSelectHero={handleSelectSeriesHero}
          onRemoveItem={handleRemoveSeriesItem}
          onAddMoreFiles={() => seriesInputRef.current?.click()}
          onExportAll={() => void handleExportSeriesAll()}
          onClose={() => setShowSeriesSheet(false)}
        />
      )}

      {/* ================= EDITORIAL DIPTYCH & TRIPTYCH COMPOSER ================= */}
      {showCollageStudio && activePhoto && (
        <EditorialCollageStudio
          activePhoto={activePhoto}
          seriesPhotos={seriesItems}
          shaderParams={computedShaderParams}
          presetCode={activeCodeLabel}
          presetName={activeNameLabel}
          onExportSuccess={(res) => {
            recordEditedPhoto({
              id: `collage-${Date.now()}`,
              title: res.title,
              thumbnailDataUrl: res.thumbnailDataUrl,
              presetCode: res.presetCode,
              resolution: res.resolution,
              formatLabel: 'LAYOUT',
              exportedAt: new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
            });
          }}
          onShowToast={showToast}
          onClose={() => setShowCollageStudio(false)}
        />
      )}

      {/* Android Editorial Bottom Navigation */}
      <nav
        aria-label="STILL primary navigation"
        className="border-t border-hairline-light dark:border-hairline-dark bg-still-paper dark:bg-still-ink px-4 pt-1 pb-2 shrink-0"
      >
        <div className="h-[54px] grid grid-cols-3">
          {(
            [
              { id: 'discover', label: 'Discover', Icon: LayoutGrid },
              { id: 'studio', label: 'Studio', Icon: Frame },
              { id: 'library', label: 'Library', Icon: Bookmark },
            ] as const
          ).map(({ id, label, Icon }) => {
            const isSelected = destination === id;
            return (
              <button
                key={id}
                type="button"
                aria-current={isSelected ? 'page' : undefined}
                onClick={() => navigateTo(id)}
                className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                  isSelected
                    ? 'text-still-ink dark:text-still-paper'
                    : 'text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
                }`}
              >
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
                <span className="text-[11px] font-medium tracking-[0.04em] whitespace-nowrap">
                  {label}
                </span>
                <span
                  className={`w-4 h-[1.5px] transition-opacity ${
                    isSelected ? 'bg-still-taupe opacity-100' : 'opacity-0'
                  }`}
                />
              </button>
            );
          })}
        </div>
        <div className="flex justify-center pt-1 pb-0.5">
          <span className="w-24 h-[3px] bg-still-ink/25 dark:bg-still-paper/25" />
        </div>
      </nav>
    </div>
  );
}
