import { notFound } from "next/navigation";

/** Unbekannte Pfade im Admin: 404 mit Seitenleiste, nachdem das Layout den Zugang geprüft hat. */
export default function UnknownAdminPage() {
  notFound();
}
