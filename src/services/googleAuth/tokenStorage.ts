import * as SecureStore from "expo-secure-store";
import type { GoogleAuthState, StoredGoogleToken } from "@/types/auth";

const TOKEN_KEY = "lab-drive-camera:google-token";
const EXPIRY_SKEW_MS = 60_000;

let memoryToken: StoredGoogleToken | null = null;

export const saveGoogleToken = async (token: StoredGoogleToken): Promise<void> => {
  memoryToken = token;
  if (await SecureStore.isAvailableAsync()) {
    await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(token));
  }
};

export const loadGoogleToken = async (): Promise<StoredGoogleToken | null> => {
  if (memoryToken) {
    return memoryToken;
  }
  if (!(await SecureStore.isAvailableAsync())) {
    return null;
  }
  const raw = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!raw) {
    return null;
  }
  const parsed = parseStoredToken(JSON.parse(raw) as unknown);
  memoryToken = parsed;
  return parsed;
};

export const clearGoogleToken = async (): Promise<void> => {
  memoryToken = null;
  if (await SecureStore.isAvailableAsync()) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
};

export const getValidAccessToken = async (): Promise<string> => {
  const token = await loadGoogleToken();
  if (!token) {
    throw new Error("Googleにログインしてください。");
  }
  if (Date.now() + EXPIRY_SKEW_MS >= token.expiresAt) {
    await clearGoogleToken();
    throw new Error("Google認証の期限が切れました。再ログインしてください。");
  }
  return token.accessToken;
};

export const getGoogleAuthState = async (hasClientId: boolean): Promise<GoogleAuthState> => {
  if (!hasClientId) {
    return { status: "missing_client_id" };
  }
  const token = await loadGoogleToken();
  if (!token) {
    return { status: "signed_out" };
  }
  if (Date.now() + EXPIRY_SKEW_MS >= token.expiresAt) {
    return { status: "expired" };
  }
  return { status: "signed_in", expiresAt: token.expiresAt };
};

export const toStoredGoogleToken = (
  accessToken: string,
  expiresInSeconds: number | undefined
): StoredGoogleToken => ({
  accessToken,
  expiresAt: Date.now() + (expiresInSeconds ?? 3600) * 1000
});

const parseStoredToken = (value: unknown): StoredGoogleToken | null => {
  if (!isRecord(value)) {
    return null;
  }
  if (typeof value.accessToken !== "string" || typeof value.expiresAt !== "number") {
    return null;
  }
  return {
    accessToken: value.accessToken,
    expiresAt: value.expiresAt
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
