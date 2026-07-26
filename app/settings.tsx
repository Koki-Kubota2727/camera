import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LOCAL_FOLDER_OPTIONS } from "@/constants/defaults";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { validatePhotographerCode } from "@/domain/naming/photoFileName";
import { useAppStore } from "@/store/appStore";

export default function SettingsScreen() {
  const { settings, updateSettings } = useAppStore();
  const [photographerCode, setPhotographerCode] = useState(settings?.photographerCode ?? "");
  const [targetFolderName, setTargetFolderName] = useState(settings?.targetFolderName ?? "");

  const save = async (): Promise<void> => {
    try {
      const code = validatePhotographerCode(photographerCode);
      const folderName = targetFolderName.trim();
      if (!folderName) {
        throw new Error("保存先フォルダを選択してください。");
      }
      await updateSettings({
        photographerCode: code,
        targetFolderId: `local:${folderName}`,
        targetFolderName: folderName,
        driveFolderId: settings?.driveFolderId ?? null,
        driveFolderName: settings?.driveFolderName ?? null,
        driveParentFolderId: settings?.driveParentFolderId ?? null,
        driveParentFolderName: settings?.driveParentFolderName ?? null
      });
      router.back();
    } catch (error: unknown) {
      Alert.alert("設定を保存できません", error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <Screen>
      <View style={styles.panel}>
        <Text style={styles.label}>撮影者コード</Text>
        <TextInput
          autoCapitalize="characters"
          onChangeText={setPhotographerCode}
          placeholder="KUBOTA"
          style={styles.input}
          value={photographerCode}
        />
      </View>

      <View style={styles.panel}>
        <Text style={styles.label}>仮の保存先フォルダ</Text>
        <View style={styles.folderGrid}>
          {LOCAL_FOLDER_OPTIONS.map((folder) => (
            <Pressable
              key={folder}
              onPress={() => setTargetFolderName(folder)}
              style={[
                styles.folderChip,
                targetFolderName === folder ? styles.folderChipSelected : null
              ]}
            >
              <Text
                style={[
                  styles.folderChipText,
                  targetFolderName === folder ? styles.folderChipTextSelected : null
                ]}
              >
                {folder}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          onChangeText={setTargetFolderName}
          placeholder="任意のフォルダ名"
          style={styles.input}
          value={targetFolderName}
        />
      </View>

      <View style={styles.panel}>
        <Text style={styles.label}>Google Drive親フォルダ</Text>
        <Text style={styles.driveFolderName}>
          {settings?.driveParentFolderName ?? "未選択"}
        </Text>
        <Text style={styles.helpText}>
          保存先候補を並べるための親フォルダをGoogle Driveから選んでください。
        </Text>
        <PrimaryButton
          label="親フォルダを選ぶ"
          onPress={() => router.push({ pathname: "/drive/folder-picker", params: { mode: "parent" } })}
          variant="secondary"
        />
      </View>

      <View style={styles.panel}>
        <Text style={styles.label}>Google Drive保存先候補</Text>
        <Text style={styles.driveFolderName}>
          {settings?.driveFolderName ?? "未選択"}
        </Text>
        <Text style={styles.helpText}>
          親フォルダ直下の子フォルダから、実際のアップロード先を選びます。
        </Text>
        <PrimaryButton
          label="候補から保存先を選ぶ"
          onPress={() => router.push({ pathname: "/drive/folder-picker", params: { mode: "target" } })}
          variant="secondary"
        />
      </View>

      <PrimaryButton label="保存" onPress={() => void save()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 15,
    fontWeight: "700"
  },
  input: {
    borderWidth: 1,
    borderColor: "#c8d0d8",
    borderRadius: 8,
    minHeight: 46,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    color: "#17212b",
    fontSize: 16
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
    paddingVertical: 9
  },
  folderChipSelected: {
    backgroundColor: "#1b5f8f",
    borderColor: "#1b5f8f"
  },
  folderChipText: {
    color: "#25313d",
    fontWeight: "700"
  },
  folderChipTextSelected: {
    color: "#fff"
  },
  helpText: {
    color: "#5f6b76",
    fontSize: 13,
    lineHeight: 18
  },
  driveFolderName: {
    color: "#17212b",
    fontSize: 17,
    fontWeight: "800"
  }
});
