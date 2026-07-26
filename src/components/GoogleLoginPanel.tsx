import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/PrimaryButton";
import {
  GOOGLE_SCOPES,
  getGoogleIosClientId,
  getGoogleWebClientId
} from "@/services/googleAuth/googleAuthConfig";
import { signInWithGoogleIdentityServices } from "@/services/googleAuth/googleIdentityWeb";
import { saveGoogleToken, toStoredGoogleToken } from "@/services/googleAuth/tokenStorage";

WebBrowser.maybeCompleteAuthSession();

type GoogleLoginPanelProps = {
  onSignedIn: () => Promise<void>;
};

export const GoogleLoginPanel = ({ onSignedIn }: GoogleLoginPanelProps) => {
  const iosClientId = getGoogleIosClientId();
  const webClientId = getGoogleWebClientId();

  if (Platform.OS === "web" && !webClientId) {
    return (
      <View style={styles.panel}>
        <Text style={styles.title}>Web用GoogleクライアントIDが必要です</Text>
        <Text style={styles.text}>
          ブラウザでGoogleログインを使うには、Google Cloud ConsoleでWebアプリ用OAuthクライアントIDを作成し、EXPO_PUBLIC_GOOGLE_WEB_CLIENT_IDへ設定してください。iPhone実機では、設定済みのiOSクライアントIDを使います。
        </Text>
      </View>
    );
  }

  if (Platform.OS !== "web" && !iosClientId) {
    return (
      <View style={styles.panel}>
        <Text style={styles.title}>Google設定が未設定です</Text>
        <Text style={styles.text}>EXPO_PUBLIC_GOOGLE_IOS_CLIENT_IDを設定してください。</Text>
      </View>
    );
  }

  if (Platform.OS === "web") {
    return (
      <GoogleLoginPanelWeb
        onSignedIn={onSignedIn}
        webClientId={webClientId ?? ""}
      />
    );
  }

  return (
    <GoogleLoginPanelNative
      iosClientId={iosClientId ?? undefined}
      onSignedIn={onSignedIn}
    />
  );
};

type GoogleLoginPanelNativeProps = {
  iosClientId?: string;
  onSignedIn: () => Promise<void>;
};

const GoogleLoginPanelNative = ({
  iosClientId,
  onSignedIn
}: GoogleLoginPanelNativeProps) => {
  const [message, setMessage] = useState<string | null>(null);
  const [, response, promptAsync] = Google.useAuthRequest({
    iosClientId,
    scopes: [...GOOGLE_SCOPES],
    selectAccount: true
  });

  useEffect(() => {
    if (response?.type !== "success") {
      return;
    }
    const authentication = response.authentication;
    if (!authentication?.accessToken) {
      setMessage("Google認証レスポンスからアクセストークンを取得できませんでした。");
      return;
    }
    void (async () => {
      await saveGoogleToken(
        toStoredGoogleToken(authentication.accessToken, authentication.expiresIn)
      );
      setMessage("Googleにログインしました。");
      await onSignedIn();
    })().catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : String(error));
    });
  }, [onSignedIn, response]);

  return (
    <View style={styles.panel}>
      <PrimaryButton label="Googleにログイン" onPress={() => void promptAsync()} />
      {message ? <Text style={styles.text}>{message}</Text> : null}
    </View>
  );
};

type GoogleLoginPanelWebProps = {
  webClientId: string;
  onSignedIn: () => Promise<void>;
};

const GoogleLoginPanelWeb = ({ webClientId, onSignedIn }: GoogleLoginPanelWebProps) => {
  const [message, setMessage] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const signIn = async (): Promise<void> => {
    setSigningIn(true);
    setMessage(null);
    try {
      await signInWithGoogleIdentityServices(webClientId);
      setMessage("Googleにログインしました。");
      await onSignedIn();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <View style={styles.panel}>
      <PrimaryButton
        disabled={signingIn}
        label={signingIn ? "ログイン中" : "Googleにログイン"}
        onPress={() => void signIn()}
      />
      <Text style={styles.note}>
        Web版はGoogle Identity Servicesのトークン方式を使うため、redirect_uriは送信しません。
      </Text>
      {message ? <Text style={styles.text}>{message}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d8dee5"
  },
  title: {
    color: "#17212b",
    fontSize: 16,
    fontWeight: "800"
  },
  text: {
    color: "#52606d",
    lineHeight: 20
  },
  note: {
    color: "#5f6b76",
    fontSize: 12,
    lineHeight: 18
  }
});
