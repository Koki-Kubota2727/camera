import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

const getPhotosDirectory = (): string | null =>
  FileSystem.documentDirectory ? `${FileSystem.documentDirectory}photos/` : null;

export const ensurePhotoDirectory = async (): Promise<void> => {
  const photosDirectory = getPhotosDirectory();
  if (!photosDirectory) {
    throw new Error("Document Directoryを利用できません。");
  }
  const info = await FileSystem.getInfoAsync(photosDirectory);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(photosDirectory, { intermediates: true });
  }
};

export const createPhotoLocalUri = (photoId: string): string => {
  const photosDirectory = getPhotosDirectory();
  if (!photosDirectory) {
    throw new Error("Document Directoryを利用できません。");
  }
  return `${photosDirectory}${photoId}.jpg`;
};

export const persistCapturedPhoto = async (
  tempUri: string,
  photoId: string
): Promise<{ localUri: string; fileSize: number | null }> => {
  if (Platform.OS === "web" || !FileSystem.documentDirectory) {
    const response = await fetch(tempUri);
    const blob = await response.blob();
    return {
      localUri: tempUri,
      fileSize: blob.size
    };
  }
  await ensurePhotoDirectory();
  const localUri = createPhotoLocalUri(photoId);
  await FileSystem.copyAsync({ from: tempUri, to: localUri });
  const info = await FileSystem.getInfoAsync(localUri, { size: true });
  return {
    localUri,
    fileSize: info.exists && "size" in info ? info.size : null
  };
};

export const deleteLocalPhotoFile = async (localUri: string): Promise<void> => {
  if (Platform.OS === "web" || !localUri.startsWith("file://")) {
    return;
  }
  const info = await FileSystem.getInfoAsync(localUri);
  if (info.exists) {
    await FileSystem.deleteAsync(localUri, { idempotent: true });
  }
};
