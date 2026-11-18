import sharp from "sharp";
import { createRandom, type Random } from "./random";

/**
 * Abstrakte Bilder für Demo-Profile und -Organisationen (Entscheid 0023): weiche
 * Verläufe, Formen und Körnung, nie Personen. Deterministisch pro Schlüssel.
 * Hochformat 4:5 wie Profilfotos; Logos quadratisch.
 */
interface Palette {
  /** Für den Alternativtext, zum Beispiel «warmen Rosé- und Sandtönen». */
  label: string;
  colors: readonly [string, string, string, string];
}

const PALETTES: readonly Palette[] = [
  { label: "warmen Rosé- und Sandtönen", colors: ["#e8c4b8", "#c98f86", "#f3e3d3", "#8c5a5a"] },
  { label: "kühlen Blau- und Petroltönen", colors: ["#1f4e5f", "#3c8d93", "#a7d3d4", "#0d2a3a"] },
  { label: "Bernstein und Terrakotta", colors: ["#d9893b", "#a8502f", "#f2c98a", "#5e2c1f"] },
  { label: "Salbei- und Moosgrün", colors: ["#a3b18a", "#588157", "#dad7cd", "#344e41"] },
  { label: "Violett und Pflaume", colors: ["#6d4c7d", "#a5729b", "#e3c6d9", "#2f1e3b"] },
  { label: "Nachtblau mit Kupfer", colors: ["#1b2640", "#b87333", "#41537a", "#e6b98a"] },
  { label: "Pfirsich und Koralle", colors: ["#ffb4a2", "#e5989b", "#ffcdb2", "#b5838d"] },
  { label: "Grautönen mit Gold", colors: ["#4a4e57", "#c9a227", "#9aa0a8", "#1e2026"] },
  { label: "Ozeanblau und Türkis", colors: ["#03396c", "#20a39e", "#bfe6e3", "#011f4b"] },
  { label: "Weinrot und Creme", colors: ["#6a1e2d", "#b5485d", "#f4e1d2", "#3b0f1a"] },
];

type Motif = "blobs" | "waves" | "rings" | "arcs";

const MOTIF_LABEL: Record<Motif, string> = {
  blobs: "weiche, verschwommene Farbflächen",
  waves: "geschwungene Farbbänder",
  rings: "konzentrische Kreise",
  arcs: "sich überlagernde Bögen",
};

const MOTIFS: readonly Motif[] = ["blobs", "waves", "rings", "arcs"];

export interface DemoImage {
  body: Uint8Array;
  width: number;
  height: number;
  altText: string;
}

function blobs(random: Random, palette: Palette, width: number, height: number): string {
  const count = random.int(4, 7);
  const shapes: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const color = random.pick(palette.colors);
    const cx = random.int(0, width);
    const cy = random.int(0, height);
    const rx = random.int(width / 6, width / 2);
    const ry = random.int(height / 8, height / 3);
    shapes.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${color}" opacity="${(0.5 + random.next() * 0.4).toFixed(2)}"/>`);
  }
  return `<g filter="url(#soft)">${shapes.join("")}</g>`;
}

function waves(random: Random, palette: Palette, width: number, height: number): string {
  const bands: string[] = [];
  const count = random.int(4, 6);
  for (let index = 0; index < count; index += 1) {
    const y = Math.round((height / (count + 1)) * (index + 1) + random.int(-60, 60));
    const amplitude = random.int(80, 220);
    const path = `M -50 ${y} C ${width * 0.3} ${y - amplitude}, ${width * 0.6} ${y + amplitude}, ${width + 50} ${y - random.int(-80, 80)} L ${width + 50} ${height + 50} L -50 ${height + 50} Z`;
    bands.push(`<path d="${path}" fill="${random.pick(palette.colors)}" opacity="${(0.35 + random.next() * 0.35).toFixed(2)}"/>`);
  }
  return `<g filter="url(#light)">${bands.join("")}</g>`;
}

function rings(random: Random, palette: Palette, width: number, height: number): string {
  const cx = random.int(width * 0.25, width * 0.75);
  const cy = random.int(height * 0.3, height * 0.7);
  const circles: string[] = [];
  const count = random.int(6, 10);
  for (let index = count; index > 0; index -= 1) {
    const radius = Math.round((Math.max(width, height) / count) * index * 0.9);
    circles.push(`<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${palette.colors[index % 4]}" opacity="0.55"/>`);
  }
  return `<g filter="url(#light)">${circles.join("")}</g>`;
}

function arcs(random: Random, palette: Palette, width: number, height: number): string {
  const shapes: string[] = [];
  const count = random.int(3, 5);
  for (let index = 0; index < count; index += 1) {
    const radius = random.int(width / 3, width);
    const cx = random.pick([0, width]);
    const cy = random.int(0, height);
    const stroke = random.int(60, 160);
    shapes.push(`<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${random.pick(palette.colors)}" stroke-width="${stroke}" opacity="0.6"/>`);
  }
  return `<g filter="url(#light)">${shapes.join("")}</g>`;
}

const DRAW: Record<Motif, typeof blobs> = { blobs, waves, rings, arcs };

function svg(random: Random, palette: Palette, motif: Motif, width: number, height: number): string {
  const [first, second] = random.next() > 0.5 ? [palette.colors[0], palette.colors[2]] : [palette.colors[3], palette.colors[1]];
  const angle = random.int(0, 3);
  const direction = [`x1="0" y1="0" x2="1" y2="1"`, `x1="1" y1="0" x2="0" y2="1"`, `x1="0" y1="0" x2="0" y2="1"`, `x1="0" y1="1" x2="1" y2="0"`][angle];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>
<linearGradient id="bg" ${direction}><stop offset="0" stop-color="${first}"/><stop offset="1" stop-color="${second}"/></linearGradient>
<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${random.int(70, 120)}"/></filter>
<filter id="light" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${random.int(6, 24)}"/></filter>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
</defs>
<rect width="100%" height="100%" fill="url(#bg)"/>
${DRAW[motif](random, palette, width, height)}
<rect width="100%" height="100%" filter="url(#grain)" opacity="0.07"/>
</svg>`;
}

/** Ein abstraktes JPEG für `key`; `shape` «portrait» ergibt 1280×1600, «square» 1024×1024. */
export async function demoImage(key: string, shape: "portrait" | "square" = "portrait"): Promise<DemoImage> {
  const random = createRandom(`image:${key}`);
  const palette = random.pick(PALETTES);
  const motif = random.pick(MOTIFS);
  const [width, height] = shape === "portrait" ? [1280, 1600] : [1024, 1024];
  const body = await sharp(Buffer.from(svg(random, palette, motif, width, height)))
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
  return {
    body: new Uint8Array(body),
    width,
    height,
    altText: `Abstraktes Bild: ${MOTIF_LABEL[motif]} in ${palette.label}`,
  };
}
