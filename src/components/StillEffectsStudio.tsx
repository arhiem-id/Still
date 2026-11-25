import React, { useState } from 'react';
import {
  Aperture,
  Calendar,
  CloudFog,
  CloudRain,
  Film,
  Flame,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Sun,
  Sunrise,
  TreePine,
  Zap,
} from 'lucide-react';
import {
  AnamorphicTone,
  AtmosphereParticleMode,
  countActiveStillEffects,
  DateStampPosition,
  DateStampStyle,
  DEFAULT_STILL_EFFECTS,
  FilmDustStyle,
  format90sDateStamp,
  LensBlurStyle,
  LightGlintAngle,
  LightLeakStyle,
  MistStyle,
  MistTone,
  ShadowPlayDirection,
  ShadowPlayPattern,
  StillEffectsConfig,
  SunHaloPosition,
  SunRaysDirection,
  SunRaysTone,
} from '../engine/stillEffectsEngine';

type EffectsGroup = 'natural' | 'optical';

type EffectToolId =
  // Natural Atmosphere & Light Play (6)
  | 'sunRays'
  | 'shadowPlay'
  | 'mist'
  | 'sunHalo'
  | 'atmosphereParticles'
  | 'lightGlint'
  // Optical & Analog (5)
  | 'lightLeak'
  | 'filmDust'
  | 'dateStamp'
  | 'anamorphic'
  | 'lensBlur';

interface EffectToolDef {
  id: EffectToolId;
  group: EffectsGroup;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const EFFECT_TOOLS: EffectToolDef[] = [
  // Natural Light & Atmosphere
  { id: 'sunRays', group: 'natural', label: 'Sun Rays', shortLabel: 'Sun Rays', icon: Sun },
  { id: 'shadowPlay', group: 'natural', label: 'Shadow Play', shortLabel: 'Shadows', icon: TreePine },
  { id: 'mist', group: 'natural', label: 'Atmospheric Mist', shortLabel: 'Mist', icon: CloudFog },
  { id: 'sunHalo', group: 'natural', label: 'Backlight Halo', shortLabel: 'Sun Halo', icon: Sunrise },
  {
    id: 'atmosphereParticles',
    group: 'natural',
    label: 'Motes & Rain',
    shortLabel: 'Motes/Rain',
    icon: CloudRain,
  },
  { id: 'lightGlint', group: 'natural', label: 'Star Glint', shortLabel: 'Glint', icon: Sparkles },

  // Optical & Analog
  { id: 'lightLeak', group: 'optical', label: '35mm Light Leak', shortLabel: 'Light Leak', icon: Flame },
  { id: 'filmDust', group: 'optical', label: 'Film Dust', shortLabel: 'Film Dust', icon: Film },
  { id: 'dateStamp', group: 'optical', label: '90s Date Stamp', shortLabel: 'Date LED', icon: Calendar },
  { id: 'anamorphic', group: 'optical', label: 'Anamorphic Flare', shortLabel: 'Anamorphic', icon: Zap },
  { id: 'lensBlur', group: 'optical', label: 'Lens Falloff', shortLabel: 'Lens Blur', icon: Aperture },
];

interface StillEffectsStudioProps {
  effects: StillEffectsConfig;
  exifDateLabel?: string | null;
  onChange: (next: StillEffectsConfig) => void;
  onLiveChange?: (next: StillEffectsConfig) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onClearAll: () => void;
}

export function StillEffectsStudio({
  effects,
  exifDateLabel,
  onChange,
  onLiveChange,
  onDragStart,
  onDragEnd,
  onClearAll,
}: StillEffectsStudioProps) {
  const [group, setGroup] = useState<EffectsGroup>('natural');
  const [activeTool, setActiveTool] = useState<EffectToolId>('sunRays');

  const activeCount = countActiveStillEffects(effects);
  const autoExifStamp = format90sDateStamp(exifDateLabel);

  const visibleTools = EFFECT_TOOLS.filter((t) => t.group === group);

  const switchGroup = (nextGroup: EffectsGroup) => {
    setGroup(nextGroup);
    const firstInGroup = EFFECT_TOOLS.find((t) => t.group === nextGroup);
    if (firstInGroup) setActiveTool(firstInGroup.id);
  };

  const isToolActive = (id: EffectToolId): boolean => {
    switch (id) {
      case 'sunRays':
        return effects.sunRays.intensity > 0;
      case 'shadowPlay':
        return effects.shadowPlay.intensity > 0;
      case 'mist':
        return effects.mist.intensity > 0;
      case 'sunHalo':
        return effects.sunHalo.intensity > 0;
      case 'atmosphereParticles':
        return effects.atmosphereParticles.intensity > 0;
      case 'lightGlint':
        return effects.lightGlint.intensity > 0;
      case 'lightLeak':
        return effects.lightLeak.intensity > 0;
      case 'filmDust':
        return effects.filmDust.intensity > 0;
      case 'dateStamp':
        return effects.dateStamp.enabled;
      case 'anamorphic':
        return effects.anamorphic.intensity > 0;
      case 'lensBlur':
        return effects.lensBlur.intensity > 0;
    }
  };

  const getToolValueLabel = (id: EffectToolId): string | null => {
    switch (id) {
      case 'sunRays':
        return effects.sunRays.intensity > 0 ? `${effects.sunRays.intensity}` : null;
      case 'shadowPlay':
        return effects.shadowPlay.intensity > 0 ? `${effects.shadowPlay.intensity}` : null;
      case 'mist':
        return effects.mist.intensity > 0 ? `${effects.mist.intensity}` : null;
      case 'sunHalo':
        return effects.sunHalo.intensity > 0 ? `${effects.sunHalo.intensity}` : null;
      case 'atmosphereParticles':
        return effects.atmosphereParticles.intensity > 0
          ? `${effects.atmosphereParticles.intensity}`
          : null;
      case 'lightGlint':
        return effects.lightGlint.intensity > 0 ? `${effects.lightGlint.intensity}` : null;
      case 'lightLeak':
        return effects.lightLeak.intensity > 0 ? `${effects.lightLeak.intensity}` : null;
      case 'filmDust':
        return effects.filmDust.intensity > 0 ? `${effects.filmDust.intensity}` : null;
      case 'dateStamp':
        return effects.dateStamp.enabled ? 'ON' : null;
      case 'anamorphic':
        return effects.anamorphic.intensity > 0 ? `${effects.anamorphic.intensity}` : null;
      case 'lensBlur':
        return effects.lensBlur.intensity > 0 ? `${effects.lensBlur.intensity}` : null;
    }
  };

  /** Selecting a tool auto-gives it a tasteful starting value if currently 0? No—keep user in full control, or offer quick-tap slider/presets */
  const handleSelectTool = (id: EffectToolId) => {
    setActiveTool(id);
  };

  const handleLiveSlider = (next: StillEffectsConfig) => {
    if (onLiveChange) {
      onLiveChange(next);
    } else {
      onChange(next);
    }
  };

  const renderSliderRow = (
    label: string,
    value: number,
    onLiveValue: (v: number) => void,
    onOffValue: () => void,
    extraRight?: React.ReactNode
  ) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-still-ink dark:text-still-paper">
          {label}
        </span>
        <div className="flex items-center gap-2.5">
          {extraRight}
          {value > 0 && (
            <button
              type="button"
              onClick={onOffValue}
              className="font-mono text-[9.5px] tracking-[0.08em] text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper cursor-pointer"
            >
              OFF
            </button>
          )}
          <span className="font-mono text-[10.5px] tabular-nums w-8 text-right text-still-taupe">
            {value}%
          </span>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onPointerDown={onDragStart}
        onPointerUp={onDragEnd}
        onChange={(e) => onLiveValue(Number(e.target.value))}
        className="w-full accent-[#A58C73] cursor-pointer"
        aria-label={`${label} intensity`}
      />
    </div>
  );

  const renderOptionButtons = <T extends string>(
    options: { id: T; label: string }[],
    current: T,
    onSelect: (id: T) => void
  ) => (
    <div className="flex items-center gap-1.5 overflow-x-auto still-scroll pb-0.5">
      {options.map((opt) => {
        const selected = current === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            className={`px-2.5 py-1 text-[10px] font-mono tracking-[0.06em] whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
              selected
                ? 'border-still-ink dark:border-still-paper bg-still-ink text-still-paper dark:bg-still-paper dark:text-still-ink'
                : 'border-hairline-light dark:border-hairline-dark text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );

  // Curated 1-tap atmosphere recipes
  const applyCombo = (combo: 'golden-morning' | 'film-90s' | 'rainy-cinema' | 'misty-dawn') => {
    const base: StillEffectsConfig = {
      lightLeak: { ...DEFAULT_STILL_EFFECTS.lightLeak },
      filmDust: { ...DEFAULT_STILL_EFFECTS.filmDust },
      dateStamp: { ...DEFAULT_STILL_EFFECTS.dateStamp },
      anamorphic: { ...DEFAULT_STILL_EFFECTS.anamorphic },
      lensBlur: { ...DEFAULT_STILL_EFFECTS.lensBlur },
      sunRays: { ...DEFAULT_STILL_EFFECTS.sunRays },
      shadowPlay: { ...DEFAULT_STILL_EFFECTS.shadowPlay },
      mist: { ...DEFAULT_STILL_EFFECTS.mist },
      sunHalo: { ...DEFAULT_STILL_EFFECTS.sunHalo },
      atmosphereParticles: { ...DEFAULT_STILL_EFFECTS.atmosphereParticles },
      lightGlint: { ...DEFAULT_STILL_EFFECTS.lightGlint },
    };

    if (combo === 'golden-morning') {
      base.sunRays = { intensity: 46, direction: 'top-left', tone: 'golden' };
      base.shadowPlay = { intensity: 42, pattern: 'botanical-leaf', direction: 'left' };
      base.atmosphereParticles = { intensity: 38, mode: 'sun-motes', seed: 3 };
      setGroup('natural');
      setActiveTool('sunRays');
    } else if (combo === 'film-90s') {
      base.lightLeak = { intensity: 44, style: 'side-amber', seed: 1 };
      base.filmDust = { intensity: 42, style: 'subtle-scan', seed: 2 };
      base.dateStamp = {
        enabled: true,
        style: 'amber-led',
        position: 'bottom-right',
        customText: '',
        autoExifText: autoExifStamp,
      };
      setGroup('optical');
      setActiveTool('lightLeak');
    } else if (combo === 'rainy-cinema') {
      base.anamorphic = { intensity: 58, tone: 'cinema-blue' };
      base.atmosphereParticles = { intensity: 52, mode: 'soft-rain', seed: 4 };
      base.lightGlint = { intensity: 36, angle: 'cross-45' };
      setGroup('optical');
      setActiveTool('anamorphic');
    } else {
      base.mist = { intensity: 52, style: 'ground-fog', tone: 'warm-cream' };
      base.sunHalo = { intensity: 44, position: 'top-right' };
      base.lensBlur = { intensity: 28, style: 'radial-prime' };
      setGroup('natural');
      setActiveTool('mist');
    }
    onChange(base);
  };

  return (
    <div className="px-3.5 pt-2 pb-2.5 space-y-2.5">
      {/* Top Sub-Tab Bar: Natural Light | Optical & Film + Combos / Clear */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => switchGroup('natural')}
            className={`text-[10px] font-mono tracking-[0.11em] uppercase pb-0.5 border-b transition-colors cursor-pointer whitespace-nowrap ${
              group === 'natural'
                ? 'border-still-ink dark:border-still-paper text-still-ink dark:text-still-paper'
                : 'border-transparent text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
            }`}
          >
            Natural Light
          </button>
          <button
            type="button"
            onClick={() => switchGroup('optical')}
            className={`text-[10px] font-mono tracking-[0.11em] uppercase pb-0.5 border-b transition-colors cursor-pointer whitespace-nowrap ${
              group === 'optical'
                ? 'border-still-ink dark:border-still-paper text-still-ink dark:text-still-paper'
                : 'border-transparent text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
            }`}
          >
            Optical &amp; Film
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="flex items-center gap-1 font-mono text-[9.5px] tracking-[0.08em] text-still-taupe hover:text-still-ink dark:hover:text-still-paper cursor-pointer whitespace-nowrap"
              title="Reset all active effects"
            >
              <RotateCcw className="w-2.5 h-2.5" strokeWidth={1.6} />
              <span>CLEAR ({activeCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Effect Selector Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto still-scroll pb-0.5">
        {visibleTools.map((tool) => {
          const Icon = tool.icon;
          const selected = activeTool === tool.id;
          const active = isToolActive(tool.id);
          const valBadge = getToolValueLabel(tool.id);
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => handleSelectTool(tool.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 border text-[10.5px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                selected
                  ? 'border-still-ink dark:border-still-paper bg-still-ink text-still-paper dark:bg-still-paper dark:text-still-ink'
                  : active
                    ? 'border-still-taupe/70 text-still-ink dark:text-still-paper bg-paper-low/70 dark:bg-ink-low'
                    : 'border-hairline-light dark:border-hairline-dark text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
              <span>{tool.shortLabel}</span>
              {valBadge && (
                <span
                  className={`font-mono text-[9px] tabular-nums ${
                    selected ? 'opacity-80' : 'text-still-taupe'
                  }`}
                >
                  {valBadge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Effect Fine Control Deck */}
      <div className="pt-1 border-t border-hairline-light dark:border-hairline-dark space-y-2">
        {activeTool === 'sunRays' && (
          <>
            {renderSliderRow(
              'Sun Rays',
              effects.sunRays.intensity,
              (v) => handleLiveSlider({ ...effects, sunRays: { ...effects.sunRays, intensity: v } }),
              () => onChange({ ...effects, sunRays: { ...effects.sunRays, intensity: 0 } })
            )}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {renderOptionButtons<SunRaysDirection>(
                [
                  { id: 'top-left', label: 'Top Left' },
                  { id: 'top-center', label: 'Overhead' },
                  { id: 'top-right', label: 'Top Right' },
                ],
                effects.sunRays.direction,
                (direction) =>
                  onChange({
                    ...effects,
                    sunRays: {
                      ...effects.sunRays,
                      direction,
                      intensity: effects.sunRays.intensity === 0 ? 48 : effects.sunRays.intensity,
                    },
                  })
              )}
              {renderOptionButtons<SunRaysTone>(
                [
                  { id: 'golden', label: 'Golden' },
                  { id: 'ivory', label: 'Ivory' },
                ],
                effects.sunRays.tone,
                (tone) =>
                  onChange({
                    ...effects,
                    sunRays: {
                      ...effects.sunRays,
                      tone,
                      intensity: effects.sunRays.intensity === 0 ? 48 : effects.sunRays.intensity,
                    },
                  })
              )}
            </div>
          </>
        )}

        {activeTool === 'shadowPlay' && (
          <>
            {renderSliderRow(
              'Shadow Play (Gobo)',
              effects.shadowPlay.intensity,
              (v) =>
                handleLiveSlider({
                  ...effects,
                  shadowPlay: { ...effects.shadowPlay, intensity: v },
                }),
              () => onChange({ ...effects, shadowPlay: { ...effects.shadowPlay, intensity: 0 } })
            )}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {renderOptionButtons<ShadowPlayPattern>(
                [
                  { id: 'botanical-leaf', label: 'Botanical' },
                  { id: 'venetian-blinds', label: 'Blinds' },
                  { id: 'window-pane', label: 'Window' },
                  { id: 'palm-frond', label: 'Palm' },
                ],
                effects.shadowPlay.pattern,
                (pattern) =>
                  onChange({
                    ...effects,
                    shadowPlay: {
                      ...effects.shadowPlay,
                      pattern,
                      intensity:
                        effects.shadowPlay.intensity === 0 ? 48 : effects.shadowPlay.intensity,
                    },
                  })
              )}
              {renderOptionButtons<ShadowPlayDirection>(
                [
                  { id: 'left', label: 'Left' },
                  { id: 'right', label: 'Right' },
                ],
                effects.shadowPlay.direction,
                (direction) =>
                  onChange({
                    ...effects,
                    shadowPlay: {
                      ...effects.shadowPlay,
                      direction,
                      intensity:
                        effects.shadowPlay.intensity === 0 ? 48 : effects.shadowPlay.intensity,
                    },
                  })
              )}
            </div>
          </>
        )}

        {activeTool === 'mist' && (
          <>
            {renderSliderRow(
              'Atmospheric Mist',
              effects.mist.intensity,
              (v) => handleLiveSlider({ ...effects, mist: { ...effects.mist, intensity: v } }),
              () => onChange({ ...effects, mist: { ...effects.mist, intensity: 0 } })
            )}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {renderOptionButtons<MistStyle>(
                [
                  { id: 'ground-fog', label: 'Ground Fog' },
                  { id: 'morning-haze', label: 'Morning Haze' },
                  { id: 'drifting-alpine', label: 'Alpine Drift' },
                ],
                effects.mist.style,
                (style) =>
                  onChange({
                    ...effects,
                    mist: {
                      ...effects.mist,
                      style,
                      intensity: effects.mist.intensity === 0 ? 48 : effects.mist.intensity,
                    },
                  })
              )}
              {renderOptionButtons<MistTone>(
                [
                  { id: 'cool-silver', label: 'Silver' },
                  { id: 'warm-cream', label: 'Warm' },
                ],
                effects.mist.tone,
                (tone) =>
                  onChange({
                    ...effects,
                    mist: {
                      ...effects.mist,
                      tone,
                      intensity: effects.mist.intensity === 0 ? 48 : effects.mist.intensity,
                    },
                  })
              )}
            </div>
          </>
        )}

        {activeTool === 'sunHalo' && (
          <>
            {renderSliderRow(
              'Backlight Sun Halo',
              effects.sunHalo.intensity,
              (v) => handleLiveSlider({ ...effects, sunHalo: { ...effects.sunHalo, intensity: v } }),
              () => onChange({ ...effects, sunHalo: { ...effects.sunHalo, intensity: 0 } })
            )}
            {renderOptionButtons<SunHaloPosition>(
              [
                { id: 'top-left', label: 'Top Left' },
                { id: 'top-right', label: 'Top Right' },
                { id: 'edge-left', label: 'Side Left' },
                { id: 'edge-right', label: 'Side Right' },
              ],
              effects.sunHalo.position,
              (position) =>
                onChange({
                  ...effects,
                  sunHalo: {
                    ...effects.sunHalo,
                    position,
                    intensity: effects.sunHalo.intensity === 0 ? 48 : effects.sunHalo.intensity,
                  },
                })
            )}
          </>
        )}

        {activeTool === 'atmosphereParticles' && (
          <>
            {renderSliderRow(
              'Atmosphere Particles',
              effects.atmosphereParticles.intensity,
              (v) =>
                handleLiveSlider({
                  ...effects,
                  atmosphereParticles: { ...effects.atmosphereParticles, intensity: v },
                }),
              () =>
                onChange({
                  ...effects,
                  atmosphereParticles: { ...effects.atmosphereParticles, intensity: 0 },
                }),
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...effects,
                    atmosphereParticles: {
                      ...effects.atmosphereParticles,
                      seed: effects.atmosphereParticles.seed + 1,
                      intensity:
                        effects.atmosphereParticles.intensity === 0
                          ? 48
                          : effects.atmosphereParticles.intensity,
                    },
                  })
                }
                className="flex items-center gap-1 font-mono text-[9.5px] tracking-[0.06em] text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper cursor-pointer"
                title="Reshuffle particle positions"
              >
                <RefreshCw className="w-2.5 h-2.5" strokeWidth={1.6} />
                <span>SHUFFLE</span>
              </button>
            )}
            {renderOptionButtons<AtmosphereParticleMode>(
              [
                { id: 'sun-motes', label: 'Sun Motes' },
                { id: 'soft-rain', label: 'Soft Rain' },
                { id: 'glass-dew', label: 'Glass Dew' },
              ],
              effects.atmosphereParticles.mode,
              (mode) =>
                onChange({
                  ...effects,
                  atmosphereParticles: {
                    ...effects.atmosphereParticles,
                    mode,
                    intensity:
                      effects.atmosphereParticles.intensity === 0
                        ? 48
                        : effects.atmosphereParticles.intensity,
                  },
                })
            )}
          </>
        )}

        {activeTool === 'lightGlint' && (
          <>
            {renderSliderRow(
              'Optical Light Glint',
              effects.lightGlint.intensity,
              (v) =>
                handleLiveSlider({
                  ...effects,
                  lightGlint: { ...effects.lightGlint, intensity: v },
                }),
              () => onChange({ ...effects, lightGlint: { ...effects.lightGlint, intensity: 0 } })
            )}
            {renderOptionButtons<LightGlintAngle>(
              [
                { id: 'cross-45', label: '4-Pt Diagonal' },
                { id: 'cross-0', label: '4-Pt Straight' },
                { id: 'star-6', label: '6-Pt Star' },
              ],
              effects.lightGlint.angle,
              (angle) =>
                onChange({
                  ...effects,
                  lightGlint: {
                    ...effects.lightGlint,
                    angle,
                    intensity:
                      effects.lightGlint.intensity === 0 ? 52 : effects.lightGlint.intensity,
                  },
                })
            )}
          </>
        )}

        {activeTool === 'lightLeak' && (
          <>
            {renderSliderRow(
              '35mm Light Leak',
              effects.lightLeak.intensity,
              (v) =>
                handleLiveSlider({ ...effects, lightLeak: { ...effects.lightLeak, intensity: v } }),
              () => onChange({ ...effects, lightLeak: { ...effects.lightLeak, intensity: 0 } }),
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...effects,
                    lightLeak: {
                      ...effects.lightLeak,
                      seed: effects.lightLeak.seed + 1,
                      intensity:
                        effects.lightLeak.intensity === 0 ? 48 : effects.lightLeak.intensity,
                    },
                  })
                }
                className="flex items-center gap-1 font-mono text-[9.5px] tracking-[0.06em] text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper cursor-pointer"
                title="Flip light leak side"
              >
                <RefreshCw className="w-2.5 h-2.5" strokeWidth={1.6} />
                <span>FLIP</span>
              </button>
            )}
            {renderOptionButtons<LightLeakStyle>(
              [
                { id: 'side-amber', label: 'Side Amber' },
                { id: 'corner-crimson', label: 'Crimson' },
                { id: 'double-burn', label: 'Double Burn' },
                { id: 'sun-streak', label: 'Hinge Strip' },
                { id: 'prism-spectrum', label: 'Prism' },
              ],
              effects.lightLeak.style,
              (style) =>
                onChange({
                  ...effects,
                  lightLeak: {
                    ...effects.lightLeak,
                    style,
                    intensity:
                      effects.lightLeak.intensity === 0 ? 48 : effects.lightLeak.intensity,
                  },
                })
            )}
          </>
        )}

        {activeTool === 'filmDust' && (
          <>
            {renderSliderRow(
              'Film Dust & Scratches',
              effects.filmDust.intensity,
              (v) =>
                handleLiveSlider({ ...effects, filmDust: { ...effects.filmDust, intensity: v } }),
              () => onChange({ ...effects, filmDust: { ...effects.filmDust, intensity: 0 } }),
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...effects,
                    filmDust: {
                      ...effects.filmDust,
                      seed: effects.filmDust.seed + 1,
                      intensity:
                        effects.filmDust.intensity === 0 ? 45 : effects.filmDust.intensity,
                    },
                  })
                }
                className="flex items-center gap-1 font-mono text-[9.5px] tracking-[0.06em] text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper cursor-pointer"
                title="Shuffle film dust layout"
              >
                <RefreshCw className="w-2.5 h-2.5" strokeWidth={1.6} />
                <span>SHUFFLE</span>
              </button>
            )}
            {renderOptionButtons<FilmDustStyle>(
              [
                { id: 'subtle-scan', label: 'Subtle Scan' },
                { id: 'dust-hairs', label: 'Dust & Hairs' },
                { id: 'vintage-scratches', label: 'Scratches' },
              ],
              effects.filmDust.style,
              (style) =>
                onChange({
                  ...effects,
                  filmDust: {
                    ...effects.filmDust,
                    style,
                    intensity:
                      effects.filmDust.intensity === 0 ? 45 : effects.filmDust.intensity,
                  },
                })
            )}
          </>
        )}

        {activeTool === 'dateStamp' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...effects,
                      dateStamp: {
                        ...effects.dateStamp,
                        enabled: !effects.dateStamp.enabled,
                        autoExifText: autoExifStamp,
                      },
                    })
                  }
                  className={`px-2.5 py-1 text-[10px] font-mono tracking-[0.08em] border transition-colors cursor-pointer ${
                    effects.dateStamp.enabled
                      ? 'border-still-ink dark:border-still-paper bg-still-ink text-still-paper dark:bg-still-paper dark:text-still-ink'
                      : 'border-hairline-light dark:border-hairline-dark text-muted-ink dark:text-muted-paper'
                  }`}
                >
                  {effects.dateStamp.enabled ? 'STAMP ON' : 'STAMP OFF'}
                </button>
                <input
                  type="text"
                  maxLength={14}
                  value={effects.dateStamp.customText}
                  placeholder={autoExifStamp}
                  onChange={(e) =>
                    onChange({
                      ...effects,
                      dateStamp: {
                        ...effects.dateStamp,
                        enabled: true,
                        customText: e.target.value,
                        autoExifText: autoExifStamp,
                      },
                    })
                  }
                  className="w-28 px-2 py-1 text-[10.5px] font-mono bg-transparent border border-hairline-light dark:border-hairline-dark text-still-ink dark:text-still-paper placeholder:text-muted-ink/60 dark:placeholder:text-muted-paper/60 focus:outline-none focus:border-still-ink dark:focus:border-still-paper"
                  aria-label="Custom date stamp text"
                />
              </div>

              {effects.dateStamp.customText && (
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...effects,
                      dateStamp: {
                        ...effects.dateStamp,
                        customText: '',
                        autoExifText: autoExifStamp,
                      },
                    })
                  }
                  className="font-mono text-[9.5px] tracking-[0.08em] text-still-taupe hover:text-still-ink dark:hover:text-still-paper cursor-pointer whitespace-nowrap"
                >
                  AUTO EXIF
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              {renderOptionButtons<DateStampStyle>(
                [
                  { id: 'amber-led', label: 'Amber LED' },
                  { id: 'crimson-90s', label: 'Crimson 90s' },
                  { id: 'minimal-ivory', label: 'Ivory' },
                ],
                effects.dateStamp.style,
                (style) =>
                  onChange({
                    ...effects,
                    dateStamp: {
                      ...effects.dateStamp,
                      enabled: true,
                      style,
                      autoExifText: autoExifStamp,
                    },
                  })
              )}
              {renderOptionButtons<DateStampPosition>(
                [
                  { id: 'bottom-right', label: 'B-Right' },
                  { id: 'bottom-left', label: 'B-Left' },
                  { id: 'top-right', label: 'T-Right' },
                ],
                effects.dateStamp.position,
                (position) =>
                  onChange({
                    ...effects,
                    dateStamp: {
                      ...effects.dateStamp,
                      enabled: true,
                      position,
                      autoExifText: autoExifStamp,
                    },
                  })
              )}
            </div>
          </div>
        )}

        {activeTool === 'anamorphic' && (
          <>
            {renderSliderRow(
              'Anamorphic Flare',
              effects.anamorphic.intensity,
              (v) =>
                handleLiveSlider({
                  ...effects,
                  anamorphic: { ...effects.anamorphic, intensity: v },
                }),
              () => onChange({ ...effects, anamorphic: { ...effects.anamorphic, intensity: 0 } })
            )}
            {renderOptionButtons<AnamorphicTone>(
              [
                { id: 'cinema-blue', label: 'Cinema Blue' },
                { id: 'amber-gold', label: 'Amber Gold' },
                { id: 'prism-white', label: 'Prism White' },
              ],
              effects.anamorphic.tone,
              (tone) =>
                onChange({
                  ...effects,
                  anamorphic: {
                    ...effects.anamorphic,
                    tone,
                    intensity:
                      effects.anamorphic.intensity === 0 ? 55 : effects.anamorphic.intensity,
                  },
                })
            )}
          </>
        )}

        {activeTool === 'lensBlur' && (
          <>
            {renderSliderRow(
              'Vintage Lens Falloff',
              effects.lensBlur.intensity,
              (v) =>
                handleLiveSlider({ ...effects, lensBlur: { ...effects.lensBlur, intensity: v } }),
              () => onChange({ ...effects, lensBlur: { ...effects.lensBlur, intensity: 0 } })
            )}
            {renderOptionButtons<LensBlurStyle>(
              [
                { id: 'radial-prime', label: 'f/1.4 Radial' },
                { id: 'tilt-horizontal', label: 'Tilt Horiz' },
                { id: 'tilt-vertical', label: 'Tilt Vert' },
              ],
              effects.lensBlur.style,
              (style) =>
                onChange({
                  ...effects,
                  lensBlur: {
                    ...effects.lensBlur,
                    style,
                    intensity:
                      effects.lensBlur.intensity === 0 ? 45 : effects.lensBlur.intensity,
                  },
                })
            )}
          </>
        )}
      </div>

      {/* Quiet 1-Tap Atmosphere Recipes Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto still-scroll pt-1 border-t border-hairline-light/70 dark:border-hairline-dark/70">
        <span className="font-mono text-[9px] tracking-[0.1em] text-muted-ink dark:text-muted-paper uppercase shrink-0 mr-0.5">
          MIX:
        </span>
        {(
          [
            { id: 'golden-morning', label: 'Sunlit Leaves' },
            { id: 'misty-dawn', label: 'Misty Golden' },
            { id: 'film-90s', label: '90s Roll' },
            { id: 'rainy-cinema', label: 'Rain Cinema' },
          ] as const
        ).map((recipe) => (
          <button
            key={recipe.id}
            type="button"
            onClick={() => applyCombo(recipe.id)}
            className="px-2 py-0.5 text-[9.5px] font-mono tracking-[0.04em] whitespace-nowrap shrink-0 text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper border border-hairline-light dark:border-hairline-dark hover:border-still-ink/50 dark:hover:border-still-paper/50 transition-colors cursor-pointer"
          >
            {recipe.label}
          </button>
        ))}
      </div>
    </div>
  );
}
