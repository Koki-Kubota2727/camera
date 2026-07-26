import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_PHOTOGRAPHER_CODE, DEFAULT_TARGET_FOLDER } from "@/constants/defaults";
import { validatePhotographerCode } from "@/domain/naming/photoFileName";
import type { AppSettings } from "@/types/settings";

const SETTINGS_KEY = "lab-drive-camera:settings";

export const loadSettings = async (): Promise<AppSettings> => {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return defaultSettings();
  }
  const parsed = parseSettings(JSON.parse(raw) as unknown);
  return parsed;
};

export const saveSettings = async (settings: AppSettings): Promise<void> => {
  const normalized: AppSettings = {
    photographerCode: validatePhotographerCode(settings.photographerCode),
    targetFolderId: settings.targetFolderId.trim(),
    targetFolderName: settings.targetFolderName.trim(),
    driveFolderId: settings.driveFolderId?.trim() ? settings.driveFolderId.trim() : null,
    driveFolderName: settings.driveFolderName?.trim() ? settings.driveFolderName.trim() : null
  };
  if (!normalized.targetFolderId || !normalized.targetFolderName) {
    throw new Error("保存先フォルダを選択してください。");
  }
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
};

const defaultSettings = (): AppSettings => ({
  photographerCode: DEFAULT_PHOTOGRAPHER_CODE,
  targetFolderId: `local:${DEFAULT_TARGET_FOLDER}`,
  targetFolderName: DEFAULT_TARGET_FOLDER,
  driveFolderId: null,
  driveFolderName: null
});

const parseSettings = (value: unknown): AppSettings => {
  if (!isRecord(value)) {
    return defaultSettings();
  }
  const photographerCode =
    typeof value.photographerCode === "string"
      ? validatePhotographerCode(value.photographerCode)
      : DEFAULT_PHOTOGRAPHER_CODE;
  const targetFolderName =
    typeof value.targetFolderName === "string" && value.targetFolderName.trim()
      ? value.targetFolderName.trim()
      : DEFAULT_TARGET_FOLDER;
  const targetFolderId =
    typeof value.targetFolderId === "string" && value.targetFolderId.trim()
      ? value.targetFolderId.trim()
      : `local:${targetFolderName}`;
  const driveFolderId =
    typeof value.driveFolderId === "string" && value.driveFolderId.trim()
      ? value.driveFolderId.trim()
      : null;
  const driveFolderName =
    typeof value.driveFolderName === "string" && value.driveFolderName.trim()
      ? value.driveFolderName.trim()
      : null;
  return { photographerCode, targetFolderId, targetFolderName, driveFolderId, driveFolderName };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
