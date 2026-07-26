import { describe, expect, it } from "vitest";
import {
  createDefaultPhotoFileName,
  createUniqueFileName,
  sanitizeFileName,
  validatePhotographerCode
} from "@/domain/naming/photoFileName";

describe("photoFileName", () => {
  it("creates the default file name from folder, timestamp, and photographer", () => {
    const fileName = createDefaultPhotoFileName({
      folderName: "加振1回目",
      capturedAt: new Date(2026, 6, 26, 14, 35, 12),
      photographerCode: "kubota"
    });

    expect(fileName).toBe("加振1回目_20260726_143512_KUBOTA.jpg");
  });

  it("sanitizes invalid characters and keeps jpg extension", () => {
    expect(sanitizeFileName(' a / b : c  d " e.png ')).toBe("a_b_c_d_e.png.jpg");
  });

  it("validates photographer code", () => {
    expect(validatePhotographerCode("uchida_01")).toBe("UCHIDA_01");
    expect(() => validatePhotographerCode("内田")).toThrow(
      "撮影者コードはA-Z、0-9、-、_のみ使用できます。"
    );
  });

  it("adds a sequence suffix for duplicate names", () => {
    expect(createUniqueFileName("photo.jpg", ["photo.jpg", "photo_02.jpg"])).toBe(
      "photo_03.jpg"
    );
  });
});
