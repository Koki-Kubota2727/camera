import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { GoogleLoginPanel } from "@/components/GoogleLoginPanel";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { getGoogleIosClientId, getGoogleWebClientId } from "@/services/googleAuth/googleAuthConfig";
import { getGoogleAuthState } from "@/services/googleAuth/tokenStorage";
import { listDriveFolders } from "@/services/googleDrive/driveApi";
import { useAppStore } from "@/store/appStore";
import type { GoogleAuthState } from "@/types/auth";

type Folder = {
  id: string;
  name: string;
  modifiedTime?: string;
  capabilities?: {
    canAddChildren?: boolean;
    canEdit?: boolean;
  };
};

type Breadcrumb = {
  id: string | null;
  name: string;
};

export default function DriveFolderPickerScreen() {
  const { settings, updateSettings } = useAppStore();
  const [current, setCurrent] = useState<Breadcrumb>({ id: null, name: "マイドライブ" });
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([
    { id: null, name: "マイドライブ" }
  ]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const hasAnyClientId = Boolean(getGoogleIosClientId() || getGoogleWebClientId());
  const [authState, setAuthState] = useState<GoogleAuthState>(
    hasAnyClientId ? { status: "signed_out" } : { status: "missing_client_id" }
  );

  const refreshAuth = useCallback(async (): Promise<GoogleAuthState> => {
    const nextAuthState = await getGoogleAuthState(hasAnyClientId);
    setAuthState(nextAuthState);
    return nextAuthState;
  }, [hasAnyClientId]);

  const load = useCallback(async (folder: Breadcrumb): Promise<void> => {
    setLoading(true);
    setMessage(null);
    try {
      const nextFolders = await listDriveFolders(folder.id);
      setFolders(nextFolders);
      if (nextFolders.length === 0) {
        setMessage("この中に表示できる子フォルダはありません。");
      }
    } catch (error: unknown) {
      const text = error instanceof Error ? error.message : String(error);
      setMessage(
        `${text}\n\ndrive.fileスコープでは、アプリに許可されていない既存フォルダが表示できない場合があります。`
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const nextAuthState = await refreshAuth();
        if (nextAuthState.status === "signed_in") {
          await load(current);
        }
      })().catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : String(error));
      });
    }, [current, load, refreshAuth])
  );

  const enterFolder = (folder: Folder): void => {
    const next = { id: folder.id, name: folder.name };
    setCurrent(next);
    setBreadcrumbs((items) => [...items, next]);
  };

  const goUp = (): void => {
    setBreadcrumbs((items) => {
      if (items.length <= 1) {
        return items;
      }
      const nextItems = items.slice(0, -1);
      setCurrent(nextItems[nextItems.length - 1]);
      return nextItems;
    });
  };

  const selectCurrentFolder = async (): Promise<void> => {
    if (!current.id) {
      Alert.alert("保存先を選べません", "マイドライブ直下は選択せず、保存用フォルダを開いてから選択してください。");
      return;
    }
    if (!settings) {
      return;
    }
    await updateSettings({
      ...settings,
      driveFolderId: current.id,
      driveFolderName: current.name
    });
    router.back();
  };

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <Text style={styles.label}>現在位置</Text>
        <Text numberOfLines={2} style={styles.path}>
          {breadcrumbs.map((item) => item.name).join(" / ")}
        </Text>
        <View style={styles.actions}>
          <PrimaryButton label="上へ" onPress={goUp} variant="secondary" disabled={breadcrumbs.length <= 1} />
          <PrimaryButton label="ここを保存先にする" onPress={() => void selectCurrentFolder()} />
        </View>
      </View>

      {authState.status === "signed_in" ? null : (
        <View style={styles.loginBlock}>
          <GoogleLoginPanel
            onSignedIn={async () => {
              await refreshAuth();
              await load(current);
            }}
          />
        </View>
      )}

      {message ? <Text style={styles.message}>{message}</Text> : null}
      {loading ? <ActivityIndicator style={styles.loading} /> : null}

      <FlatList
        contentContainerStyle={styles.listContent}
        data={folders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => enterFolder(item)} style={styles.folderRow}>
            <View style={styles.folderText}>
              <Text style={styles.folderName}>{item.name}</Text>
              <Text style={styles.folderMeta}>
                {item.capabilities?.canAddChildren === false ? "追加権限なし" : "追加可能"}
                {item.modifiedTime ? ` / ${new Date(item.modifiedTime).toLocaleString()}` : ""}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#d8dee5",
    padding: 16,
    gap: 10
  },
  label: {
    color: "#5f6b76",
    fontSize: 13,
    fontWeight: "700"
  },
  path: {
    color: "#17212b",
    fontSize: 18,
    fontWeight: "800"
  },
  actions: {
    gap: 8
  },
  loginBlock: {
    padding: 16
  },
  message: {
    color: "#7a4d00",
    padding: 16,
    lineHeight: 20,
    fontWeight: "700"
  },
  loading: {
    marginTop: 16
  },
  listContent: {
    padding: 16,
    gap: 8
  },
  folderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d8dee5"
  },
  folderText: {
    flex: 1,
    gap: 3
  },
  folderName: {
    color: "#17212b",
    fontSize: 16,
    fontWeight: "800"
  },
  folderMeta: {
    color: "#5f6b76",
    fontSize: 12
  },
  chevron: {
    color: "#5f6b76",
    fontSize: 28
  }
});
