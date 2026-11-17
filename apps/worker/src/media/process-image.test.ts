import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { processImage } from "./process-image";

/** Fiktives Testbild: 1600 × 900, Orientierung 6 (um 90° gedreht) und GPS-Koordinaten in EXIF. */
async function jpegWithGps(): Promise<Uint8Array> {
  const buffer = await sharp({ create: { width: 1600, height: 900, channels: 3, background: { r: 122, g: 106, b: 92 } } })
    .withMetadata({ orientation: 6 })
    .withExif({ IFD0: { Make: "Fiktiv" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "47/1 22/1 0/1", GPSLongitudeRef: "E", GPSLongitude: "8/1 32/1 0/1", GPSMapDatum: "FIKTIV-GPS" } })
    .jpeg()
    .toBuffer();
  return new Uint8Array(buffer);
}

describe("Verarbeitung eines Bilds", () => {
  it("entfernt EXIF und GPS nachweislich aus jeder Variante und dem Original", async () => {
    const input = await jpegWithGps();
    const before = await sharp(input).metadata();
    expect(before.exif?.toString("latin1")).toContain("FIKTIV-GPS");
    expect(Buffer.from(input).includes(Buffer.from("FIKTIV-GPS"))).toBe(true);

    const result = await processImage(input);
    if (!result.ok) throw new Error(result.reason);
    const { image } = result;
    expect(image.variants).toHaveLength(8);
    for (const output of [...image.variants.map((variant) => variant.body), image.sanitized.body]) {
      const metadata = await sharp(output).metadata();
      expect(metadata.exif).toBeUndefined();
      expect(metadata.xmp).toBeUndefined();
      expect(metadata.iptc).toBeUndefined();
      expect(metadata.orientation ?? 1).toBe(1);
      expect(Buffer.from(output).includes(Buffer.from("FIKTIV-GPS"))).toBe(false);
      expect(Buffer.from(output).includes(Buffer.from("Fiktiv"))).toBe(false);
    }
  });

  it("dreht nach der EXIF-Orientierung, skaliert nie hoch und nennt die dominante Farbe", async () => {
    const result = await processImage(await jpegWithGps());
    if (!result.ok) throw new Error(result.reason);
    const { image } = result;
    expect([image.width, image.height]).toEqual([900, 1600]);
    expect(image.dominantColor).toMatch(/^#[0-9a-f]{6}$/);
    const byName = Object.fromEntries(image.variants.map((variant) => [variant.name, variant]));
    expect(byName["w320.avif"]).toMatchObject({ width: 320, height: 569 });
    expect(byName["w640.webp"]).toMatchObject({ width: 640 });
    expect(byName["w1440.webp"]).toMatchObject({ width: 900, height: 1600 });
    expect(image.detectedType).toBe("image/jpeg");
    expect(image.sanitized.contentType).toBe("image/jpeg");
  });

  it("prüft den Typ am Inhalt: Text mit Bildendung, GIF und kaputte Bilder werden abgelehnt", async () => {
    expect(await processImage(new TextEncoder().encode("Dies ist kein Bild, nur fiktiver Text."))).toEqual({ ok: false, reason: "unsupported-type" });
    const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#000" } }).gif().toBuffer();
    expect(await processImage(new Uint8Array(gif))).toEqual({ ok: false, reason: "unsupported-type" });
    const png = await sharp({ create: { width: 400, height: 400, channels: 3, background: "#123456" } }).png().toBuffer();
    expect(await processImage(new Uint8Array(png.subarray(0, 120)))).toEqual({ ok: false, reason: "unreadable" });
    const ok = await processImage(new Uint8Array(png));
    expect(ok.ok && ok.image.sanitized.contentType).toBe("image/png");
  });
});
