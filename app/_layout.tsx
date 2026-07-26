import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAppStore } from "@/store/appStore";

export default function RootLayout() {
  const { initialized, initializationError, initialize } = useAppStore();

  useEffect(() => {
    initialize().catch((error: unknown) => {
      console.error("Failed to initialize app", error);
    });
  }, [initialize]);

  if (!initialized) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>準備中</Text>
      </View>
    );
  }

  if (initializationError) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorTitle}>初期化できません</Text>
        <Text style={styles.errorText}>{initializationError}</Text>
      </View>
    );
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#f6f7f9" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: "#f6f7f9" }
        }}
      >
        <Stack.Screen name="index" options={{ title: "Lab Drive Camera" }} />
        <Stack.Screen name="camera" options={{ title: "撮影" }} />
        <Stack.Screen name="photo-review" options={{ title: "撮影後確認" }} />
        <Stack.Screen name="photos" options={{ title: "写真一覧" }} />
        <Stack.Screen name="photo/[id]" options={{ title: "写真詳細" }} />
        <Stack.Screen name="settings" options={{ title: "設定" }} />
        <Stack.Screen name="drive/folder-picker" options={{ title: "Drive保存先を選ぶ" }} />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#f6f7f9"
  },
  loadingText: {
    color: "#52606d"
  },
  errorTitle: {
    color: "#b3261e",
    fontSize: 18,
    fontWeight: "800"
  },
  errorText: {
    color: "#52606d",
    paddingHorizontal: 24,
    textAlign: "center"
  }
});
