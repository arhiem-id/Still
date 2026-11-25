import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PhotoOfTheDay } from '../data/stillCatalog';

interface DailyPotdCarouselProps {
  items: PhotoOfTheDay[];
  editionLabel: string;
  activeIndex: number;
  onSelectIndex: (index: number) => void;
  onTryInStudio: (item: PhotoOfTheDay, resolvedImageUrl: string) => void;
}

export const DailyPotdCarousel: React.FC<DailyPotdCarouselProps> = ({
  items,
  editionLabel,
  activeIndex,
  onSelectIndex,
  onTryInStudio,
}) => {
  const [fallbackIds, setFallbackIds] = useState<Record<string, boolean>>({});
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const gestureRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    lockedAxis: 'none' | 'x' | 'y';
  } | null>(null);

  // Preload today's 3 CORS-enabled photos so horizontal swiping is instantaneous
  useEffect(() => {
    items.forEach((item) => {
      if (fallbackIds[item.id]) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onerror = () => {
        setFallbackIds((prev) =>
          prev[item.id] ? prev : { ...prev, [item.id]: true }
        );
      };
      img.src = item.imageUrl;
    });
  }, [fallbackIds, items]);

  const count = items.length;
  const safeIdx = Math.max(0, Math.min(activeIndex, count - 1));
  const activeItem = items[safeIdx] ?? items[0];

  const stepSlide = (delta: -1 | 1) => {
    if (count <= 1) return;
    const next = (safeIdx + delta + count) % count;
    onSelectIndex(next);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    gestureRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lockedAxis: 'none',
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!g || g.pointerId !== e.pointerId) return;

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;

    if (g.lockedAxis === 'none') {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        if (Math.abs(dx) > Math.abs(dy) * 1.1) {
          g.lockedAxis = 'x';
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // Ignore capture errors on synthetic events
          }
        } else {
          g.lockedAxis = 'y';
          setIsDragging(false);
          setDragX(0);
          return;
        }
      } else {
        return;
      }
    }

    if (g.lockedAxis === 'x') {
      // Soft resistance at outer edges, free glide in the middle
      const atLeftEdge = safeIdx === 0 && dx > 0;
      const atRightEdge = safeIdx === count - 1 && dx < 0;
      const damped = atLeftEdge || atRightEdge ? dx * 0.28 : dx * 0.85;
      setDragX(Math.max(-140, Math.min(140, damped)));
    }
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    gestureRef.current = null;
    setIsDragging(false);

    if (!g || g.pointerId !== e.pointerId) {
      setDragX(0);
      return;
    }

    const dx = e.clientX - g.startX;
    setDragX(0);

    if (g.lockedAxis === 'x' && Math.abs(dx) >= 38) {
      if (dx < 0) {
        stepSlide(1);
      } else {
        stepSlide(-1);
      }
    }
  };

  if (!activeItem) return null;

  const getResolvedSrc = (item: PhotoOfTheDay) =>
    fallbackIds[item.id] ? item.fallbackImageUrl : item.imageUrl;

  return (
    <section aria-label="Photos of the day">
      <div className="flex items-baseline justify-between mb-3">
        <p className="font-mono text-[10px] tracking-[0.14em] text-still-taupe">
          PHOTO OF THE DAY · {editionLabel}
        </p>
        <div className="flex items-center gap-3 font-mono text-[10px] tracking-[0.1em]">
          {items.map((item, idx) => {
            const active = idx === safeIdx;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectIndex(idx)}
                className={`py-1 border-b transition-colors cursor-pointer tabular-nums ${
                  active
                    ? 'border-still-ink dark:border-still-paper text-still-ink dark:text-still-paper font-medium'
                    : 'border-transparent text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
                }`}
              >
                0{idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Swipeable Editorial Hero Viewport */}
      <div
        className="relative overflow-hidden bg-paper-low dark:bg-ink-low touch-pan-y select-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <div
          className={`flex w-full ${
            isDragging ? '' : 'transition-transform duration-300 ease-out'
          }`}
          style={{
            transform: `translate3d(calc(${-safeIdx * 100}% + ${dragX}px), 0, 0)`,
            willChange: 'transform',
          }}
        >
          {items.map((item) => {
            const resolvedSrc = getResolvedSrc(item);
            const isRemote = resolvedSrc.startsWith('http');
            return (
              <div
                key={item.id}
                className="relative w-full shrink-0 aspect-[3/4] overflow-hidden bg-paper-low dark:bg-ink-low"
              >
                <img
                  src={resolvedSrc}
                  alt={item.title}
                  crossOrigin={isRemote ? 'anonymous' : undefined}
                  referrerPolicy="no-referrer"
                  draggable={false}
                  onError={() => {
                    if (!fallbackIds[item.id]) {
                      setFallbackIds((prev) => ({ ...prev, [item.id]: true }));
                    }
                  }}
                  className="w-full h-full object-cover block"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/78 via-black/32 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between gap-3 text-[#E9E3D8]">
                  <div className="min-w-0">
                    <p className="font-mono text-[9.5px] tracking-[0.12em] text-[#E9E3D8]/80 truncate">
                      {item.slotLabel} · {item.locationNote}
                    </p>
                    <h2 className="font-serif text-[25px] leading-tight mt-0.5 truncate">
                      {item.title}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => onTryInStudio(item, resolvedSrc)}
                    className="px-3 py-2 bg-[#E9E3D8] text-[#191919] text-[11px] font-medium tracking-[0.05em] hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Try {item.featuredPresetCode}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Crisp Architectural Edge Arrows (Tap/Desktop Swipe Support) */}
        <button
          type="button"
          aria-label="Previous photo of the day"
          onClick={() => stepSlide(-1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-10 flex items-center justify-center bg-[#191919]/45 hover:bg-[#191919]/75 border border-[#E9E3D8]/18 text-[#E9E3D8]/85 hover:text-[#E9E3D8] transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={1.6} />
        </button>
        <button
          type="button"
          aria-label="Next photo of the day"
          onClick={() => stepSlide(1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-10 flex items-center justify-center bg-[#191919]/45 hover:bg-[#191919]/75 border border-[#E9E3D8]/18 text-[#E9E3D8]/85 hover:text-[#E9E3D8] transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" strokeWidth={1.6} />
        </button>

        {/* Minimalist Top-Right Swipe Indicator */}
        <div className="pointer-events-none absolute top-3 right-3 px-2 py-0.5 bg-[#191919]/65 border border-[#E9E3D8]/20 font-mono text-[8px] tracking-[0.12em] text-[#E9E3D8]/85">
          SWIPE ↔
        </div>
      </div>

      {/* 3-Category Daily Strip */}
      <div className="grid grid-cols-3 gap-2 mt-2.5">
        {items.map((item, idx) => {
          const active = idx === safeIdx;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectIndex(idx)}
              className={`text-left pt-2 border-t transition-colors cursor-pointer ${
                active
                  ? 'border-still-ink dark:border-still-paper'
                  : 'border-hairline-light dark:border-hairline-dark opacity-60 hover:opacity-100'
              }`}
            >
              <p className="font-mono text-[9px] tracking-[0.1em] text-still-taupe truncate">
                {item.categoryLabel.toUpperCase()}
              </p>
              <p className="text-[11px] font-medium truncate mt-0.5">
                {item.title}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
};
