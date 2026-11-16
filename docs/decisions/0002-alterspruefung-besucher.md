# 0002 Altersprüfung für Besucher

Besucher bestätigen vor Marktplatz und Community per Selbstauskunft, dass sie volljährig sind. Die Bestätigung liegt als signiertes, `HttpOnly`-Sitzungs-Cookie vor (höchstens 24 Stunden) und bei angemeldeten Personen zusätzlich im Konto. Gespeichert wird weder Geburtsdatum noch Ausweis.

Geschützt sind die Routengruppen `(marktplatz)` und `(community)`; Information, Recht, Hilfe, Melden und Anmeldung bleiben frei erreichbar. Das Rücksprungziel `?weiter=` akzeptiert nur Pfade der eigenen Anwendung.

**Offen (rechtlich, Gate 16.3):** Ob eine Selbstauskunft für Besucher genügt oder ein stärkeres Verfahren nötig ist, entscheidet die rechtliche Einordnung. Die Prüfung der Anbieter ist davon getrennt und folgt in Schritt 1.5.
