import React, { useRef, useState } from 'react';
import { FreeCropRect } from '../engine/stillGeometryEngine';

type DragHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

const MIN_SIZE = 0.14;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function FreeCropOverlay({
  rect,
  onChange,
  onDragStart,
  onDragEnd,
}: {
  rect: FreeCropRect;
  onChange: (next: FreeCropRect) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeHandle, setActiveHandle] = useState<DragHandle | null>(null);

  const dragStateRef = useRef<{
    handle: DragHandle;
    startX: number;
    startY: number;
    startRect: FreeCropRect;
    widthPx: number;
    heightPx: number;
  } | null>(null);

  const startDrag = (handle: DragHandle) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    if (bounds.width < 10 || bounds.height < 10) return;

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setActiveHandle(handle);
    onDragStart?.();
    dragStateRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startRect: { ...rect },
      widthPx: bounds.width,
      heightPx: bounds.height,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const state = dragStateRef.current;
    if (!state) return;
    e.stopPropagation();

    const dx = (e.clientX - state.startX) / state.widthPx;
    const dy = (e.clientY - state.startY) / state.heightPx;
    const s = state.startRect;

    let left = s.x;
    let top = s.y;
    let right = s.x + s.w;
    let bottom = s.y + s.h;

    switch (state.handle) {
      case 'move': {
        const nextLeft = clamp(s.x + dx, 0, 1 - s.w);
        const nextTop = clamp(s.y + dy, 0, 1 - s.h);
        onChange({
          x: nextLeft,
          y: nextTop,
          w: s.w,
          h: s.h,
        });
        return;
      }
      case 'nw':
        left = clamp(s.x + dx, 0, right - MIN_SIZE);
        top = clamp(s.y + dy, 0, bottom - MIN_SIZE);
        break;
      case 'ne':
        right = clamp(right + dx, left + MIN_SIZE, 1);
        top = clamp(s.y + dy, 0, bottom - MIN_SIZE);
        break;
      case 'sw':
        left = clamp(s.x + dx, 0, right - MIN_SIZE);
        bottom = clamp(bottom + dy, top + MIN_SIZE, 1);
        break;
      case 'se':
        right = clamp(right + dx, left + MIN_SIZE, 1);
        bottom = clamp(bottom + dy, top + MIN_SIZE, 1);
        break;
      case 'n':
        top = clamp(s.y + dy, 0, bottom - MIN_SIZE);
        break;
      case 's':
        bottom = clamp(bottom + dy, top + MIN_SIZE, 1);
        break;
      case 'w':
        left = clamp(s.x + dx, 0, right - MIN_SIZE);
        break;
      case 'e':
        right = clamp(right + dx, left + MIN_SIZE, 1);
        break;
    }

    onChange({
      x: left,
      y: top,
      w: Math.max(MIN_SIZE, right - left),
      h: Math.max(MIN_SIZE, bottom - top),
    });
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragStateRef.current) return;
    e.stopPropagation();
    dragStateRef.current = null;
    setActiveHandle(null);
    onDragEnd?.();
  };

  const leftPct = `${(rect.x * 100).toFixed(2)}%`;
  const topPct = `${(rect.y * 100).toFixed(2)}%`;
  const widthPct = `${(rect.w * 100).toFixed(2)}%`;
  const heightPct = `${(rect.h * 100).toFixed(2)}%`;
  const rightRemPct = `${(Math.max(0, 1 - rect.x - rect.w) * 100).toFixed(2)}%`;
  const bottomRemPct = `${(Math.max(0, 1 - rect.y - rect.h) * 100).toFixed(2)}%`;

  const bracketColor = activeHandle ? 'border-[#A58C73]' : 'border-[#E9E3D8]';

  return (
    <div
      ref={containerRef}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute inset-0 z-20 touch-none select-none"
    >
      {/* 4 Dark Editorial Scrims outside the active crop rectangle */}
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 bg-black/58"
        style={{ height: topPct }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 bg-black/58"
        style={{ height: bottomRemPct }}
      />
      <div
        className="pointer-events-none absolute left-0 bg-black/58"
        style={{ top: topPct, height: heightPct, width: leftPct }}
      />
      <div
        className="pointer-events-none absolute right-0 bg-black/58"
        style={{ top: topPct, height: heightPct, width: rightRemPct }}
      />

      {/* Active Crop Frame */}
      <div
        onPointerDown={startDrag('move')}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          left: leftPct,
          top: topPct,
          width: widthPct,
          height: heightPct,
        }}
        className="absolute border border-[#E9E3D8]/90 cursor-move"
      >
        {/* Rule-of-Thirds Hairline Grid */}
        <div className="pointer-events-none absolute inset-x-0 top-1/3 h-[1px] bg-[#E9E3D8]/35" />
        <div className="pointer-events-none absolute inset-x-0 top-2/3 h-[1px] bg-[#E9E3D8]/35" />
        <div className="pointer-events-none absolute inset-y-0 left-1/3 w-[1px] bg-[#E9E3D8]/35" />
        <div className="pointer-events-none absolute inset-y-0 left-2/3 w-[1px] bg-[#E9E3D8]/35" />

        {/* Live Percentage Readout */}
        <span className="pointer-events-none absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-[#191919]/80 text-[#E9E3D8] font-mono text-[8px] tracking-[0.08em] tabular-nums">
          {Math.round(rect.w * 100)}% × {Math.round(rect.h * 100)}%
        </span>

        {/* Edge Handles (N, S, W, E) */}
        <div
          onPointerDown={startDrag('n')}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="absolute -top-2.5 left-4 right-4 h-5 flex items-center justify-center cursor-ns-resize"
        >
          <span className="w-6 h-[2.5px] bg-[#E9E3D8]" />
        </div>
        <div
          onPointerDown={startDrag('s')}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="absolute -bottom-2.5 left-4 right-4 h-5 flex items-center justify-center cursor-ns-resize"
        >
          <span className="w-6 h-[2.5px] bg-[#E9E3D8]" />
        </div>
        <div
          onPointerDown={startDrag('w')}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="absolute -left-2.5 top-4 bottom-4 w-5 flex items-center justify-center cursor-ew-resize"
        >
          <span className="h-6 w-[2.5px] bg-[#E9E3D8]" />
        </div>
        <div
          onPointerDown={startDrag('e')}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="absolute -right-2.5 top-4 bottom-4 w-5 flex items-center justify-center cursor-ew-resize"
        >
          <span className="h-6 w-[2.5px] bg-[#E9E3D8]" />
        </div>

        {/* 4 Corner Architectural L-Brackets (NW, NE, SW, SE) */}
        <div
          onPointerDown={startDrag('nw')}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="absolute -top-2.5 -left-2.5 w-6 h-6 cursor-nwse-resize flex items-start justify-start p-2"
        >
          <span
            className={`block w-3.5 h-3.5 border-t-[2.5px] border-l-[2.5px] ${bracketColor}`}
          />
        </div>
        <div
          onPointerDown={startDrag('ne')}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="absolute -top-2.5 -right-2.5 w-6 h-6 cursor-nesw-resize flex items-start justify-end p-2"
        >
          <span
            className={`block w-3.5 h-3.5 border-t-[2.5px] border-r-[2.5px] ${bracketColor}`}
          />
        </div>
        <div
          onPointerDown={startDrag('sw')}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="absolute -bottom-2.5 -left-2.5 w-6 h-6 cursor-nesw-resize flex items-end justify-start p-2"
        >
          <span
            className={`block w-3.5 h-3.5 border-b-[2.5px] border-l-[2.5px] ${bracketColor}`}
          />
        </div>
        <div
          onPointerDown={startDrag('se')}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="absolute -bottom-2.5 -right-2.5 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-2"
        >
          <span
            className={`block w-3.5 h-3.5 border-b-[2.5px] border-r-[2.5px] ${bracketColor}`}
          />
        </div>
      </div>
    </div>
  );
}
