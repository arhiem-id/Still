import React from 'react';
import { MATTE_FRAMES, MatteFrameStyle } from '../engine/stillColorEngine';
import { buildExifFrameDisplay, PhotoExifData } from '../engine/stillExifEngine';

interface EditorialFrameWrapperProps {
  frameStyle: MatteFrameStyle;
  frameStamp: boolean;
  stampCaption: string;
  presetCode: string;
  exif?: PhotoExifData | null;
  frameCaption?: string;
  disabled?: boolean;
  fullscreen?: boolean;
  children: React.ReactNode;
}

const SPROCKET_COUNT = 8;

export const EditorialFrameWrapper: React.FC<EditorialFrameWrapperProps> = ({
  frameStyle,
  frameStamp,
  stampCaption,
  presetCode,
  exif,
  frameCaption,
  disabled = false,
  fullscreen = false,
  children,
}) => {
  if (disabled || frameStyle === 'none') {
    return (
      <div
        className={`relative flex flex-col items-center justify-center ${
          fullscreen ? 'w-full h-full' : 'max-w-full max-h-full'
        }`}
      >
        {children}
      </div>
    );
  }

  const frameMeta =
    MATTE_FRAMES.find((f) => f.id === frameStyle) ?? MATTE_FRAMES[1];
  const display = buildExifFrameDisplay(exif, presetCode, frameCaption);

  // 1. EXIF EXHIBITION FOOTER (Leica / Hasselblad Museum Print)
  if (frameStyle === 'exif-light' || frameStyle === 'exif-dark') {
    const isDark = frameStyle === 'exif-dark';
    return (
      <div
        className="relative max-w-full max-h-full flex flex-col items-center justify-center transition-colors duration-200"
        style={{
          backgroundColor: isDark ? '#151514' : '#F7F5F0',
          padding: fullscreen ? '14px 14px 10px 14px' : '10px 10px 8px 10px',
          border: isDark
            ? '1px solid rgba(233,227,216,0.16)'
            : '1px solid rgba(25,25,25,0.14)',
        }}
      >
        <div
          className="relative flex items-center justify-center"
          style={{
            border: isDark
              ? '1px solid rgba(233,227,216,0.10)'
              : '1px solid rgba(25,25,25,0.08)',
          }}
        >
          {children}
        </div>

        <div
          className="w-full mt-2 pt-1.5 flex items-center justify-between gap-2 min-w-[200px]"
          style={{
            borderTop: isDark
              ? '1px solid rgba(233,227,216,0.14)'
              : '1px solid rgba(25,25,25,0.12)',
          }}
        >
          <div className="min-w-0 text-left">
            <p
              className="text-[9.5px] font-semibold tracking-[0.04em] truncate leading-tight"
              style={{ color: isDark ? '#E9E3D8' : '#191919' }}
            >
              {display.cameraTitle}
            </p>
            <p
              className="font-mono text-[6.5px] tracking-[0.1em] truncate mt-0.5"
              style={{ color: isDark ? '#9E998E' : '#6A675F' }}
            >
              {display.dateLabel} · STILL.
            </p>
          </div>
          <div className="text-right shrink-0">
            <p
              className="font-mono text-[7px] tracking-[0.06em] leading-tight"
              style={{ color: isDark ? '#E9E3D8' : '#191919' }}
            >
              {display.specsLine.toUpperCase()}
            </p>
            <p className="font-mono text-[6.5px] tracking-[0.1em] text-[#A58C73] mt-0.5">
              GRADE · {presetCode.toUpperCase()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. INSTANT SX-70 ARCHIVAL CARD
  if (frameStyle === 'instant') {
    const captionText =
      (frameCaption ?? '').trim() ||
      (display.isDetectedExif ? display.cameraTitle : 'STILL. Instant Plate');
    return (
      <div
        className="relative max-w-full max-h-full flex flex-col items-center justify-center transition-colors duration-200 shadow-sm"
        style={{
          backgroundColor: '#F2EEE5',
          padding: fullscreen ? '14px 14px 20px 14px' : '10px 10px 16px 10px',
          border: '1px solid rgba(25,25,25,0.16)',
        }}
      >
        <div
          className="relative flex items-center justify-center"
          style={{
            backgroundColor: '#E5DFD2',
            padding: '2px',
            border: '1px solid rgba(25,25,25,0.14)',
          }}
        >
          {children}
        </div>

        <div className="w-full pt-2.5 text-center px-1">
          <p className="font-serif italic text-[12px] leading-tight text-[#252320] truncate">
            {captionText}
          </p>
          <p className="font-mono text-[6.5px] tracking-[0.14em] text-[#7A756A] mt-0.5">
            {display.dateLabel} · {presetCode.toUpperCase()}
          </p>
        </div>
      </div>
    );
  }

  // 3. 35MM ANALOG FILM STRIP WITH SPROCKETS & EDGE MARKINGS
  if (frameStyle === 'film-35mm') {
    return (
      <div
        className="relative max-w-full max-h-full flex flex-col items-center justify-center transition-colors duration-200"
        style={{
          backgroundColor: '#111110',
          padding: fullscreen ? '8px 10px' : '6px 8px',
          border: '1px solid rgba(233,227,216,0.16)',
        }}
      >
        {/* Top Sprocket Rail */}
        <div className="w-full flex items-center justify-between gap-2 px-1 mb-1">
          {Array.from({ length: SPROCKET_COUNT }).map((_, i) => (
            <span
              key={`top-${i}`}
              className="block w-[9px] h-[11px] bg-[#E9E3D8]/90 rounded-[1.5px]"
            />
          ))}
        </div>
        <div className="w-full flex items-center justify-between font-mono text-[6.5px] tracking-[0.1em] text-[#D89E54] px-0.5 mb-1">
          <span>▸ {display.filmEdgeCode}</span>
          <span>24A</span>
          <span>{display.dateLabel}</span>
        </div>

        {/* Film Gate Photo */}
        <div className="relative flex items-center justify-center border border-[#E9E3D8]/15">
          {children}
        </div>

        {/* Bottom Markings + Sprocket Rail */}
        <div className="w-full flex items-center justify-between gap-2 font-mono text-[6.5px] tracking-[0.08em] text-[#D89E54] px-0.5 mt-1">
          <span className="truncate max-w-[110px]">{display.cameraTitle}</span>
          <span className="truncate">{display.specsLine.toUpperCase()}</span>
        </div>
        <div className="w-full flex items-center justify-between gap-2 px-1 mt-1">
          {Array.from({ length: SPROCKET_COUNT }).map((_, i) => (
            <span
              key={`bot-${i}`}
              className="block w-[9px] h-[11px] bg-[#E9E3D8]/90 rounded-[1.5px]"
            />
          ))}
        </div>
      </div>
    );
  }

  // 4. CLASSIC GALLERY MATTE (Paper / Ink / Gallery White)
  return (
    <div
      className="relative max-w-full max-h-full flex flex-col items-center justify-center transition-colors duration-200"
      style={{
        backgroundColor: frameMeta.bgHex,
        padding: frameStamp ? '14px 14px 24px 14px' : '14px 14px 18px 14px',
        border: fullscreen
          ? '1px solid rgba(233,227,216,0.16)'
          : '1px solid rgba(128,124,116,0.22)',
      }}
    >
      {children}

      {frameStamp && (
        <p
          className="font-mono text-[8px] tracking-[0.13em] mt-2 text-center truncate max-w-[290px]"
          style={{ color: frameMeta.textHex }}
        >
          {stampCaption}
        </p>
      )}
    </div>
  );
};
