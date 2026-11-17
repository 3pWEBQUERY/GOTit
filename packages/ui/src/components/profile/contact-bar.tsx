import { CirclePause } from "lucide-react";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { cn } from "../../cn";
import { UiLink } from "../../link/ui-link";
import { Button } from "../actions/button";

export interface ContactAction {
  /** Verb + Objekt, zum Beispiel «Termin anfragen». */
  label: string;
  /** Mit `href` ist die Aktion ein Link, sonst ein Button. */
  href?: string;
  onClick?: () => void;
}

export interface ContactBarProps {
  /** `sticky-panel`: haftende, deckende Spalte ab 768 px. `mobile-bar`: unten fixierte Leiste aus Glas, nur unter 768 px. */
  variant: "sticky-panel" | "mobile-bar";
  /** Zugänglicher Name des Bereichs. */
  label: string;
  /** Primäre Aktion: «Termin anfragen». Fehlt sie, steht nur `message` da. */
  request?: ContactAction;
  /** Sekundäre Aktion: «Nachricht schreiben». Als Element, wenn die Ansicht sie selbst rendert (zum Beispiel ein Formular). */
  message?: ContactAction | ReactElement;
  /** Kurzer Hinweis unter den Aktionen, zum Beispiel was noch nicht möglich ist. */
  note?: string;
  /** Nur `sticky-panel`: Inhalt über den Aktionen, zum Beispiel Name, Vertrauenssignale, Verfügbarkeit. */
  children?: ReactNode;
  /** Nur `sticky-panel`: Speichern, zum Beispiel ein stiller Button. */
  save?: ReactNode;
  /** Nur `sticky-panel`: Teilen. */
  share?: ReactNode;
  /** Nur `sticky-panel`: Melden. Bleibt auch bei pausiertem Profil erreichbar. */
  report?: ReactNode;
  /** Hinweis bei pausiertem Profil («Dieses Profil ist zurzeit pausiert»). Ist er gesetzt, gibt es keine Kontaktaktionen. */
  paused?: string;
  className?: string;
}

function Action({ action, variant }: { action: ContactAction; variant: "primary" | "secondary" }) {
  if (action.href !== undefined) {
    return (
      <Button asChild variant={variant} width="full">
        <UiLink href={action.href} onClick={action.onClick}>
          <span className="text-center">{action.label}</span>
        </UiLink>
      </Button>
    );
  }
  return (
    <Button variant={variant} width="full" onClick={action.onClick}>
      {action.label}
    </Button>
  );
}

function MessageAction({ message, variant }: { message: ContactAction | ReactElement; variant: "primary" | "secondary" }) {
  return isValidElement(message) ? message : <Action action={message as ContactAction} variant={variant} />;
}

function PausedHint({ text }: { text: string }) {
  return (
    <p className="flex items-start gap-2 text-small text-ink">
      <CirclePause aria-hidden strokeWidth={1.5} className="size-5 shrink-0 text-ink-muted" />
      <span className="min-w-0">{text}</span>
    </p>
  );
}

/**
 * Kontaktaktionen der Profilseite (PRD 10): bleiben beim Scrollen sichtbar.
 * Die mobile Leiste gehört zur Navigationsebene und ist Glas; sie ersetzt die
 * Tab-Leiste und steht über der Safe Area. Die Spalte ab 768 px ist deckend.
 */
export function ContactBar({ variant, label, request, message, note, children, save, share, report, paused, className }: ContactBarProps) {
  if (variant === "mobile-bar") {
    return (
      <section
        aria-label={label}
        data-contact-bar="mobile"
        className={cn(
          "glass fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-panel -translate-x-1/2 rounded-card p-2 text-ink md:hidden",
          className,
        )}
      >
        {paused ? (
          <div className="flex min-h-11 items-center px-2">
            <PausedHint text={paused} />
          </div>
        ) : (
          <div className="flex items-stretch gap-2">
            {message ? <MessageAction message={message} variant={request ? "secondary" : "primary"} /> : null}
            {request ? <Action action={request} variant="primary" /> : null}
          </div>
        )}
      </section>
    );
  }

  const secondary = save || share;
  return (
    <section
      aria-label={label}
      data-contact-bar="panel"
      className={cn("flex flex-col gap-6 rounded-card border border-border bg-surface p-4 text-ink md:sticky md:top-24 md:p-6", className)}
    >
      {children}
      {paused ? (
        <PausedHint text={paused} />
      ) : (
        <div className="flex flex-col gap-2">
          {request ? <Action action={request} variant="primary" /> : null}
          {message ? <MessageAction message={message} variant={request ? "secondary" : "primary"} /> : null}
          {note ? <p className="text-small text-ink-muted">{note}</p> : null}
        </div>
      )}
      {secondary ? (
        <div className="flex flex-wrap gap-2">
          {save}
          {share}
        </div>
      ) : null}
      {report ? <div className="border-t border-border pt-4">{report}</div> : null}
    </section>
  );
}
