import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { processChatImage } from "./process-chat-image";

async function jpegWithGps(width: number, height: number): Promise<Uint8Array> {
  const buffer = await sharp({
    create: { width, height, channels: 3, background: "#806040" },
  })
    .jpeg()
    .withExif({
      IFD0: { Make: "Fiktiv" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "47/1 22/1 0/1" },
    })
    .toBuffer();
  return new Uint8Array(buffer);
}

describe("Chat-Bild", { timeout: 30_000 }, () => {
  it("entfernt EXIF und GPS, verkleinert auf 1600 px und liefert WebP", async () => {
    const input = await jpegWithGps(2400, 1200);
    expect((await sharp(input).metadata()).exif).toBeDefined();
    const result = await processChatImage(input);
    if (!result.ok) throw new Error(result.reason);
    const meta = await sharp(result.body).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
    expect([result.width, result.height]).toEqual([1600, 800]);
  });

  it("lehnt Text als Bild und unlesbare Dateien ab", async () => {
    expect(
      await processChatImage(new TextEncoder().encode("kein Bild")),
    ).toEqual({ ok: false, reason: "unsupported-type" });
  });
});
