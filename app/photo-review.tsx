import { router, useLocalSearchParams } from "expo-router";
import { randomUUID } from "expo-crypto";
import { useMemo, useState } from "react";
import { Alert, Image, StyleSheet, Text, TextInput, View } from "react-native";
import { InfoRow } from "@/components/InfoRow";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import {
  createDefaultPhotoFileName,
  createUniqueFileName,
  sanitizeFileName
} from "@/domain/naming/photoFileName";
import { listCurrentFileNames, insertPhoto } from "@/repositories/photoRepository";
import { persistCapturedPhoto } from "@/services/filesystem/photoFileSystem";
import { useAppStore } from "@/store/appStore";

export default function PhotoReviewScreen() {
  const { uri } = useLocalSearchParams<{ uri?: string }>();
  const settings = useAppStore((state) => state.settings);
  const refreshLocalPhotoCount = useAppStore((state) => state.refreshLocalPhotoCount);
  const capturedAt = useMemo(() => new Date(), []);
  const defaultName = useMemo(() => {
    if (!settings) {
      return "photo.jpg";
    }
    return createDefaultPhotoFileName({
      folderName: settings.targetFolderName,
      capturedAt,
      photographerCode: settings.photographerCode
    });
  }, [capturedAt, settings]);
  const [fileName, setFileName] = useState(defaultName);
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const save = async (): Promise<void> => {
    if (!uri || !settings) {
      Alert.alert("保存できません", "撮影データまたは設定が見つかりません。");
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      const photoId = randomUUID();
      const existingNames = await listCurrentFileNames();
      const currentFileName = createUniqueFileName(sanitizeFileName(fileName), existingNames);
      const persisted = await persistCapturedPhoto(uri, photoId);
      await insertPhoto({
        id: photoId,
        localUri: persisted.localUri,
        targetFolderId: settings.targetFolderId,
        targetFolderNameCache: settings.targetFolderName,
        photographerCode: settings.photographerCode,
        capturedAt: capturedAt.toISOString(),
        defaultFileName: defaultName,
        currentFileName,
        memo: memo.trim() ? memo.trim() : null,
        fileSize: persisted.fileSize
      });
      await refreshLocalPhotoCount();
      router.replace("/photos");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(message);
      Alert.alert("保存できません", message);
    } finally {
      setSaving(false);
    }
  };

  if (!uri) {
    return (
      <Screen>
        <Text>撮影データが見つかりません。</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Image source={{ uri }} style={styles.preview} resizeMode="cover" />
      <View style={styles.panel}>
        <InfoRow label="保存先" value={settings?.targetFolderName ?? "-"} />
        <InfoRow label="撮影者" value={settings?.photographerCode ?? "-"} />
        <InfoRow label="撮影日時" value={capturedAt.toLocaleString()} />
      </View>
      <View style={styles.panel}>
        <Text style={styles.label}>ファイル名</Text>
        <TextInput onChangeText={setFileName} style={styles.input} value={fileName} />
        <Text style={styles.label}>メモ</Text>
        <TextInput
          multiline
          onChangeText={setMemo}
          placeholder="任意"
          style={[styles.input, styles.memo]}
          value={memo}
        />
      </View>
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      <PrimaryButton disabled={saving} label={saving ? "保存中" : "この名前で保存"} onPress={() => void save()} />
      <PrimaryButton label="撮り直す" onPress={() => router.back()} variant="secondary" />
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
  errorText: {
    color: "#b3261e",
    fontWeight: "700"
  }
});
