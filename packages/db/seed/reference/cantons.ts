/** Referenzdaten: die 26 Kantone der Schweiz. Reale Geografie, keine fiktiven Inhalte. */
export interface RegionSeed {
  slug: string;
  nameDe: string;
  nameFr: string;
  nameIt: string;
  nameEn: string;
  /** Ortsmittelpunkt für den Umkreis der Suche: Kantonshauptort oder Stadtzentrum, gerundet. */
  latitude: number;
  longitude: number;
}

const CAPITALS: Record<string, [number, number]> = {
  zuerich: [47.3769, 8.5417],
  bern: [46.948, 7.4474],
  luzern: [47.0502, 8.3093],
  uri: [46.8804, 8.6444],
  schwyz: [47.0207, 8.653],
  obwalden: [46.896, 8.2461],
  nidwalden: [46.958, 8.366],
  glarus: [47.0404, 9.068],
  zug: [47.1662, 8.5155],
  freiburg: [46.8065, 7.162],
  solothurn: [47.2088, 7.5323],
  "basel-stadt": [47.5596, 7.5886],
  "basel-landschaft": [47.484, 7.735],
  schaffhausen: [47.696, 8.634],
  "appenzell-ausserrhoden": [47.386, 9.279],
  "appenzell-innerrhoden": [47.331, 9.409],
  "st-gallen": [47.4245, 9.3767],
  graubuenden: [46.8508, 9.532],
  aargau: [47.3925, 8.0442],
  thurgau: [47.556, 8.898],
  tessin: [46.195, 9.024],
  waadt: [46.5197, 6.6323],
  wallis: [46.233, 7.36],
  neuenburg: [46.99, 6.9293],
  genf: [46.2044, 6.1432],
  jura: [47.365, 7.344],
};

function canton(
  slug: string,
  nameDe: string,
  nameFr: string,
  nameIt: string,
  nameEn: string,
): RegionSeed {
  const [latitude, longitude] = CAPITALS[slug] ?? [0, 0];
  return { slug, nameDe, nameFr, nameIt, nameEn, latitude, longitude };
}

export const cantons: RegionSeed[] = [
  canton("zuerich", "Zürich", "Zurich", "Zurigo", "Zurich"),
  canton("bern", "Bern", "Berne", "Berna", "Bern"),
  canton("luzern", "Luzern", "Lucerne", "Lucerna", "Lucerne"),
  canton("uri", "Uri", "Uri", "Uri", "Uri"),
  canton("schwyz", "Schwyz", "Schwytz", "Svitto", "Schwyz"),
  canton("obwalden", "Obwalden", "Obwald", "Obvaldo", "Obwalden"),
  canton("nidwalden", "Nidwalden", "Nidwald", "Nidvaldo", "Nidwalden"),
  canton("glarus", "Glarus", "Glaris", "Glarona", "Glarus"),
  canton("zug", "Zug", "Zoug", "Zugo", "Zug"),
  canton("freiburg", "Freiburg", "Fribourg", "Friburgo", "Fribourg"),
  canton("solothurn", "Solothurn", "Soleure", "Soletta", "Solothurn"),
  canton(
    "basel-stadt",
    "Basel-Stadt",
    "Bâle-Ville",
    "Basilea Città",
    "Basel-Stadt",
  ),
  canton(
    "basel-landschaft",
    "Basel-Landschaft",
    "Bâle-Campagne",
    "Basilea Campagna",
    "Basel-Landschaft",
  ),
  canton(
    "schaffhausen",
    "Schaffhausen",
    "Schaffhouse",
    "Sciaffusa",
    "Schaffhausen",
  ),
  canton(
    "appenzell-ausserrhoden",
    "Appenzell Ausserrhoden",
    "Appenzell Rhodes-Extérieures",
    "Appenzello Esterno",
    "Appenzell Ausserrhoden",
  ),
  canton(
    "appenzell-innerrhoden",
    "Appenzell Innerrhoden",
    "Appenzell Rhodes-Intérieures",
    "Appenzello Interno",
    "Appenzell Innerrhoden",
  ),
  canton("st-gallen", "St. Gallen", "Saint-Gall", "San Gallo", "St. Gallen"),
  canton("graubuenden", "Graubünden", "Grisons", "Grigioni", "Graubünden"),
  canton("aargau", "Aargau", "Argovie", "Argovia", "Aargau"),
  canton("thurgau", "Thurgau", "Thurgovie", "Turgovia", "Thurgau"),
  canton("tessin", "Tessin", "Tessin", "Ticino", "Ticino"),
  canton("waadt", "Waadt", "Vaud", "Vaud", "Vaud"),
  canton("wallis", "Wallis", "Valais", "Vallese", "Valais"),
  canton("neuenburg", "Neuenburg", "Neuchâtel", "Neuchâtel", "Neuchâtel"),
  canton("genf", "Genf", "Genève", "Ginevra", "Geneva"),
  canton("jura", "Jura", "Jura", "Giura", "Jura"),
];
