import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { GoogleLoginPanel } from "@/components/GoogleLoginPanel";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { getGoogleIosClientId, getGoogleWebClientId } from "@/services/googleAuth/googleAuthConfig";
import { getGoogleAuthState } from "@/services/googleAuth/tokenStorage";
import { createDriveFolder, listDriveFolders } from "@/services/googleDrive/driveApi";
import { useAppStore } from "@/store/appStore";
import type { GoogleAuthState } from "@/types/auth";
import { formatDebugError } from "@/utils/debugError";

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

type PickerMode = "parent" | "target";

export default function DriveFolderPickerScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const { settings, updateSettings } = useAppStore();
  const pickerMode: PickerMode = params.mode === "parent" ? "parent" : "target";
  const initialFolder =
    pickerMode === "target" && settings?.driveParentFolderId
      ? {
          id: settings.driveParentFolderId,
          name: settings.driveParentFolderName ?? "親フォルダ"
        }
      : { id: null, name: "マイドライブ" };
  const [current, setCurrent] = useState<Breadcrumb>(initialFolder);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([initialFolder]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
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
      setMessage(
        `${formatDebugError("drive folder list", error)}\n\ndrive.fileスコープでは、アプリに許可されていない既存フォルダが表示できない場合があります。`
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
        setMessage(formatDebugError("drive folder picker focus", error));
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
      Alert.alert(
        "フォルダを選べません",
        "マイドライブ直下は選択せず、対象のフォルダを開いてから選択してください。"
      );
      return;
    }
    if (!settings) {
      return;
    }
    if (pickerMode === "parent") {
      await updateSettings({
        ...settings,
        driveParentFolderId: current.id,
        driveParentFolderName: current.name,
        driveFolderId: null,
        driveFolderName: null
      });
    } else {
      await updateSettings({
        ...settings,
        driveFolderId: current.id,
        driveFolderName: current.name
      });
    }
    router.back();
  };

  const createFolderAndSelect = async (): Promise<void> => {
    if (pickerMode !== "target") {
      return;
    }
    if (!current.id) {
      Alert.alert("フォルダを作成できません", "親フォルダを開いてから作成してください。");
      return;
    }
    if (!settings) {
      return;
    }

    setCreating(true);
    setMessage(null);
    try {
      const created = await createDriveFolder(current.id, newFolderName);
      setFolders((items) => [created, ...items]);
      setNewFolderName("");
      await updateSettings({
        ...settings,
        driveFolderId: created.id,
        driveFolderName: created.name
      });
      router.back();
    } catch (error: unknown) {
      setMessage(formatDebugError("drive folder create", error));
    } finally {
      setCreating(false);
    }
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
          <PrimaryButton label={pickerMode === "parent" ? "ここを親フォルダにする" : "ここを保存先にする"} onPress={() => void selectCurrentFolder()} />
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

      {pickerMode === "target" && settings?.driveParentFolderName ? (
        <Text style={styles.hint}>
          {settings.driveParentFolderName} の子フォルダを保存先候補として表示しています。
        </Text>
      ) : null}
      {pickerMode === "target" && authState.status === "signed_in" ? (
        <View style={styles.createPanel}>
          <Text style={styles.label}>新しい子フォルダ</Text>
          <TextInput
            onChangeText={setNewFolderName}
            placeholder="例: A班_202607"
            style={styles.input}
            value={newFolderName}
          />
          <PrimaryButton
            disabled={creating || !newFolderName.trim()}
            label={creating ? "作成中" : "作成して保存先にする"}
            onPress={() => void createFolderAndSelect()}
          />
        </View>
      ) : null}
      {message ? <Text selectable style={styles.message}>{message}</Text> : null}
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
  hint: {
    color: "#25313d",
    paddingHorizontal: 16,
    paddingTop: 12,
    fontSize: 13,
    fontWeight: "700"
  },
  createPanel: {
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#d8dee5",
    padding: 16,
    gap: 10
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
  message: {
    backgroundColor: "#300",
    color: "#fff",
    fontFamily: "monospace",
    padding: 16,
    lineHeight: 16,
    fontSize: 12,
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
