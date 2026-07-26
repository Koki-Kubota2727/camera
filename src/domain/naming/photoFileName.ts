const INVALID_FILE_NAME_CHARS = /[\/\\:*?"<>|]/g;
const MULTIPLE_SPACES = /\s+/g;
const MULTIPLE_UNDERSCORES = /_+/g;
const PHOTOGRAPHER_CODE = /^[A-Z0-9_-]+$/;
const MAX_BASE_LENGTH = 116;

export type FileNameParts = {
  folderName: string;
  capturedAt: Date;
  photographerCode: string;
  memo?: string | null;
};

export const validatePhotographerCode = (code: string): string => {
  const normalized = code.trim().toUpperCase();
  if (normalized.length === 0) {
    throw new Error("撮影者コードを入力してください。");
  }
  if (!PHOTOGRAPHER_CODE.test(normalized)) {
    throw new Error("撮影者コードはA-Z、0-9、-、_のみ使用できます。");
  }
  return normalized;
};

export const sanitizeFileName = (fileName: string): string => {
  const normalized = fileName
    .trim()
    .replace(INVALID_FILE_NAME_CHARS, "_")
    .replace(MULTIPLE_SPACES, "_")
    .replace(MULTIPLE_UNDERSCORES, "_");
  const withExtension = normalized.toLowerCase().endsWith(".jpg")
    ? normalized
    : `${normalized.replace(/\.+$/g, "")}.jpg`;
  const extension = ".jpg";
  const baseName = withExtension.slice(0, -extension.length);
  const safeBaseName = baseName.slice(0, MAX_BASE_LENGTH).replace(/_+$/g, "");
  if (safeBaseName.length === 0) {
    throw new Error("ファイル名を入力してください。");
  }
  return `${safeBaseName}${extension}`;
};

export const formatDateForFileName = (date: Date): string => {
  const yyyy = date.getFullYear().toString();
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  return `${yyyy}${mm}${dd}`;
};

export const formatTimeForFileName = (date: Date): string => {
  const hh = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return `${hh}${mm}${ss}`;
};

export const createDefaultPhotoFileName = ({
  folderName,
  capturedAt,
  photographerCode,
  memo
}: FileNameParts): string => {
  const safeCode = validatePhotographerCode(photographerCode);
  const baseParts = [
    folderName,
    formatDateForFileName(capturedAt),
    formatTimeForFileName(capturedAt),
    safeCode,
    memo?.trim() ? memo.trim() : null
  ].filter((part): part is string => part !== null);

  return sanitizeFileName(`${baseParts.join("_")}.jpg`);
};

export const createUniqueFileName = (
  desiredFileName: string,
  existingFileNames: readonly string[]
): string => {
  const safeName = sanitizeFileName(desiredFileName);
  const existing = new Set(existingFileNames.map((name) => name.toLowerCase()));
  if (!existing.has(safeName.toLowerCase())) {
    return safeName;
  }

  const extension = ".jpg";
  const baseName = safeName.slice(0, -extension.length);
  for (let index = 2; index < 1000; index += 1) {
    const suffix = `_${pad2(index)}`;
    const candidate = `${baseName.slice(0, MAX_BASE_LENGTH - suffix.length)}${suffix}${extension}`;
    if (!existing.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  throw new Error("重複しないファイル名を生成できませんでした。");
};

const pad2 = (value: number): string => value.toString().padStart(2, "0");
