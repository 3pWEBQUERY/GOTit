"use client";

/**
 * Feld für Bots: für Menschen unsichtbar und ohne Tabstopp; Screenreader
 * überspringen es. Wer es ausfüllt, erhält scheinbar Erfolg.
 */
export function Honeypot({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        {label}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={value} onChange={(event) => onChange(event.target.value)} />
      </label>
    </div>
  );
}
