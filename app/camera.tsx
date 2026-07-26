import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { useAppStore } from "@/store/appStore";

type CameraRef = React.ElementRef<typeof CameraView>;

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraRef | null>(null);
  const [taking, setTaking] = useState(false);
  const settings = useAppStore((state) => state.settings);

  const takePhoto = async (): Promise<void> => {
    if (!cameraRef.current) {
      return;
    }
    setTaking(true);
    try {
      const result = await cameraRef.current.takePictureAsync({ quality: 0.92 });
      if (!result?.uri) {
        throw new Error("撮影画像を取得できませんでした。");
      }
      router.push({ pathname: "/photo-review", params: { uri: result.uri } });
    } catch (error: unknown) {
      Alert.alert("撮影できません", error instanceof Error ? error.message : String(error));
    } finally {
      setTaking(false);
    }
  };

  if (!permission) {
    return (
      <Screen>
        <Text>カメラ権限を確認しています。</Text>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen>
        <View style={styles.permissionPanel}>
          <Text style={styles.permissionTitle}>カメラ権限が必要です</Text>
          <Text style={styles.permissionText}>
            実験写真をアプリ内に保存するため、カメラの使用を許可してください。
          </Text>
          <PrimaryButton label="カメラを許可" onPress={() => void requestPermission()} />
        </View>
      </Screen>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView ref={cameraRef} facing="back" style={styles.camera} />
      <View style={styles.topBar}>
        <Text style={styles.metaLabel}>保存先</Text>
        <Text numberOfLines={1} style={styles.metaValue}>
          {settings?.targetFolderName ?? "-"}
        </Text>
        <Text style={styles.code}>{settings?.photographerCode ?? "-"}</Text>
      </View>
      <View style={styles.bottomBar}>
        <PrimaryButton
          label="保存先変更"
          onPress={() => router.push("/settings")}
          variant="secondary"
        />
        <PrimaryButton
          disabled={taking}
          label={taking ? "撮影中" : "撮影"}
          onPress={() => void takePhoto()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000"
  },
  camera: {
    flex: 1
  },
  topBar: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: "rgba(10, 16, 22, 0.78)",
    borderRadius: 8,
    padding: 12,
    gap: 4
  },
  metaLabel: {
    color: "#c6d2dd",
    fontSize: 12
  },
  metaValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800"
  },
  code: {
    color: "#e8edf2",
    fontSize: 13,
    fontWeight: "700"
  },
  bottomBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    gap: 10
  },
  permissionPanel: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    gap: 12
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#17212b"
  },
  permissionText: {
    color: "#52606d",
    lineHeight: 20
  }
});
