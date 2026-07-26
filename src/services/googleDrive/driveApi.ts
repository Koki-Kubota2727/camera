import { getValidAccessToken } from "@/services/googleAuth/tokenStorage";
import type { Photo } from "@/types/photo";

const DRIVE_API_BASE_URL = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
const MULTIPART_BOUNDARY = "lab-drive-camera-boundary";

type DriveFile = {
  id: string;
  name: string;
  parents?: string[];
  modifiedTime?: string;
  driveId?: string;
  capabilities?: {
    canAddChildren?: boolean;
    canEdit?: boolean;
  };
};

type DriveListResponse = {
  files?: DriveFile[];
};

type DriveUploadResponse = {
  id?: string;
  name?: string;
};

export const findUploadedPhotoByAppPhotoId = async (photoId: string): Promise<DriveFile | null> => {
  const accessToken = await getValidAccessToken();
  const params = new URLSearchParams({
    q: `appProperties has { key='appPhotoId' and value='${escapeDriveQueryValue(photoId)}' } and trashed = false`,
    spaces: "drive",
    fields: "files(id,name)",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true"
  });
  const response = await fetch(`${DRIVE_API_BASE_URL}/files?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  const body = await readJsonResponse<DriveListResponse>(response);
  return body.files?.[0] ?? null;
};

export const listDriveFolders = async (parentId: string | null): Promise<DriveFile[]> => {
  const accessToken = await getValidAccessToken();
  const parent = parentId ?? "root";
  const params = new URLSearchParams({
    q: `'${escapeDriveQueryValue(parent)}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields:
      "files(id,name,parents,modifiedTime,driveId,capabilities(canAddChildren,canEdit))",
    orderBy: "folder,name",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
    pageSize: "100"
  });
  const response = await fetch(`${DRIVE_API_BASE_URL}/files?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  const body = await readJsonResponse<DriveListResponse>(response);
  return body.files ?? [];
};

export const uploadPhotoToDrive = async (
  photo: Photo,
  driveFolderId: string
): Promise<{ driveFileId: string }> => {
  const existing = await findUploadedPhotoByAppPhotoId(photo.id);
  if (existing) {
    return { driveFileId: existing.id };
  }

  const accessToken = await getValidAccessToken();
  const photoResponse = await fetch(photo.localUri);
  const photoBlob = await photoResponse.blob();
  const metadata = {
    name: photo.currentFileName,
    parents: [driveFolderId],
    appProperties: {
      appPhotoId: photo.id,
      photographerCode: photo.photographerCode,
      capturedAt: photo.capturedAt
    }
  };
  const body = createMultipartBody(JSON.stringify(metadata), photoBlob, photo.mimeType);

  const response = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart&supportsAllDrives=true`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${MULTIPART_BOUNDARY}`
    },
    body
  });
  const result = await readJsonResponse<DriveUploadResponse>(response);
  if (!result.id) {
    throw new Error("Driveアップロード結果にファイルIDが含まれていません。");
  }
  return { driveFileId: result.id };
};

const createMultipartBody = (metadataJson: string, photoBlob: Blob, mimeType: string): Blob =>
  new Blob(
    [
      `--${MULTIPART_BOUNDARY}\r\n`,
      "Content-Type: application/json; charset=UTF-8\r\n\r\n",
      metadataJson,
      `\r\n--${MULTIPART_BOUNDARY}\r\n`,
      `Content-Type: ${mimeType}\r\n\r\n`,
      photoBlob,
      `\r\n--${MULTIPART_BOUNDARY}--\r\n`
    ],
    { type: `multipart/related; boundary=${MULTIPART_BOUNDARY}` }
  );

const readJsonResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  const parsed = text ? (JSON.parse(text) as unknown) : {};
  if (!response.ok) {
    throw new Error(createDriveErrorMessage(response.status, parsed));
  }
  return parsed as T;
};

const createDriveErrorMessage = (status: number, body: unknown): string => {
  if (isRecord(body) && isRecord(body.error) && typeof body.error.message === "string") {
    return `Drive APIエラー(${status}): ${body.error.message}`;
  }
  return `Drive APIエラー(${status})`;
};

const escapeDriveQueryValue = (value: string): string => value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
