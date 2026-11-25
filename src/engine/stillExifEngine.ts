/**
 * STILL. Offline Binary JPEG EXIF Parser
 * Zero external dependencies — parses APP1 / TIFF IFD0 & ExifIFD directly from
 * raw JPEG bytes in both Little-Endian (II) and Big-Endian (MM) byte orders.
 */

export interface PhotoExifData {
  make?: string;
  model?: string;
  lens?: string;
  focalLength?: string; // e.g. "28mm"
  aperture?: string; // e.g. "f/1.8"
  shutterSpeed?: string; // e.g. "1/250s"
  iso?: string; // e.g. "ISO 100"
  dateTaken?: string; // e.g. "2026.11.25"
  cameraLabel: string; // Cleaned uppercase camera title, e.g. "LEICA Q3"
  specsLine: string; // e.g. "28mm · f/1.8 · 1/250s · ISO 100"
}

export interface ExifFrameDisplay {
  cameraTitle: string;
  specsLine: string;
  dateLabel: string;
  filmEdgeCode: string;
  isDetectedExif: boolean;
}

const MAX_EXIF_SCAN_BYTES = 262144; // 256 KB header slice is ample for JPEG APP1

function readAscii(view: DataView, offset: number, length: number): string {
  if (offset < 0 || length <= 0 || offset + length > view.byteLength) return '';
  let out = '';
  for (let i = 0; i < length; i++) {
    const code = view.getUint8(offset + i);
    if (code === 0) break;
    if (code >= 32 && code <= 126) {
      out += String.fromCharCode(code);
    }
  }
  return out.trim();
}

function readRational(
  view: DataView,
  offset: number,
  littleEndian: boolean
): number | null {
  if (offset < 0 || offset + 8 > view.byteLength) return null;
  const num = view.getUint32(offset, littleEndian);
  const den = view.getUint32(offset + 4, littleEndian);
  if (den === 0) return null;
  return num / den;
}

function formatShutterSpeed(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  if (seconds >= 0.5) {
    const rounded = seconds >= 10 ? Math.round(seconds) : Math.round(seconds * 10) / 10;
    return `${rounded}s`;
  }
  const denom = Math.round(1 / seconds);
  return denom > 0 ? `1/${denom}s` : '';
}

function formatAperture(fNum: number): string {
  if (!Number.isFinite(fNum) || fNum <= 0 || fNum > 64) return '';
  const rounded = Math.round(fNum * 10) / 10;
  return Number.isInteger(rounded) ? `f/${rounded}` : `f/${rounded.toFixed(1)}`;
}

function formatFocalLength(mm: number): string {
  if (!Number.isFinite(mm) || mm <= 0 || mm > 2000) return '';
  const rounded = Math.round(mm);
  return `${rounded}mm`;
}

function formatExifDate(raw: string): string {
  // Standard EXIF format: "YYYY:MM:DD HH:MM:SS"
  const match = raw.match(/(\d{4})[:\-/](\d{2})[:\-/](\d{2})/);
  if (!match) return '';
  return `${match[1]}.${match[2]}.${match[3]}`;
}

function buildCameraLabel(make?: string, model?: string): string {
  const cleanMake = (make ?? '').replace(/\s+/g, ' ').trim();
  const cleanModel = (model ?? '').replace(/\s+/g, ' ').trim();
  if (!cleanMake && !cleanModel) return '';
  if (!cleanModel) return cleanMake.toUpperCase();
  if (!cleanMake) return cleanModel.toUpperCase();

  const lowerMake = cleanMake.toLowerCase();
  const lowerModel = cleanModel.toLowerCase();
  // Avoid "APPLE IPHONE 16 PRO" or "NIKON CORPORATION NIKON Z F"
  const makeFirstWord = lowerMake.split(' ')[0];
  if (
    lowerModel.startsWith(lowerMake) ||
    (makeFirstWord.length >= 3 && lowerModel.includes(makeFirstWord)) ||
    lowerMake.includes('apple')
  ) {
    return cleanModel.toUpperCase();
  }
  // Shorten verbose corporate names
  const shortMake = cleanMake
    .replace(/\b(corporation|corp\.?|co\.?,?\s*ltd\.?|inc\.?|imaging|optical|camera)\b/gi, '')
    .trim();
  return `${shortMake || cleanMake} ${cleanModel}`.replace(/\s+/g, ' ').trim().toUpperCase();
}

function parseIfdEntries(
  view: DataView,
  tiffStart: number,
  ifdOffset: number,
  littleEndian: boolean
): Map<number, { type: number; count: number; valueOffset: number }> {
  const map = new Map<number, { type: number; count: number; valueOffset: number }>();
  const dirStart = tiffStart + ifdOffset;
  if (dirStart < 0 || dirStart + 2 > view.byteLength) return map;

  const entryCount = view.getUint16(dirStart, littleEndian);
  const typeSizes: Record<number, number> = {
    1: 1, // BYTE
    2: 1, // ASCII
    3: 2, // SHORT
    4: 4, // LONG
    5: 8, // RATIONAL
    7: 1, // UNDEFINED
    9: 4, // SLONG
    10: 8, // SRATIONAL
  };

  for (let i = 0; i < entryCount; i++) {
    const entryPos = dirStart + 2 + i * 12;
    if (entryPos + 12 > view.byteLength) break;

    const tag = view.getUint16(entryPos, littleEndian);
    const type = view.getUint16(entryPos + 2, littleEndian);
    const count = view.getUint32(entryPos + 4, littleEndian);
    const byteSize = (typeSizes[type] ?? 1) * count;

    const valueOffset =
      byteSize <= 4
        ? entryPos + 8
        : tiffStart + view.getUint32(entryPos + 8, littleEndian);

    map.set(tag, { type, count, valueOffset });
  }

  return map;
}

export function parseExifFromArrayBuffer(buffer: ArrayBuffer): PhotoExifData | null {
  try {
    const view = new DataView(buffer);
    if (view.byteLength < 12) return null;
    // Check JPEG SOI marker 0xFFD8
    if (view.getUint16(0, false) !== 0xffd8) return null;

    let offset = 2;
    while (offset + 4 <= view.byteLength) {
      const marker = view.getUint16(offset, false);
      offset += 2;

      // Start of Scan or End of Image -> stop scanning headers
      if (marker === 0xffda || marker === 0xffd9) break;
      // Standalone markers without length
      if ((marker & 0xff00) !== 0xff00) break;
      if (marker >= 0xffd0 && marker <= 0xffd7) continue;

      const segmentLen = view.getUint16(offset, false);
      if (segmentLen < 2 || offset + segmentLen > view.byteLength) break;

      // APP1 EXIF marker
      if (marker === 0xffe1) {
        const header = readAscii(view, offset + 2, 4);
        if (header === 'Exif' && view.getUint16(offset + 6, false) === 0x0000) {
          const tiffStart = offset + 8;
          if (tiffStart + 8 > view.byteLength) return null;

          const endianMarker = view.getUint16(tiffStart, false);
          const littleEndian = endianMarker === 0x4949;
          if (!littleEndian && endianMarker !== 0x4d4d) return null;

          // TIFF magic 0x002A
          if (view.getUint16(tiffStart + 2, littleEndian) !== 0x002a) return null;

          const firstIfdOffset = view.getUint32(tiffStart + 4, littleEndian);
          const ifd0 = parseIfdEntries(view, tiffStart, firstIfdOffset, littleEndian);

          const makeEntry = ifd0.get(0x010f);
          const modelEntry = ifd0.get(0x0110);
          const date0Entry = ifd0.get(0x0132);
          const exifPtrEntry = ifd0.get(0x8769);

          const make = makeEntry
            ? readAscii(view, makeEntry.valueOffset, makeEntry.count)
            : undefined;
          const model = modelEntry
            ? readAscii(view, modelEntry.valueOffset, modelEntry.count)
            : undefined;

          let lens: string | undefined;
          let focalLength: string | undefined;
          let aperture: string | undefined;
          let shutterSpeed: string | undefined;
          let iso: string | undefined;
          let dateTaken = date0Entry
            ? formatExifDate(readAscii(view, date0Entry.valueOffset, date0Entry.count))
            : undefined;

          if (exifPtrEntry && exifPtrEntry.valueOffset + 4 <= view.byteLength) {
            const exifIfdOffset = view.getUint32(exifPtrEntry.valueOffset, littleEndian);
            const exifIfd = parseIfdEntries(view, tiffStart, exifIfdOffset, littleEndian);

            const expEntry = exifIfd.get(0x829a);
            if (expEntry) {
              const val = readRational(view, expEntry.valueOffset, littleEndian);
              if (val !== null) {
                const formatted = formatShutterSpeed(val);
                if (formatted) shutterSpeed = formatted;
              }
            }

            const fNumEntry = exifIfd.get(0x829d);
            if (fNumEntry) {
              const val = readRational(view, fNumEntry.valueOffset, littleEndian);
              if (val !== null) {
                const formatted = formatAperture(val);
                if (formatted) aperture = formatted;
              }
            }

            const isoEntry = exifIfd.get(0x8827);
            if (isoEntry && isoEntry.valueOffset + 2 <= view.byteLength) {
              const isoVal =
                isoEntry.type === 4 && isoEntry.valueOffset + 4 <= view.byteLength
                  ? view.getUint32(isoEntry.valueOffset, littleEndian)
                  : view.getUint16(isoEntry.valueOffset, littleEndian);
              if (isoVal > 0 && isoVal <= 409600) {
                iso = `ISO ${isoVal}`;
              }
            }

            const focal35Entry = exifIfd.get(0xa405);
            const focalEntry = exifIfd.get(0x920a);
            if (focal35Entry && focal35Entry.valueOffset + 2 <= view.byteLength) {
              const f35 = view.getUint16(focal35Entry.valueOffset, littleEndian);
              if (f35 > 0 && f35 <= 2000) focalLength = `${f35}mm`;
            }
            if (!focalLength && focalEntry) {
              const val = readRational(view, focalEntry.valueOffset, littleEndian);
              if (val !== null) {
                const formatted = formatFocalLength(val);
                if (formatted) focalLength = formatted;
              }
            }

            const dateOrigEntry = exifIfd.get(0x9003);
            if (dateOrigEntry) {
              const formatted = formatExifDate(
                readAscii(view, dateOrigEntry.valueOffset, dateOrigEntry.count)
              );
              if (formatted) dateTaken = formatted;
            }

            const lensEntry = exifIfd.get(0xa434);
            if (lensEntry) {
              const rawLens = readAscii(view, lensEntry.valueOffset, lensEntry.count);
              if (rawLens) lens = rawLens;
            }
          }

          const cameraLabel = buildCameraLabel(make, model);
          const specsParts = [focalLength, aperture, shutterSpeed, iso].filter(
            (v): v is string => Boolean(v)
          );
          const specsLine = specsParts.join(' · ');

          if (!cameraLabel && specsParts.length === 0 && !dateTaken) {
            return null;
          }

          return {
            make,
            model,
            lens,
            focalLength,
            aperture,
            shutterSpeed,
            iso,
            dateTaken: dateTaken || undefined,
            cameraLabel: cameraLabel || 'CAMERA PLATE',
            specsLine,
          };
        }
      }

      offset += segmentLen;
    }

    return null;
  } catch {
    return null;
  }
}

export async function parseExifFromFile(file: File): Promise<PhotoExifData | null> {
  try {
    const slice = file.slice(0, MAX_EXIF_SCAN_BYTES);
    const buffer = await slice.arrayBuffer();
    return parseExifFromArrayBuffer(buffer);
  } catch {
    return null;
  }
}

export function buildExifFrameDisplay(
  exif: PhotoExifData | null | undefined,
  presetCode: string,
  customCaption?: string
): ExifFrameDisplay {
  const cleanCaption = (customCaption ?? '').trim();
  const today = new Date();
  const fallbackDate = `${today.getFullYear()}.${String(
    today.getMonth() + 1
  ).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

  if (exif) {
    return {
      cameraTitle: cleanCaption || exif.cameraLabel || 'STILL. STUDIO',
      specsLine:
        exif.specsLine ||
        `${presetCode} · ARCHIVAL PRINT`,
      dateLabel: exif.dateTaken || fallbackDate,
      filmEdgeCode: `STILL ${presetCode.replace(/[^A-Z0-9-]/gi, '') || '400'}`,
      isDetectedExif: true,
    };
  }

  return {
    cameraTitle: cleanCaption || 'STILL. STUDIO',
    specsLine: `35MM · ${presetCode} · ARCHIVAL PLATE`,
    dateLabel: fallbackDate,
    filmEdgeCode: `STILL ${presetCode.replace(/[^A-Z0-9-]/gi, '') || '400'}`,
    isDetectedExif: false,
  };
}
