export type StoredGoogleToken = {
  accessToken: string;
  expiresAt: number;
};

export type GoogleAuthState =
  | { status: "missing_client_id" }
  | { status: "signed_out" }
  | { status: "signed_in"; expiresAt: number }
  | { status: "expired" };
