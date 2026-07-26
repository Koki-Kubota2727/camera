export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.file"
] as const;

export const getGoogleIosClientId = (): string | null => {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  return clientId && clientId.length > 0 ? clientId : null;
};

export const getGoogleWebClientId = (): string | null => {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  return clientId && clientId.length > 0 ? clientId : null;
};
