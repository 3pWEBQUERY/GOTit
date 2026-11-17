/** Ergebnis des direkten Uploads: fertig, vom Ziel abgewiesen oder Verbindung unterbrochen. */
export type PutResult = "ok" | "rejected" | "network";

/**
 * Lädt eine Datei per `PUT` direkt zum Ziel der signierten URL (Bucket oder,
 * beim Treiber fs, die Route der Web-App). XMLHttpRequest statt fetch, weil
 * nur so der Fortschritt des Uploads messbar ist.
 */
export function putFile(file: File, target: { url: string; method: "PUT"; headers: Record<string, string> }, onProgress: (percent: number) => void): Promise<PutResult> {
  return new Promise((resolve) => {
    const request = new XMLHttpRequest();
    request.open(target.method, target.url);
    for (const [name, value] of Object.entries(target.headers)) request.setRequestHeader(name, value);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress((event.loaded / event.total) * 100);
    };
    request.onload = () => resolve(request.status >= 200 && request.status < 300 ? "ok" : "rejected");
    request.onerror = () => resolve("network");
    request.onabort = () => resolve("network");
    request.send(file);
  });
}
