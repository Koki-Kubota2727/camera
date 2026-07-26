import { Image } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { InfoRow } from "@/components/InfoRow";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { LOCAL_FOLDER_OPTIONS } from "@/constants/defaults";
import { createUniqueFileName, sanitizeFileName } from "@/domain/naming/photoFileName";
import {
  getPhotoById,
  listCurrentFileNames,
  markPhotoDeleted,
  updatePhotoMetadata
} from "@/repositories/photoRepository";
import { deleteLocalPhotoFile } from "@/services/filesystem/photoFileSystem";
import { listDriveFolders } from "@/services/googleDrive/driveApi";
import { useAppStore } from "@/store/appStore";
import type { Photo } from "@/types/photo";
import { formatDebugError } from "@/utils/debugError";

type DriveFolderCandidate = {
  id: string;
  name: string;
};

export default function PhotoDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const settings = useAppStore((state) => state.settings);
  const refreshLocalPhotoCount = useAppStore((state) => state.refreshLocalPhotoCount);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [fileName, setFileName] = useState("");
  const [folderName, setFolderName] = useState("");
  const [driveFolderId, setDriveFolderId] = useState<string | null>(null);
  const [driveFolderName, setDriveFolderName] = useState<string | null>(null);
  const [driveFolderCandidates, setDriveFolderCandidates] = useState<DriveFolderCandidate[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    const nextPhoto = await getPhotoById(id);
    setPhoto(nextPhoto);
    setFileName(nextPhoto?.currentFileName ?? "");
    setFolderName(nextPhoto?.targetFolderNameCache ?? "");
    setDriveFolderId(nextPhoto?.driveFolderId ?? null);
    setDriveFolderName(nextPhoto?.driveFolderName ?? null);
    setMemo(nextPhoto?.memo ?? "");
  }, [id]);

  const loadDriveFolderCandidates = useCallback(async (): Promise<void> => {
    if (!settings?.driveParentFolderId) {
      setDriveFolderCandidates([]);
      return;
    }
    const folders = await listDriveFolders(settings.driveParentFolderId);
    setDriveFolderCandidates(folders.map((folder) => ({ id: folder.id, name: folder.name })));
  }, [settings?.driveParentFolderId]);

  useFocusEffect(
    useCallback(() => {
      void Promise.all([load(), loadDriveFolderCandidates()]).catch((error: unknown) => {
        setMessage(formatDebugError("photo detail load", error));
      });
    }, [load, loadDriveFolderCandidates])
  );

  const selectDriveFolder = (folder: DriveFolderCandidate): void => {
    setDriveFolderId(folder.id);
    setDriveFolderName(folder.name);
  };

  const save = async (): Promise<void> => {
    if (!photo) {
      return;
    }
    setSaving(true);
    try {
      const otherNames = (await listCurrentFileNames()).filter(
        (name) => name !== photo.currentFileName
      );
      const currentFileName = createUniqueFileName(sanitizeFileName(fileName), otherNames);
      const nextFolderName = folderName.trim();
      if (!nextFolderName) {
        throw new Error("保存先フォルダを入力してください。");
      }
      await updatePhotoMetadata(photo.id, {
        currentFileName,
        targetFolderId: `local:${nextFolderName}`,
        targetFolderNameCache: nextFolderName,
        driveFolderId,
        driveFolderName,
        memo: memo.trim() ? memo.trim() : null
      });
      await load();
      await refreshLocalPhotoCount();
      Alert.alert("保存しました");
    } catch (error: unknown) {
      Alert.alert("保存できません", error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = (): void => {
    if (!photo) {
      return;
    }
    Alert.alert("削除しますか", "ローカル写真とメタデータを削除扱いにします。", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await markPhotoDeleted(photo.id);
              await deleteLocalPhotoFile(photo.localUri);
              await refreshLocalPhotoCount();
              router.back();
            } catch (error: unknown) {
              Alert.alert("削除できません", error instanceof Error ? error.message : String(error));
            }
          })();
        }
      }
    ]);
  };

  if (!photo) {
    return (
      <Screen>
        <Text>写真が見つかりません。</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Image source={{ uri: photo.localUri }} style={styles.preview} resizeMode="cover" />
      <View style={styles.panel}>
        <InfoRow label="撮影者" value={photo.photographerCode} />
        <InfoRow label="撮影日時" value={new Date(photo.capturedAt).toLocaleString()} />
        <InfoRow label="状態" value={formatUploadStatus(photo.uploadStatus)} />
        <InfoRow label="Drive保存先" value={driveFolderName ?? "未指定"} />
      </View>
      <View style={styles.panel}>
        <Text style={styles.label}>ファイル名</Text>
        <TextInput onChangeText={setFileName} style={styles.input} value={fileName} />
        <Text style={styles.label}>保存先フォルダ</Text>
        <View style={styles.folderGrid}>
          {LOCAL_FOLDER_OPTIONS.map((folder) => (
            <Text
              key={folder}
              onPress={() => setFolderName(folder)}
              style={[styles.folderChip, folderName === folder ? styles.folderChipSelected : null]}
            >
              {folder}
            </Text>
          ))}
        </View>
        <TextInput onChangeText={setFolderName} style={styles.input} value={folderName} />
        <Text style={styles.label}>写真ごとのDrive保存先</Text>
        <View style={styles.folderGrid}>
          {driveFolderCandidates.map((folder) => (
            <Pressable
              key={folder.id}
              onPress={() => selectDriveFolder(folder)}
              style={[
                styles.folderChip,
                driveFolderId === folder.id ? styles.folderChipSelected : null
              ]}
            >
              <Text
                style={[
                  styles.folderChipText,
                  driveFolderId === folder.id ? styles.folderChipTextSelected : null
                ]}
              >
                {folder.name}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>メモ</Text>
        <TextInput
          multiline
          onChangeText={setMemo}
          style={[styles.input, styles.memo]}
          value={memo}
        />
      </View>
      {message ? <Text selectable style={styles.message}>{message}</Text> : null}
      <PrimaryButton disabled={saving} label={saving ? "保存中" : "変更を保存"} onPress={() => void save()} />
      <PrimaryButton label="削除" onPress={remove} variant="danger" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 8,
    backgroundColor: "#d8dee5"
  },
  panel: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d8dee5"
  },
  label: {
    color: "#25313d",
    fontWeight: "700"
  },
  input: {
    borderWidth: 1,
    borderColor: "#c8d0d8",
    borderRadius: 8,
    minHeight: 46,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    color: "#17212b"
  },
  memo: {
    minHeight: 80,
    paddingTop: 12,
    textAlignVertical: "top"
  },
  folderGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  folderChip: {
    borderWidth: 1,
    borderColor: "#b8c3ce",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: "#25313d",
    fontWeight: "700"
  },
  folderChipText: {
    color: "#25313d",
    fontWeight: "700"
  },
  folderChipTextSelected: {
    color: "#fff"
  },
  folderChipSelected: {
    color: "#fff",
    backgroundColor: "#1b5f8f",
    borderColor: "#1b5f8f"
  },
  message: {
    backgroundColor: "#300",
    color: "#fff",
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    padding: 10
  }
});

const formatUploadStatus = (status: Photo["uploadStatus"]): string => {
  switch (status) {
    case "local":
    case "queued":
      return "未同期";
    case "uploading":
      return "アップロード中";
    case "uploaded":
      return "同期済み";
    case "failed":
      return "エラー";
    case "target_missing":
      return "保存先不明";
    case "deleted":
      return "削除済み";
  }
};
