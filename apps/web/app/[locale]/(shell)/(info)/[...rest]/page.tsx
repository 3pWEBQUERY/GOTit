import { notFound } from "next/navigation";

/** Fängt unbekannte Pfade innerhalb der Shell ab, damit die 404-Seite Kopfzeile und Navigation behält. */
export default function UnknownPage() {
  notFound();
}
