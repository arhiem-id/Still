import React from 'react';
import { Check, Download, Plus, Trash2, X } from 'lucide-react';
import { SeriesPhotoItem } from '../engine/stillBatchEngine';
import { ShaderGradingParams } from '../engine/stillShaderEngine';
import { StillShaderThumb } from './StillShaderCanvas';

export function SeriesContactSheet({
  items,
  heroId,
  matchExposure,
  activeCodeLabel,
  toneMood,
  isExporting,
  exportProgress,
  buildParamsForItem,
  onToggleMatchExposure,
  onSelectHero,
  onRemoveItem,
  onAddMoreFiles,
  onExportAll,
  onClose,
}: {
  items: SeriesPhotoItem[];
  heroId: string | null;
  matchExposure: boolean;
  activeCodeLabel: string;
  toneMood: string;
  isExporting: boolean;
  exportProgress: string | null;
  buildParamsForItem: (item: SeriesPhotoItem) => ShaderGradingParams;
  onToggleMatchExposure: () => void;
  onSelectHero: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onAddMoreFiles: () => void;
  onExportAll: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-40 bg-black/50 flex items-end"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-h-[86%] bg-still-paper dark:bg-still-ink border-t border-hairline-light dark:border-hairline-dark flex flex-col"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3.5 border-b border-hairline-light dark:border-hairline-dark flex items-center justify-between gap-2 shrink-0">
          <div>
            <p className="font-mono text-[9.5px] tracking-[0.12em] text-still-taupe">
              SERIES CONTACT SHEET · {String(items.length).padStart(2, '0')}{' '}
              PLATES
            </p>
            <h2 className="font-serif text-[23px] leading-tight mt-0.5">
              Batch Sync · {activeCodeLabel}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close contact sheet"
            onClick={onClose}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.6} />
          </button>
        </div>

        {/* Auto-Match Exposure Bar */}
        <div className="px-5 py-2.5 border-b border-hairline-light dark:border-hairline-dark bg-paper-low dark:bg-ink-low flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <p className="text-xs font-medium">Auto-Match Exposure</p>
            <p className="text-[11px] text-muted-ink dark:text-muted-paper truncate">
              Harmonizes luminance across all plates using Hero histogram.
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleMatchExposure}
            className={`px-3 py-1.5 font-mono text-[10px] tracking-[0.1em] border transition-colors cursor-pointer shrink-0 ${
              matchExposure
                ? 'bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink border-still-ink dark:border-still-paper'
                : 'border-hairline-light dark:border-hairline-dark text-muted-ink dark:text-muted-paper'
            }`}
          >
            {matchExposure ? 'SYNC ON' : 'OFF'}
          </button>
        </div>

        {/* Contact Sheet Grid */}
        <div className="flex-1 overflow-y-auto still-scroll px-5 py-4">
          <div className="grid grid-cols-2 gap-3.5">
            {items.map((item, idx) => {
              const isHero = item.id === heroId;
              const params = buildParamsForItem(item);
              const cacheKey = `${item.id}::${activeCodeLabel}::${toneMood}::${matchExposure ? item.matchedExposureDelta : 0}::${params.exposure.toFixed(2)}:${params.contrast.toFixed(2)}:${params.temperature.toFixed(2)}:${params.saturation.toFixed(2)}:${params.bloom.toFixed(2)}:${params.halation.toFixed(2)}:${params.lut?.id ?? ''}:${params.lutStrength.toFixed(2)}`;
              const evShift = ((matchExposure ? item.matchedExposureDelta : 0) / 24).toFixed(1);

              return (
                <div
                  key={item.id}
                  className={`border transition-colors ${
                    isHero
                      ? 'border-still-taupe'
                      : 'border-hairline-light dark:border-hairline-dark'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectHero(item.id)}
                    className="relative w-full aspect-[4/5] overflow-hidden bg-paper-low dark:bg-ink-low block cursor-pointer"
                  >
                    <StillShaderThumb
                      src={item.src}
                      alt={item.name}
                      cacheKey={cacheKey}
                      params={params}
                      size={260}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-still-ink/80 text-still-paper font-mono text-[8.5px] tracking-[0.08em]">
                      0{idx + 1}
                    </span>
                    {isHero && (
                      <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-still-taupe text-still-ink font-mono text-[8px] tracking-[0.08em] inline-flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" strokeWidth={2} />
                        <span>HERO</span>
                      </span>
                    )}
                  </button>
                  <div className="px-2.5 py-2 flex items-center justify-between gap-2 bg-still-paper dark:bg-still-ink">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium truncate">
                        {item.name}
                      </p>
                      <p className="font-mono text-[9px] text-still-taupe tabular-nums">
                        {isHero
                          ? 'REFERENCE'
                          : matchExposure
                            ? `MATCH ${Number(evShift) >= 0 ? `+${evShift}` : evShift} EV`
                            : 'RAW RECIPE'}
                      </p>
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        aria-label="Remove from series"
                        onClick={() => onRemoveItem(item.id)}
                        className="p-1 text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {items.length < 8 && (
              <button
                type="button"
                onClick={onAddMoreFiles}
                className="aspect-[4/5] border border-dashed border-hairline-light dark:border-hairline-dark flex flex-col items-center justify-center gap-1.5 text-muted-ink dark:text-muted-paper hover:border-still-taupe hover:text-still-taupe transition-colors cursor-pointer"
              >
                <Plus className="w-5 h-5" strokeWidth={1.5} />
                <span className="font-mono text-[9.5px] tracking-[0.1em]">
                  ADD PLATES
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-hairline-light dark:border-hairline-dark flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={isExporting}
            onClick={onExportAll}
            className="flex-1 h-11 bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink text-xs font-medium tracking-[0.08em] inline-flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={1.7} />
            <span>
              {isExporting
                ? exportProgress ?? 'Rendering Series...'
                : `Export All ${items.length} Plates`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
