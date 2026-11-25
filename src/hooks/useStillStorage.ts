import { useCallback, useEffect, useState } from 'react';
import {
  ColorAdjustments,
  CropRatio,
  CustomEditorialPreset,
  MatteFrameStyle,
  ToneMood,
} from '../engine/stillColorEngine';
import {
  FreeCropRect,
  GeometryTransform,
} from '../engine/stillGeometryEngine';

export interface SavedEditorialProject {
  id: string;
  title: string;
  photoSrc: string;
  presetId: string | null;
  customPresetId?: string | null;
  presetCode: string;
  toneMood?: ToneMood;
  intensity: number;
  adjustments: ColorAdjustments;
  cropRatio?: CropRatio;
  freeCrop?: FreeCropRect;
  geometry?: GeometryTransform;
  upscale2x?: boolean;
  frameStyle?: MatteFrameStyle;
  frameStamp?: boolean;
  frameCaption?: string;
  savedAt: string;
}

export interface EditedPhotoItem {
  id: string;
  title: string;
  thumbnailDataUrl: string;
  presetCode: string;
  resolution: string;
  formatLabel?: string;
  exportedAt: string;
}

interface StillStorageState {
  favoritePresetIds: string[];
  recentPresetIds: string[];
  customPresets: CustomEditorialPreset[];
  savedProjects: SavedEditorialProject[];
  editedPhotos: EditedPhotoItem[];
}

const STORAGE_KEY = 'still_offline_archive_v2';

const EMPTY_STATE: StillStorageState = {
  favoritePresetIds: [],
  recentPresetIds: [],
  customPresets: [],
  savedProjects: [],
  editedPhotos: [],
};

function loadInitialState(): StillStorageState {
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem('still_offline_archive_v1');
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<StillStorageState>;
    return {
      favoritePresetIds: Array.isArray(parsed.favoritePresetIds)
        ? parsed.favoritePresetIds
        : [],
      recentPresetIds: Array.isArray(parsed.recentPresetIds)
        ? parsed.recentPresetIds
        : [],
      customPresets: Array.isArray(parsed.customPresets)
        ? parsed.customPresets
        : [],
      savedProjects: Array.isArray(parsed.savedProjects)
        ? parsed.savedProjects
        : [],
      editedPhotos: Array.isArray(parsed.editedPhotos)
        ? parsed.editedPhotos
        : [],
    };
  } catch {
    return EMPTY_STATE;
  }
}

export function useStillStorage() {
  const [state, setState] = useState<StillStorageState>(loadInitialState);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  const toggleFavoritePreset = useCallback((presetId: string) => {
    setState((prev) => {
      const exists = prev.favoritePresetIds.includes(presetId);
      return {
        ...prev,
        favoritePresetIds: exists
          ? prev.favoritePresetIds.filter((id) => id !== presetId)
          : [presetId, ...prev.favoritePresetIds],
      };
    });
  }, []);

  const recordRecentPreset = useCallback((presetId: string) => {
    setState((prev) => ({
      ...prev,
      recentPresetIds: [
        presetId,
        ...prev.recentPresetIds.filter((id) => id !== presetId),
      ].slice(0, 8),
    }));
  }, []);

  const saveCustomPreset = useCallback((preset: CustomEditorialPreset) => {
    setState((prev) => ({
      ...prev,
      customPresets: [
        preset,
        ...prev.customPresets.filter((p) => p.id !== preset.id),
      ].slice(0, 24),
    }));
  }, []);

  const deleteCustomPreset = useCallback((presetId: string) => {
    setState((prev) => ({
      ...prev,
      customPresets: prev.customPresets.filter((p) => p.id !== presetId),
    }));
  }, []);

  const saveProject = useCallback((project: SavedEditorialProject) => {
    setState((prev) => ({
      ...prev,
      savedProjects: [
        project,
        ...prev.savedProjects.filter((p) => p.id !== project.id),
      ].slice(0, 12),
    }));
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    setState((prev) => ({
      ...prev,
      savedProjects: prev.savedProjects.filter((p) => p.id !== projectId),
    }));
  }, []);

  const recordEditedPhoto = useCallback((photo: EditedPhotoItem) => {
    setState((prev) => ({
      ...prev,
      editedPhotos: [photo, ...prev.editedPhotos].slice(0, 12),
    }));
  }, []);

  return {
    favoritePresetIds: state.favoritePresetIds,
    recentPresetIds: state.recentPresetIds,
    customPresets: state.customPresets,
    savedProjects: state.savedProjects,
    editedPhotos: state.editedPhotos,
    toggleFavoritePreset,
    recordRecentPreset,
    saveCustomPreset,
    deleteCustomPreset,
    saveProject,
    deleteProject,
    recordEditedPhoto,
  };
}
