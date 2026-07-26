export type UploadStatus =
  | "local"
  | "queued"
  | "uploading"
  | "uploaded"
  | "failed"
  | "target_missing"
  | "deleted";

export type Photo = {
  id: string;
  localUri: string;
  thumbnailUri: string | null;
  targetFolderId: string;
  targetFolderNameCache: string;
  driveId: string | null;
  photographerCode: string;
  capturedAt: string;
  defaultFileName: string;
  currentFileName: string;
  memo: string | null;
  mimeType: string;
  fileSize: number | null;
  sha256: string | null;
  uploadStatus: UploadStatus;
  driveFileId: string | null;
  uploadedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewPhotoInput = {
  id: string;
  localUri: string;
  targetFolderId: string;
  targetFolderNameCache: string;
  photographerCode: string;
  capturedAt: string;
  defaultFileName: string;
  currentFileName: string;
  memo: string | null;
  fileSize: number | null;
};
