import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { GoogleLoginPanel } from "@/components/GoogleLoginPanel";
import { InfoRow } from "@/components/InfoRow";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { getGoogleIosClientId, getGoogleWebClientId } from "@/services/googleAuth/googleAuthConfig";
import { clearGoogleToken, getGoogleAuthState } from "@/services/googleAuth/tokenStorage";
import { uploadPhotoToDrive } from "@/services/googleDrive/driveApi";
import {
  listUploadablePhotos,
  markPhotoUploaded,
  markPhotoUploadFailed,
  markPhotoTargetMissing,
  markPhotoUploading
} from "@/repositories/photoRepository";
import { useAppStore } from "@/store/appStore";
import type { GoogleAuthState } from "@/types/auth";
import { formatDebugError } from "@/utils/debugError";

export default function SyncScreen() {
  const refreshLocalPhotoCount = useAppStore((state) => state.refreshLocalPhotoCount);
  const hasAnyClientId = Boolean(getGoogleIosClientId() || getGoogleWebClientId());
  const [authState, setAuthState] = useState<GoogleAuthState>(
    hasAnyClientId ? { status: "signed_out" } : { status: "missing_client_id" }
  );
  const [syncing, setSyncing] = useState(false);
  const [summary, setSummary] = useState({ pending: 0, uploaded: 0, failed: 0 });
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    const nextAuthState = await getGoogleAuthState(hasAnyClientId);
    const uploadable = await listUploadablePhotos();
    setAuthState(nextAuthState);
    setSummary((current) => ({ ...current, pending: uploadable.length }));
  }, [hasAnyClientId]);

  useEffect(() => {
    refresh().catch((error: unknown) => {
      setMessage(formatDebugError("sync screen refresh", error));
    });
  }, [refresh]);

  const signOut = async (): Promise<void> => {
    await clearGoogleToken();
    setAuthState({ status: "signed_out" });
    setMessage("Googleからログアウトしました。");
  };

  const uploadAll = async (): Promise<void> => {
    setSyncing(true);
    setMessage(null);
    let uploaded = 0;
    let failed = 0;
    let lastErrorMessage: string | null = null;
    try {
      const photos = await listUploadablePhotos();
      for (const photo of photos) {
        try {
          if (!photo.driveFolderId) {
            await markPhotoTargetMissing(photo.id);
            failed += 1;
            setSummary({ pending: photos.length - uploaded - failed, uploaded, failed });
            lastErrorMessage = `保存先未指定: ${photo.currentFileName}\n写真詳細でDrive保存先を選んでから再同期してください。`;
            setMessage(lastErrorMessage);
            continue;
          }
          await markPhotoUploading(photo.id);
          const result = await uploadPhotoToDrive(photo, photo.driveFolderId);
          await markPhotoUploaded(photo.id, result.driveFileId);
          uploaded += 1;
          setSummary({ pending: photos.length - uploaded - failed, uploaded, failed });
        } catch (error: unknown) {
          await markPhotoUploadFailed(photo.id);
          failed += 1;
          setSummary({ pending: photos.length - uploaded - failed, uploaded, failed });
          const messageText = formatDebugError(`upload photo ${photo.id}`, error);
          lastErrorMessage = messageText;
          setMessage(messageText);
          if (messageText.includes("再ログイン")) {
            break;
          }
        }
      }
      await refreshLocalPhotoCount();
      await refresh();
      setMessage(
        lastErrorMessage
          ? `アップロード完了: 成功 ${uploaded}件 / 失敗 ${failed}件\n\n${lastErrorMessage}`
          : `アップロード完了: 成功 ${uploaded}件 / 失敗 ${failed}件`
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Screen>
      <View style={styles.panel}>
        <InfoRow label="Google認証" value={formatAuthState(authState)} />
        <InfoRow label="Drive保存先" value="写真ごとの指定" />
        <InfoRow label="未同期件数" value={`${summary.pending}件`} />
        <InfoRow label="成功" value={`${summary.uploaded}件`} />
        <InfoRow label="失敗" value={`${summary.failed}件`} />
      </View>

      {message ? <Text selectable style={styles.message}>{message}</Text> : null}

      {authState.status === "signed_in" ? null : <GoogleLoginPanel onSignedIn={refresh} />}
      <PrimaryButton
        disabled={syncing || authState.status !== "signed_in"}
        label={syncing ? "アップロード中" : "すべてアップロード"}
        onPress={() => void uploadAll()}
      />
      <PrimaryButton label="Googleログアウト" onPress={() => void signOut()} variant="secondary" />
    </Screen>
  );
}

const formatAuthState = (state: GoogleAuthState): string => {
  switch (state.status) {
    case "missing_client_id":
      return "クライアントID未設定";
    case "signed_in":
      return "ログイン済み";
    case "expired":
      return "期限切れ";
    case "signed_out":
      return "未ログイン";
  }
};

const styles = StyleSheet.create({
  panel: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d8dee5"
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
