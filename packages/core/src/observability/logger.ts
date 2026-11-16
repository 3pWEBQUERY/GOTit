type Level = "info" | "warn" | "error";
type Fields = Record<string, string | number | boolean | null | undefined>;

/**
 * Strukturierte Logs für Railway. Felder sind bewusst auf einfache Werte
 * beschränkt: Nachrichtentexte, Ausweisdaten und Suchbegriffe gehören nie in
 * ein Log (PRD 16.2), deshalb nimmt der Logger keine Objekte an.
 */
export function createLogger(service: string) {
  function write(level: Level, event: string, fields: Fields = {}) {
    const line = JSON.stringify({ level, service, event, time: new Date().toISOString(), ...fields });
    (level === "error" ? process.stderr : process.stdout).write(`${line}\n`);
  }
  return {
    info: (event: string, fields?: Fields) => write("info", event, fields),
    warn: (event: string, fields?: Fields) => write("warn", event, fields),
    error: (event: string, fields?: Fields) => write("error", event, fields),
  };
}

export type Logger = ReturnType<typeof createLogger>;
