import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getDatabase } from "@/services/database/database";
import type { NewPhotoInput, Photo, UploadStatus } from "@/types/photo";

const WEB_PHOTOS_KEY = "lab-drive-camera:web-photos";

type PhotoRow = {
  id: string;
  local_uri: string;
  thumbnail_uri: string | null;
  target_folder_id: string;
  target_folder_name_cache: string;
  drive_folder_id: string | null;
  drive_folder_name: string | null;
  drive_id: string | null;
  photographer_code: string;
  captured_at: string;
  default_file_name: string;
  current_file_name: string;
  memo: string | null;
  mime_type: string;
  file_size: number | null;
  sha256: string | null;
  upload_status: UploadStatus;
  drive_file_id: string | null;
  uploaded_at: string | null;
  created_at: string;
  updated_at: string;
};

export const insertPhoto = async (input: NewPhotoInput): Promise<void> => {
  if (Platform.OS === "web") {
    const photos = await loadWebPhotos();
    const now = new Date().toISOString();
    await saveWebPhotos([
      ...photos,
      {
        id: input.id,
        localUri: input.localUri,
        thumbnailUri: null,
        targetFolderId: input.targetFolderId,
        targetFolderNameCache: input.targetFolderNameCache,
        driveFolderId: input.driveFolderId,
        driveFolderName: input.driveFolderName,
        driveId: null,
        photographerCode: input.photographerCode,
        capturedAt: input.capturedAt,
        defaultFileName: input.defaultFileName,
        currentFileName: input.currentFileName,
        memo: input.memo,
        mimeType: "image/jpeg",
        fileSize: input.fileSize,
        sha256: null,
        uploadStatus: "local",
        driveFileId: null,
        uploadedAt: null,
        createdAt: now,
        updatedAt: now
      }
    ]);
    return;
  }
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO photos (
      id, local_uri, thumbnail_uri, target_folder_id, target_folder_name_cache,
      drive_folder_id, drive_folder_name, drive_id, photographer_code, captured_at, default_file_name, current_file_name,
      memo, mime_type, file_size, sha256, upload_status, drive_file_id, uploaded_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.localUri,
      null,
      input.targetFolderId,
      input.targetFolderNameCache,
      input.driveFolderId,
      input.driveFolderName,
      null,
      input.photographerCode,
      input.capturedAt,
      input.defaultFileName,
      input.currentFileName,
      input.memo,
      "image/jpeg",
      input.fileSize,
      null,
      "local",
      null,
      null,
      now,
      now
    ]
  );
};

export const listPhotos = async (): Promise<Photo[]> => {
  if (Platform.OS === "web") {
    return (await loadWebPhotos())
      .filter((photo) => photo.uploadStatus !== "deleted")
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  }
  const db = await getDatabase();
  const rows = await db.getAllAsync<PhotoRow>(
    "SELECT * FROM photos WHERE upload_status != 'deleted' ORDER BY captured_at DESC"
  );
  return rows.map(mapPhotoRow);
};

export const listUploadablePhotos = async (): Promise<Photo[]> => {
  if (Platform.OS === "web") {
    return (await loadWebPhotos())
      .filter((photo) => ["local", "queued", "failed"].includes(photo.uploadStatus))
      .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  }
  const db = await getDatabase();
  const rows = await db.getAllAsync<PhotoRow>(
    `SELECT * FROM photos
      WHERE upload_status IN ('local', 'queued', 'failed')
      ORDER BY captured_at ASC`
  );
  return rows.map(mapPhotoRow);
};

export const getPhotoById = async (id: string): Promise<Photo | null> => {
  if (Platform.OS === "web") {
    return (
      (await loadWebPhotos()).find(
        (photo) => photo.id === id && photo.uploadStatus !== "deleted"
      ) ?? null
    );
  }
  const db = await getDatabase();
  const row = await db.getFirstAsync<PhotoRow>(
    "SELECT * FROM photos WHERE id = ? AND upload_status != 'deleted'",
    [id]
  );
  return row ? mapPhotoRow(row) : null;
};

export const listCurrentFileNames = async (): Promise<string[]> => {
  if (Platform.OS === "web") {
    return (await loadWebPhotos())
      .filter((photo) => photo.uploadStatus !== "deleted")
      .map((photo) => photo.currentFileName);
  }
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ current_file_name: string }>(
    "SELECT current_file_name FROM photos WHERE upload_status != 'deleted'"
  );
  return rows.map((row) => row.current_file_name);
};

export const updatePhotoMetadata = async (
  id: string,
  fields: {
    currentFileName: string;
    targetFolderId: string;
    targetFolderNameCache: string;
    driveFolderId: string | null;
    driveFolderName: string | null;
    memo: string | null;
  }
): Promise<void> => {
  if (Platform.OS === "web") {
    await updateWebPhoto(id, (photo) => {
      if (!["local", "queued", "failed", "target_missing"].includes(photo.uploadStatus)) {
        return photo;
      }
      return {
        ...photo,
        currentFileName: fields.currentFileName,
        targetFolderId: fields.targetFolderId,
        targetFolderNameCache: fields.targetFolderNameCache,
        driveFolderId: fields.driveFolderId,
        driveFolderName: fields.driveFolderName,
        memo: fields.memo,
        uploadStatus: photo.uploadStatus === "target_missing" ? "local" : photo.uploadStatus,
        updatedAt: new Date().toISOString()
      };
    });
    return;
  }
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE photos
       SET current_file_name = ?,
           target_folder_id = ?,
           target_folder_name_cache = ?,
           drive_folder_id = ?,
           drive_folder_name = ?,
           upload_status = CASE WHEN upload_status = 'target_missing' THEN 'local' ELSE upload_status END,
           memo = ?,
           updated_at = ?
     WHERE id = ? AND upload_status IN ('local', 'queued', 'failed', 'target_missing')`,
    [
      fields.currentFileName,
      fields.targetFolderId,
      fields.targetFolderNameCache,
      fields.driveFolderId,
      fields.driveFolderName,
      fields.memo,
      new Date().toISOString(),
      id
    ]
  );
};

export const markPhotoTargetMissing = async (id: string): Promise<void> => {
  if (Platform.OS === "web") {
    await updateWebPhoto(id, (photo) => ({
      ...photo,
      uploadStatus: "target_missing",
      updatedAt: new Date().toISOString()
    }));
    return;
  }
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE photos SET upload_status = 'target_missing', updated_at = ? WHERE id = ?",
    [new Date().toISOString(), id]
  );
};

export const markPhotoDeleted = async (id: string): Promise<void> => {
  if (Platform.OS === "web") {
    await updateWebPhoto(id, (photo) => ({
      ...photo,
      uploadStatus: "deleted",
      updatedAt: new Date().toISOString()
    }));
    return;
  }
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE photos SET upload_status = 'deleted', updated_at = ? WHERE id = ? AND upload_status IN ('local', 'queued', 'failed')",
    [new Date().toISOString(), id]
  );
};

export const markPhotoUploading = async (id: string): Promise<void> => {
  if (Platform.OS === "web") {
    await updateWebPhoto(id, (photo) => ({
      ...photo,
      uploadStatus: "uploading",
      updatedAt: new Date().toISOString()
    }));
    return;
  }
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE photos SET upload_status = 'uploading', updated_at = ? WHERE id = ? AND upload_status IN ('local', 'queued', 'failed')",
    [new Date().toISOString(), id]
  );
};

export const markPhotoUploaded = async (id: string, driveFileId: string): Promise<void> => {
  if (Platform.OS === "web") {
    const now = new Date().toISOString();
    await updateWebPhoto(id, (photo) => ({
      ...photo,
      uploadStatus: "uploaded",
      driveFileId,
      uploadedAt: now,
      updatedAt: now
    }));
    return;
  }
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE photos
       SET upload_status = 'uploaded',
           drive_file_id = ?,
           uploaded_at = ?,
           updated_at = ?
     WHERE id = ?`,
    [driveFileId, now, now, id]
  );
};

export const markPhotoUploadFailed = async (id: string): Promise<void> => {
  if (Platform.OS === "web") {
    await updateWebPhoto(id, (photo) => ({
      ...photo,
      uploadStatus: "failed",
      updatedAt: new Date().toISOString()
    }));
    return;
  }
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE photos SET upload_status = 'failed', updated_at = ? WHERE id = ?",
    [new Date().toISOString(), id]
  );
};

export const countLocalPhotos = async (): Promise<number> => {
  if (Platform.OS === "web") {
    return (await loadWebPhotos()).filter((photo) =>
      ["local", "queued", "failed"].includes(photo.uploadStatus)
    ).length;
  }
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM photos WHERE upload_status IN ('local', 'queued', 'failed')"
  );
  return row?.count ?? 0;
};

const mapPhotoRow = (row: PhotoRow): Photo => ({
  id: row.id,
  localUri: row.local_uri,
  thumbnailUri: row.thumbnail_uri,
  targetFolderId: row.target_folder_id,
  targetFolderNameCache: row.target_folder_name_cache,
  driveFolderId: row.drive_folder_id,
  driveFolderName: row.drive_folder_name,
  driveId: row.drive_id,
  photographerCode: row.photographer_code,
  capturedAt: row.captured_at,
  defaultFileName: row.default_file_name,
  currentFileName: row.current_file_name,
  memo: row.memo,
  mimeType: row.mime_type,
  fileSize: row.file_size,
  sha256: row.sha256,
  uploadStatus: row.upload_status,
  driveFileId: row.drive_file_id,
  uploadedAt: row.uploaded_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const loadWebPhotos = async (): Promise<Photo[]> => {
  const raw = await AsyncStorage.getItem(WEB_PHOTOS_KEY);
  if (!raw) {
    return [];
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter(isPhotoLike).map(normalizeWebPhoto);
};

const saveWebPhotos = async (photos: readonly Photo[]): Promise<void> => {
  await AsyncStorage.setItem(WEB_PHOTOS_KEY, JSON.stringify(photos));
};

const updateWebPhoto = async (
  id: string,
  updater: (photo: Photo) => Photo
): Promise<void> => {
  const photos = await loadWebPhotos();
  await saveWebPhotos(photos.map((photo) => (photo.id === id ? updater(photo) : photo)));
};

const isPhotoLike = (value: unknown): value is Omit<Photo, "driveFolderId" | "driveFolderName"> & {
  driveFolderId?: unknown;
  driveFolderName?: unknown;
} => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.localUri === "string" &&
    typeof value.targetFolderId === "string" &&
    typeof value.targetFolderNameCache === "string" &&
    typeof value.photographerCode === "string" &&
    typeof value.capturedAt === "string" &&
    typeof value.defaultFileName === "string" &&
    typeof value.currentFileName === "string" &&
    typeof value.mimeType === "string" &&
    isUploadStatus(value.uploadStatus) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
};

const normalizeWebPhoto = (
  value: Omit<Photo, "driveFolderId" | "driveFolderName"> & {
    driveFolderId?: unknown;
    driveFolderName?: unknown;
  }
): Photo => ({
  ...value,
  driveFolderId: typeof value.driveFolderId === "string" ? value.driveFolderId : null,
  driveFolderName: typeof value.driveFolderName === "string" ? value.driveFolderName : null
});

const isUploadStatus = (value: unknown): value is UploadStatus =>
  value === "local" ||
  value === "queued" ||
  value === "uploading" ||
  value === "uploaded" ||
  value === "failed" ||
  value === "target_missing" ||
  value === "deleted";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
