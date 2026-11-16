/** Referenzdaten: die 26 Kantone der Schweiz. Reale Geografie, keine fiktiven Inhalte. */
export interface RegionSeed {
  slug: string;
  nameDe: string;
  nameFr: string;
  nameIt: string;
  nameEn: string;
}

const canton = (slug: string, nameDe: string, nameFr: string, nameIt: string, nameEn: string): RegionSeed => ({ slug, nameDe, nameFr, nameIt, nameEn });

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
  canton("basel-stadt", "Basel-Stadt", "Bâle-Ville", "Basilea Città", "Basel-Stadt"),
  canton("basel-landschaft", "Basel-Landschaft", "Bâle-Campagne", "Basilea Campagna", "Basel-Landschaft"),
  canton("schaffhausen", "Schaffhausen", "Schaffhouse", "Sciaffusa", "Schaffhausen"),
  canton("appenzell-ausserrhoden", "Appenzell Ausserrhoden", "Appenzell Rhodes-Extérieures", "Appenzello Esterno", "Appenzell Ausserrhoden"),
  canton("appenzell-innerrhoden", "Appenzell Innerrhoden", "Appenzell Rhodes-Intérieures", "Appenzello Interno", "Appenzell Innerrhoden"),
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
