# 0008 Abnahmekriterien für Schritt 1.4 (Konto)

**Stand:** 16.11.2026

PRD v2.0 verweist für Schritt 1.4 auf «Abnahmekriterien 20.1 aus v1.0». Die v1.0 liegt nicht vor. Auf Anweisung von Alexander werden die Kriterien aus v2.0 abgeleitet (Abschnitte 7.4, 7.5, 8.2, 13, 14.1, 16.1, 16.2). Liegt v1.0 vor, wird diese Liste damit abgeglichen.

## Registrierung und Bestätigung

1. Kontotyp wählen: Mitglied, Anbieter, Club oder Agentur. Clubs und Agenturen geben den Namen der Organisation an.
2. Pflicht: Volljährigkeit bestätigen, Bedingungen und Datenschutz akzeptieren, Passwort mit mindestens 12 Zeichen.
3. Das Konto ist bis zur Bestätigung der E-Mail-Adresse nicht nutzbar. Die Bestätigungs-E-Mail hat einen neutralen Betreff ohne Namen und kommt in der Sprache der Oberfläche.
4. Eine schon registrierte Adresse wird nicht verraten: Die Antwort ist dieselbe wie bei einer neuen.
5. Ohne eingerichteten E-Mail-Versand ist die Registrierung geschlossen und sagt das.
6. Rate Limit: höchstens 3 Registrierungen pro Stunde und Adresse des Clients. Die öffentliche API für die Registrierung ist gesperrt.
7. Ein Anbieterkonto erhält ein Profil im Entwurf; ein Organisationskonto eine Organisation im Entwurf mit dem Konto als Inhaber. Nichts davon ist öffentlich.

## Anmeldung

8. Anmeldung mit E-Mail und Passwort oder mit Passkey.
9. Ist 2FA eingerichtet, folgt `/anmelden/2fa` mit TOTP-Code oder Ersatzcode.
10. Nach der Anmeldung geht es zum Ziel aus `?weiter=`, nur innerhalb der Anwendung.
11. Rate Limit: höchstens 5 Anmeldeversuche und 5 Versuche für den zweiten Faktor pro Minute und Client-Adresse.
12. Fehlermeldungen verraten nicht, ob eine Adresse existiert.

## Passwort

13. «Passwort vergessen» sendet eine E-Mail mit einem Link, der 1 Stunde gilt. Die Antwort ist für bekannte und unbekannte Adressen gleich.
14. Ein neues Passwort beendet alle bestehenden Sitzungen.

## Einstellungen

15. **Profil:** Name und Benutzername. Ein vergebener Benutzername wird am Feld gemeldet.
16. **Sicherheit:**
    - Passwort ändern, wahlweise mit Abmeldung der anderen Geräte.
    - 2FA einrichten per QR-Code und Code-Bestätigung, mit Ersatzcodes; 2FA abschalten.
    - Passkeys hinzufügen und entfernen.
    - Sitzungen ansehen und einzeln beenden.
    - Änderungsprotokoll ansehen.
17. **Privatsphäre:** Sichtbarkeit, Online-Status und Lesebestätigung. Die Voreinstellung ist zurückhaltend: Online-Status und Lesebestätigung sind aus. Blockierte Personen folgen mit Schritt 1.8.
18. **Benachrichtigungen:** Kanal pro Ereignis. Sicherheitshinweise per E-Mail lassen sich nicht abschalten.
19. **Darstellung:** Sprache, hell, dunkel oder Gerät, Bewegung reduzieren, neutraler Seitentitel. Wirkt sofort und bleibt nach dem Neuladen.
20. **Daten:**
    - Export als JSON ohne Passwort-Hash, 2FA-Geheimnis und Sitzungstoken.
    - Konto deaktivieren.
    - Löschung beantragen: 30 Tage Frist, danach löscht der Cron-Dienst. Eine Anmeldung innerhalb der Frist hebt Deaktivierung und Löschantrag auf.
    - Beides beendet sofort alle Sitzungen.
21. Schalter speichern sofort mit Bestätigung am Ort. Formulare haben einen Speichern-Button. Nicht umkehrbare Aktionen verlangen einen Dialog, der die Folge benennt.
22. Jedes Sicherheitsereignis landet im Änderungsprotokoll: Anmeldung, Passwort, 2FA, Passkey, Sitzung beendet, Export, Deaktivierung, Löschantrag, Reaktivierung. Ohne IP-Adresse und ohne Inhalte.

## Zugriff

23. Mitgliederbereich und Einstellungen nur angemeldet; sonst Weiterleitung zu `/anmelden?weiter=`.
24. Eine Sitzung lässt sich nur vom eigenen Konto beenden; eine fremde Sitzungs-ID verhält sich wie eine unbekannte.
