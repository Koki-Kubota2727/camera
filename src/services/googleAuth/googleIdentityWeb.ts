import { getGoogleScopeText } from "@/services/googleAuth/googleAuthConfig";
import { saveGoogleToken, toStoredGoogleToken } from "@/services/googleAuth/tokenStorage";

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type GoogleTokenClient = {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
};

type GoogleAccounts = {
  oauth2: {
    initTokenClient: (config: {
      client_id: string;
      scope: string;
      callback: (response: GoogleTokenResponse) => void;
      error_callback?: (error: unknown) => void;
    }) => GoogleTokenClient;
  };
};

declare global {
  interface Window {
    google?: {
      accounts?: GoogleAccounts;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

export const signInWithGoogleIdentityServices = async (
  clientId: string
): Promise<void> => {
  await loadGoogleIdentityScript();

  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) {
    throw new Error("Google Identity Servicesを初期化できませんでした。");
  }

  const response = await new Promise<GoogleTokenResponse>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: getGoogleScopeText(),
      callback: resolve,
      error_callback: reject
    });
    client.requestAccessToken({ prompt: "consent" });
  });

  if (response.error) {
    throw new Error(response.error_description ?? response.error);
  }
  if (!response.access_token) {
    throw new Error("Google認証レスポンスからアクセストークンを取得できませんでした。");
  }

  await saveGoogleToken(toStoredGoogleToken(response.access_token, response.expires_in));
};

const loadGoogleIdentityScript = async (): Promise<void> => {
  if (window.google?.accounts?.oauth2) {
    return;
  }
  scriptPromise ??= new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-google-identity-services]"
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google Identity Servicesの読み込みに失敗しました。")), {
        once: true
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentityServices = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Identity Servicesの読み込みに失敗しました。"));
    document.head.appendChild(script);
  });

  await scriptPromise;
};
