import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import { InfoRow } from "@/components/InfoRow";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { useAppStore } from "@/store/appStore";

export default function HomeScreen() {
  const { settings, localPhotoCount, refreshLocalPhotoCount } = useAppStore();

  useFocusEffect(
    useCallback(() => {
      refreshLocalPhotoCount().catch((error: unknown) => {
        console.error("Failed to refresh photo count", error);
      });
    }, [refreshLocalPhotoCount])
  );

  return (
    <Screen>
      <View style={styles.panel}>
        <Text style={styles.title}>ローカル撮影モード</Text>
        <Text style={styles.description}>
          写真はまずアプリ専用領域へ保存され、同期画面からGoogle Driveへアップロードできます。
        </Text>
      </View>

      <View style={styles.panel}>
        <InfoRow label="撮影者コード" value={settings?.photographerCode ?? "-"} />
        <InfoRow label="保存先フォルダ" value={settings?.targetFolderName ?? "-"} />
        <InfoRow label="Drive保存先" value={settings?.driveFolderName ?? "未設定"} />
        <InfoRow label="未同期写真" value={`${localPhotoCount}枚`} />
        <InfoRow label="最終同期" value="-" />
      </View>

      <PrimaryButton label="写真を撮る" onPress={() => router.push("/camera")} />
      <PrimaryButton
        label="保存先・撮影者を設定"
        variant="secondary"
        onPress={() => router.push("/settings")}
      />
      <PrimaryButton
        label="未同期写真を見る"
        variant="secondary"
        onPress={() => router.push("/photos")}
      />
      <PrimaryButton label="同期する" variant="secondary" onPress={() => router.push("/sync")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d8dee5"
  },
  title: {
    color: "#17212b",
    fontSize: 22,
    fontWeight: "800"
  },
  description: {
    color: "#52606d",
    fontSize: 14,
    lineHeight: 20
  }
});
