import React, { useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, Download, ImagePlus, X } from 'lucide-react';
import { SAMPLE_PLATES } from '../data/stillCatalog';
import {
  COLLAGE_LAYOUTS,
  COLLAGE_STOCKS,
  CollageLayoutId,
  CollageSlotPhoto,
  CollageStockTheme,
  renderEditorialCollageToDataUrl,
} from '../engine/stillCollageEngine';
import {
  NEUTRAL_SHADER_PARAMS,
  ShaderGradingParams,
} from '../engine/stillShaderEngine';
import { StillShaderThumb } from './StillShaderCanvas';

interface EditorialCollageStudioProps {
  activePhoto: { src: string; name: string };
  seriesPhotos: { id: string; src: string; name: string }[];
  shaderParams: ShaderGradingParams;
  presetCode: string;
  presetName: string;
  onExportSuccess: (result: {
    title: string;
    thumbnailDataUrl: string;
    resolution: string;
    presetCode: string;
  }) => void;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}

const SPROCKET_COUNT_VERTICAL = 12;

export const EditorialCollageStudio: React.FC<EditorialCollageStudioProps> = ({
  activePhoto,
  seriesPhotos,
  shaderParams,
  presetCode,
  presetName,
  onExportSuccess,
  onShowToast,
  onClose,
}) => {
  // Initialize 3 slots smartly: Slot 0 = active photo, Slots 1..2 from series or curated STILL. plates
  const [slots, setSlots] = useState<CollageSlotPhoto[]>(() => {
    const initial: CollageSlotPhoto[] = [
      { id: 'slot-0', src: activePhoto.src, name: activePhoto.name },
    ];
    const extras = seriesPhotos.filter((s) => s.src !== activePhoto.src);
    for (const ex of extras) {
      if (initial.length >= 3) break;
      initial.push({ id: `slot-${initial.length}`, src: ex.src, name: ex.name });
    }
    const sampleFallback = SAMPLE_PLATES.filter(
      (p) => !initial.some((s) => s.src === p.imageUrl)
    );
    let fIdx = 0;
    while (initial.length < 3 && fIdx < sampleFallback.length) {
      const p = sampleFallback[fIdx++];
      initial.push({
        id: `slot-${initial.length}`,
        src: p.imageUrl,
        name: p.name,
      });
    }
    return initial;
  });

  const [layout, setLayout] = useState<CollageLayoutId>('diptych-side');
  const [stock, setStock] = useState<CollageStockTheme>('paper');
  const [applyUniformGrade, setApplyUniformGrade] = useState(true);
  const [titleText, setTitleText] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const replaceSlotIdxRef = useRef<number>(1);
  const slotFileInputRef = useRef<HTMLInputElement | null>(null);

  const activeLayoutMeta = useMemo(
    () => COLLAGE_LAYOUTS.find((l) => l.id === layout) ?? COLLAGE_LAYOUTS[0],
    [layout]
  );

  const activeStockMeta = useMemo(
    () => COLLAGE_STOCKS.find((s) => s.id === stock) ?? COLLAGE_STOCKS[0],
    [stock]
  );

  const todayLabel = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}.${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const previewParams = applyUniformGrade
    ? shaderParams
    : NEUTRAL_SHADER_PARAMS;

  const triggerReplaceSlot = (idx: number) => {
    replaceSlotIdxRef.current = idx;
    slotFileInputRef.current?.click();
  };

  const handleSlotFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const targetIdx = replaceSlotIdxRef.current;
      const cleanName = file.name.replace(/\.[^.]+$/, '');
      setSlots((prev) =>
        prev.map((item, idx) =>
          idx === targetIdx
            ? { id: `slot-${targetIdx}-${Date.now()}`, src: reader.result as string, name: cleanName }
            : item
        )
      );
      onShowToast(`Plate 0${targetIdx + 1} updated`);
    };
    reader.readAsDataURL(file);
  };

  const handleSwapSlots = () => {
    setSlots((prev) => {
      if (prev.length < 2) return prev;
      if (activeLayoutMeta.slotsRequired === 3 && prev.length >= 3) {
        return [prev[1], prev[2], prev[0]];
      }
      return [prev[1], prev[0], ...prev.slice(2)];
    });
  };

  const handleExportCollage = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const res = await renderEditorialCollageToDataUrl({
        layout,
        stock,
        slots,
        shaderParams,
        applyUniformGrade,
        titleText,
        presetCode,
        presetName,
        format: 'jpeg',
      });

      const link = document.createElement('a');
      const slug = (titleText.trim() || layout).replace(/\s+/g, '_').toLowerCase();
      link.download = `still_${slug}_${presetCode.toLowerCase()}.jpg`;
      link.href = res.dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onExportSuccess({
        title: titleText.trim() || `${activeLayoutMeta.label}`,
        thumbnailDataUrl: res.thumbnailDataUrl,
        resolution: `${res.width} × ${res.height}`,
        presetCode,
      });
      onShowToast(`Exported ${activeLayoutMeta.label} (${res.width}×${res.height})`);
    } catch {
      onShowToast('Unable to export layout');
    } finally {
      setIsExporting(false);
    }
  };

  const renderSlotTile = (
    slotIdx: number,
    customParams: ShaderGradingParams,
    badgeLabel?: string,
    clickable = true
  ) => {
    const slot = slots[slotIdx] ?? slots[0];
    return (
      <button
        type="button"
        disabled={!clickable}
        onClick={() => clickable && triggerReplaceSlot(slotIdx)}
        title={clickable ? `Tap to change Plate 0${slotIdx + 1}` : undefined}
        className={`relative w-full h-full overflow-hidden bg-[#1D1D1C] group text-left ${
          clickable ? 'cursor-pointer' : 'cursor-default'
        }`}
        style={{
          border:
            layout === 'triptych-film'
              ? '1px solid rgba(233,227,216,0.16)'
              : `1px solid ${activeStockMeta.borderHex}`,
        }}
      >
        <StillShaderThumb
          src={slot.src}
          alt={slot.name}
          cacheKey={`collage-prev::${layout}::${slot.id}::${applyUniformGrade ? presetCode : 'orig'}::${badgeLabel ?? slotIdx}`}
          params={customParams}
          size={360}
        />
        {clickable && (
          <span className="pointer-events-none absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-[#191919]/75 text-[#E9E3D8] font-mono text-[7px] tracking-[0.1em] opacity-80 group-hover:opacity-100 inline-flex items-center gap-0.5">
            <ImagePlus className="w-2.5 h-2.5" strokeWidth={1.6} />
            <span>0{slotIdx + 1}</span>
          </span>
        )}
        {badgeLabel && (
          <span className="pointer-events-none absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-[#191919]/80 text-[#E9E3D8] font-mono text-[7px] tracking-[0.1em]">
            {badgeLabel}
          </span>
        )}
      </button>
    );
  };

  const isFilmLayout = layout === 'triptych-film';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Editorial Diptych & Layout Composer"
      className="absolute inset-0 z-30 bg-still-paper dark:bg-still-ink text-still-ink dark:text-still-paper flex flex-col overflow-hidden select-none"
    >
      <input
        ref={slotFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleSlotFileChange}
        className="hidden"
        aria-label="Choose photograph for layout slot"
      />

      {/* Top Editorial Bar */}
      <div className="px-4 py-2.5 border-b border-hairline-light dark:border-hairline-dark flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <p className="font-mono text-[8.5px] tracking-[0.14em] text-still-taupe">
            EDITORIAL COMPOSER · {activeLayoutMeta.ratioLabel}
          </p>
          <h2 className="font-serif text-[20px] leading-tight truncate">
            Diptych &amp; Spread
          </h2>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {layout !== 'diptych-before-after' && (
            <button
              type="button"
              onClick={handleSwapSlots}
              title="Swap frame positions"
              className="h-8 px-2 border border-hairline-light dark:border-hairline-dark font-mono text-[9px] tracking-[0.08em] text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper inline-flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeftRight className="w-3 h-3" strokeWidth={1.6} />
              <span>SWAP</span>
            </button>
          )}
          <button
            type="button"
            aria-label="Close layout composer"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border border-hairline-light dark:border-hairline-dark text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.6} />
          </button>
        </div>
      </div>

      {/* Live Scaled Editorial Sheet Preview */}
      <div className="flex-1 min-h-0 bg-paper-low dark:bg-[#10100F] flex items-center justify-center p-4 overflow-hidden">
        <div
          className="relative h-full max-h-[372px] max-w-full shadow-sm flex flex-col transition-colors duration-200"
          style={{
            aspectRatio: activeLayoutMeta.aspectCss,
            backgroundColor: isFilmLayout ? '#111110' : activeStockMeta.bgHex,
            border: isFilmLayout
              ? '1px solid rgba(233,227,216,0.16)'
              : `1px solid ${activeStockMeta.borderHex}`,
          }}
        >
          {/* 1. 35MM ANALOG TRIPTYCH STRIP */}
          {layout === 'triptych-film' && (
            <div className="w-full h-full flex flex-col px-1.5 py-2">
              <div className="flex items-center justify-between font-mono text-[6.5px] tracking-[0.1em] text-[#D89E54] px-5 mb-1">
                <span>▸ STILL {presetCode}</span>
                <span>{todayLabel}</span>
              </div>

              <div className="flex-1 min-h-0 flex items-stretch gap-1.5">
                {/* Left Vertical Sprockets */}
                <div className="w-3.5 flex flex-col justify-between py-1 items-center shrink-0">
                  {Array.from({ length: SPROCKET_COUNT_VERTICAL }).map((_, i) => (
                    <span
                      key={`ls-${i}`}
                      className="w-2.5 h-1.5 bg-[#E9E3D8]/90 rounded-[1px]"
                    />
                  ))}
                </div>

                {/* 3 Stacked Film Frames */}
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <div className="flex-1 min-h-0">
                    {renderSlotTile(0, previewParams)}
                  </div>
                  <div className="flex-1 min-h-0">
                    {renderSlotTile(1, previewParams)}
                  </div>
                  <div className="flex-1 min-h-0">
                    {renderSlotTile(2, previewParams)}
                  </div>
                </div>

                {/* Right Vertical Sprockets */}
                <div className="w-3.5 flex flex-col justify-between py-1 items-center shrink-0">
                  {Array.from({ length: SPROCKET_COUNT_VERTICAL }).map((_, i) => (
                    <span
                      key={`rs-${i}`}
                      className="w-2.5 h-1.5 bg-[#E9E3D8]/90 rounded-[1px]"
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between font-mono text-[6.5px] tracking-[0.08em] text-[#D89E54] px-5 mt-1">
                <span className="truncate max-w-[100px]">
                  {(titleText.trim() || presetName).toUpperCase()}
                </span>
                <span>26A · 35MM</span>
              </div>
            </div>
          )}

          {/* 2. EDITORIAL SIDE-BY-SIDE PAIR (4:5) */}
          {layout === 'diptych-side' && (
            <div className="w-full h-full flex flex-col p-3.5 pb-2.5">
              <div className="flex-1 min-h-0 grid grid-cols-2 gap-1.5">
                {renderSlotTile(0, previewParams)}
                {renderSlotTile(1, previewParams)}
              </div>
              <div
                className="mt-2.5 pt-1.5 flex items-baseline justify-between gap-2"
                style={{ borderTop: `1px solid ${activeStockMeta.borderHex}` }}
              >
                <span
                  className="font-serif text-[12px] leading-none truncate"
                  style={{ color: activeStockMeta.textHex }}
                >
                  {titleText.trim() || 'STILL.'}
                </span>
                <span
                  className="font-mono text-[6.5px] tracking-[0.08em] truncate"
                  style={{ color: activeStockMeta.mutedHex }}
                >
                  {presetCode} · {todayLabel}
                </span>
              </div>
            </div>
          )}

          {/* 3. VERTICAL STORY STACK (9:16) */}
          {layout === 'diptych-stack' && (
            <div className="w-full h-full flex flex-col p-3 pb-2.5">
              <div className="flex items-center justify-between font-mono text-[6px] tracking-[0.1em] mb-1.5">
                <span style={{ color: activeStockMeta.mutedHex }}>
                  STILL. ARCHIVE
                </span>
                <span className="text-[#A58C73]">{todayLabel}</span>
              </div>
              <div className="flex-1 min-h-0 flex flex-col gap-1.5">
                <div className="flex-1 min-h-0">
                  {renderSlotTile(0, previewParams)}
                </div>
                <div className="flex-1 min-h-0">
                  {renderSlotTile(1, previewParams)}
                </div>
              </div>
              <div
                className="mt-2 pt-1.5 flex items-baseline justify-between gap-2"
                style={{ borderTop: `1px solid ${activeStockMeta.borderHex}` }}
              >
                <span
                  className="font-serif text-[11px] leading-none truncate"
                  style={{ color: activeStockMeta.textHex }}
                >
                  {titleText.trim() || 'STILL.'}
                </span>
                <span
                  className="font-mono text-[6px] tracking-[0.08em] truncate"
                  style={{ color: activeStockMeta.mutedHex }}
                >
                  {presetCode}
                </span>
              </div>
            </div>
          )}

          {/* 4. BEFORE / AFTER EDITORIAL PLATE (4:5) */}
          {layout === 'diptych-before-after' && (
            <div className="w-full h-full flex flex-col p-3.5 pb-2.5">
              <div className="flex-1 min-h-0 grid grid-cols-2 gap-1.5">
                {renderSlotTile(0, NEUTRAL_SHADER_PARAMS, 'ORIGINAL', false)}
                {renderSlotTile(0, shaderParams, presetCode, false)}
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-1 font-mono text-[6px] tracking-[0.08em]">
                <span style={{ color: activeStockMeta.mutedHex }}>
                  01 · ORIGINAL
                </span>
                <span className="text-[#A58C73] truncate">
                  02 · {presetCode} {presetName.toUpperCase()}
                </span>
              </div>
              <div
                className="mt-2 pt-1.5 flex items-baseline justify-between gap-2"
                style={{ borderTop: `1px solid ${activeStockMeta.borderHex}` }}
              >
                <span
                  className="font-serif text-[12px] leading-none truncate"
                  style={{ color: activeStockMeta.textHex }}
                >
                  {titleText.trim() || 'STILL.'}
                </span>
                <span
                  className="font-mono text-[6.5px] tracking-[0.08em]"
                  style={{ color: activeStockMeta.mutedHex }}
                >
                  {todayLabel}
                </span>
              </div>
            </div>
          )}

          {/* 5. MAGAZINE ASYMMETRIC SPREAD (4:5) */}
          {layout === 'magazine-spread' && (
            <div className="w-full h-full flex flex-col p-3.5 pb-2.5">
              <div className="flex-1 min-h-0 flex flex-col gap-1.5">
                <div className="basis-[58%] min-h-0">
                  {renderSlotTile(0, previewParams)}
                </div>
                <div className="basis-[42%] min-h-0 grid grid-cols-2 gap-1.5">
                  {renderSlotTile(1, previewParams)}
                  {renderSlotTile(2, previewParams)}
                </div>
              </div>
              <div
                className="mt-2.5 pt-1.5 flex items-baseline justify-between gap-2"
                style={{ borderTop: `1px solid ${activeStockMeta.borderHex}` }}
              >
                <span
                  className="font-serif text-[12px] leading-none truncate"
                  style={{ color: activeStockMeta.textHex }}
                >
                  {titleText.trim() || 'STILL.'}
                </span>
                <span
                  className="font-mono text-[6.5px] tracking-[0.08em] truncate"
                  style={{ color: activeStockMeta.mutedHex }}
                >
                  {presetCode} · {todayLabel}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls Drawer */}
      <div className="border-t border-hairline-light dark:border-hairline-dark bg-still-paper dark:bg-still-ink px-4 pt-3 pb-4 space-y-2.5 shrink-0">
        {/* Layout Picker (5 Hairline Options) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[8.5px] tracking-[0.12em] text-muted-ink dark:text-muted-paper">
              LAYOUT · TAP ANY PLATE TO REPLACE
            </span>
            <span className="font-mono text-[8.5px] text-still-taupe">
              {activeLayoutMeta.width}×{activeLayoutMeta.height}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {COLLAGE_LAYOUTS.map((l) => {
              const active = layout === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLayout(l.id)}
                  className={`py-1.5 px-1 text-center border transition-colors cursor-pointer ${
                    active
                      ? 'bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink border-still-ink dark:border-still-paper'
                      : 'border-hairline-light dark:border-hairline-dark text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
                  }`}
                >
                  <span className="text-[10px] font-medium block leading-tight">
                    {l.shortLabel}
                  </span>
                  <span className="font-mono text-[7.5px] opacity-70 block mt-0.5">
                    {l.ratioLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stock & Uniform Grade Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 flex-1">
            {COLLAGE_STOCKS.map((s) => {
              const active = stock === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={isFilmLayout}
                  onClick={() => setStock(s.id)}
                  className={`flex-1 py-1 text-[10px] font-medium border transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                    active && !isFilmLayout
                      ? 'bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink border-still-ink dark:border-still-paper'
                      : 'border-hairline-light dark:border-hairline-dark text-muted-ink dark:text-muted-paper'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {layout !== 'diptych-before-after' && (
            <button
              type="button"
              onClick={() => setApplyUniformGrade((prev) => !prev)}
              className={`px-2.5 py-1 font-mono text-[8.5px] tracking-[0.08em] border transition-colors cursor-pointer shrink-0 ${
                applyUniformGrade
                  ? 'border-still-taupe text-still-taupe bg-paper-low/60 dark:bg-ink-low'
                  : 'border-hairline-light dark:border-hairline-dark text-muted-ink dark:text-muted-paper'
              }`}
            >
              GRADE {applyUniformGrade ? 'SYNC' : 'OFF'}
            </button>
          )}
        </div>

        {/* Optional Editorial Title + Export Button */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            maxLength={32}
            value={titleText}
            onChange={(e) => setTitleText(e.target.value)}
            placeholder="Optional colophon title (e.g. Kyoto Morning)"
            className="flex-1 min-w-0 px-2.5 py-2 bg-paper-low dark:bg-ink-low border border-hairline-light dark:border-hairline-dark text-[11px] text-still-ink dark:text-still-paper focus:outline-none focus:border-still-taupe"
          />
          <button
            type="button"
            disabled={isExporting}
            onClick={() => void handleExportCollage()}
            className="px-3.5 py-2 bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink text-[11px] font-medium tracking-[0.06em] inline-flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={1.7} />
            <span>{isExporting ? 'Rendering...' : 'Export'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
