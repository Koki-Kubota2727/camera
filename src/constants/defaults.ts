export const DEFAULT_PHOTOGRAPHER_CODE = "KUBOTA";

export const LOCAL_FOLDER_OPTIONS = [
  "試験前",
  "センサ設置",
  "配線",
  "加振1回目",
  "加振2回目",
  "試験後"
] as const;

export const DEFAULT_TARGET_FOLDER = LOCAL_FOLDER_OPTIONS[0];
