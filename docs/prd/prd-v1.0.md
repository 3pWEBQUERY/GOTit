# Product Requirements Document v1.0 – Premium Escort & Adult Services Platform

Projekt: Marketplace – Premium Escort & Adult Services Platform
Version: 1.0
Datum: 16. November 2026
Status: Produktkonzept und Entwicklungsgrundlage
Plattform: Web Application, responsive, PWA-fähig
Initialer Markt: Schweiz
Expansion: Deutschland, Österreich und weitere rechtlich geprüfte Märkte
Zielgruppe: Erwachsene ab 18 Jahren
Technologische Ausrichtung: Next.js, TypeScript, PostgreSQL, Prisma

> Übernommen aus der Nachricht von Alexander vom 17.11.2026. PRD v2.0 (`prd-v2.0.md`) ergänzt und ändert dieses Dokument; bei Widersprüchen gilt v2.0 (siehe dort Abschnitt 2).

## 1. Executive Summary

### 1.1 Produktvision

Entwicklung einer hochwertigen digitalen Plattform, die einen Escort- und Adult-Services-Marktplatz mit sozialen Interaktionen, leistungsfähiger Suche, Terminorganisation und professionellen Verwaltungswerkzeugen verbindet.

Die Plattform soll drei zentrale Probleme bestehender Angebote lösen:

1. Komplexe Benutzeroberflächen: Bestehende Portale bieten zahlreiche Funktionen, aber oft keine ausreichend klare und intuitive Benutzerführung.
2. Unzureichende Vertrauensmechanismen: Identität, Verfügbarkeit, Bewertungen und bezahlte Sichtbarkeit werden häufig nicht ausreichend voneinander getrennt.
3. Fragmentierte Anbieterwerkzeuge: Profile, Kundenkommunikation, Termine, Werbung und Statistiken sollten aus einer zentralen Oberfläche verwaltbar sein.

Unser Produkt soll nicht nur als Inserateportal dienen, sondern als digitales Ökosystem, in dem Menschen Profile entdecken, miteinander kommunizieren und Kontakte organisieren können.

### 1.2 Produktpositionierung

Ein Marktplatz mit der Benutzerfreundlichkeit einer modernen Consumer-App und den Verwaltungsfunktionen einer professionellen Business-Software.

Die Plattform vereint:

- Regionale und internationale Profilsuche
- Einzelanbieter-, Club- und Agenturprofile
- Umfangreiche Profile mit Medien
- Internen Echtzeit-Messenger
- Termin- und Verfügbarkeitsmanagement
- Community mit Beiträgen, Stories, Videos und Blogs
- Authentifizierte, moderierte Bewertungen
- Interne Favoriten- und Benachrichtigungssysteme
- Anbieter-Dashboards mit Statistiken
- Premium-Abonnements und Werbeprodukte
- Ein vollständiges administratives Kontrollsystem

### 1.3 Wesentliche Alleinstellungsmerkmale

**Ein vollständig integriertes Ökosystem.** Die Benutzer müssen nicht zwischen mehreren Websites und externen Anwendungen wechseln, um Profile zu entdecken, Kontakt aufzunehmen und Termine zu verwalten.

**Anbieterautonomie.** Einzelanbieter kontrollieren ihre Profile, ihre Medien, ihre Verfügbarkeit und ihre Kommunikation eigenständig. Auch bei einer Verknüpfung mit einer Agentur oder einem Club behalten sie die Kontrolle über ihre persönliche Identität.

**Transparente Vertrauensmechanismen.** Identitätsprüfung, verifizierte Fotos, Aktivität, bestätigte Termine und Kundenbewertungen werden als getrennte Signale dargestellt.

**Mobile-First-Design.** Die gesamte Plattform wird zunächst für die mobile Bedienung entworfen, bietet auf Desktop-Geräten jedoch zusätzliche produktive Verwaltungsfunktionen.

**Erweiterbare Architektur.** Neue Funktionen, Mitgliedschaftstypen, Regionen und Module können hinzugefügt werden, ohne das Grundsystem neu aufbauen zu müssen.

## 2. Produktziele

### 2.1 Primäre Ziele

- Einen leistungsfähigen, skalierbaren und benutzerfreundlichen Marktplatz entwickeln.
- Anbieter durch hochwertige Profile und bessere Werkzeuge gewinnen.
- Besuchern eine schnelle, relevante und transparente Suche ermöglichen.
- Wiederkehrende Nutzung durch Messenger, Favoriten, Benachrichtigungen und Community fördern.
- Ein nachhaltiges Geschäftsmodell mit mehreren Umsatzquellen schaffen.
- Sicherheit, Datenschutz, Freiwilligkeit und rechtliche Konformität zum Bestandteil der Produktarchitektur machen.

### 2.2 Sekundäre Ziele

- Langfristig ein eigenes Community-Ökosystem aufbauen.
- Eine API-fähige Grundlage für weitere eigene Anwendungen schaffen.
- Business-Tools bereitstellen, die Anbieter auch unabhängig vom Marktplatz regelmässig verwenden.
- Mehrsprachigkeit und internationale Expansion vorbereiten.
- Eine spätere mobile App technisch ermöglichen, ohne deren Freigabe durch App-Stores vorauszusetzen.

### 2.3 Nichtziele der ersten Version

- Keine Abwicklung oder treuhänderische Verwahrung von Zahlungen für persönliche Dienstleistungen.
- Keine Verpflichtung zur Durchführung gebuchter Treffen.
- Keine unmoderierte Veröffentlichung von Anbieterprofilen.
- Kein automatischer Import fremder Plattformprofile.
- Keine öffentliche Anzeige genauer privater Wohnadressen.
- Kein Handel mit personenbezogenen Nutzerdaten.
- Kein Aufbau einer Kryptowährungs- oder Auszahlungsplattform zum Marktstart.
- Keine algorithmische Profilbewertung anhand besonders sensibler Nutzerdaten.

## 3. Benutzerrollen und Berechtigungssystem

Die Plattform verwendet ein rollen- und ressourcenbasiertes Berechtigungssystem.

### 3.1 Besucher

Nicht angemeldete Benutzer können:

- Die öffentliche Startseite aufrufen.
- Öffentliche Profile suchen und ansehen, soweit rechtlich zulässig.
- Nach Regionen und Kategorien filtern.
- Öffentliche Unternehmensprofile aufrufen.
- Allgemeine Community-Inhalte ansehen, sofern freigegeben.
- Informationen zur Plattform und zu Mitgliedschaften erhalten.

Eingeschränkte Inhalte erfordern eine geeignete Altersprüfung.

### 3.2 Registrierte Mitglieder

Registrierte Mitglieder können zusätzlich:

- Ein eigenes Benutzerprofil verwalten.
- Favoritenlisten erstellen.
- Suchfilter speichern.
- Nachrichten senden und empfangen.
- Terminanfragen stellen.
- Benachrichtigungen erhalten.
- Bestätigte Kontakte bewerten.
- Community-Inhalte veröffentlichen, kommentieren und melden.
- Eigene Privatsphäre- und Benachrichtigungseinstellungen festlegen.

### 3.3 Einzelanbieter

Einzelanbieter verfügen zusätzlich über:

- Ein vollständiges öffentliches Anbieterprofil.
- Medienverwaltung.
- Dienstleistungs- und Preisverwaltung.
- Verfügbarkeitskalender.
- Terminverwaltung.
- Kundennachrichten und Chat-Organisation.
- Anbieterstatistiken.
- Werbung und Sichtbarkeitsprodukte.
- Verwaltung von Mitgliedschaften und Rechnungen.
- Freiwillige Verknüpfungen mit Clubs oder Agenturen.

### 3.4 Clubs und Agenturen

Geschäftskonten können:

- Ein Unternehmensprofil erstellen.
- Mitarbeiter mit unterschiedlichen Berechtigungen verwalten.
- Anbieterprofile zur Verknüpfung einladen.
- Unternehmensmedien veröffentlichen.
- Öffnungszeiten und Standorte hinterlegen.
- Unternehmensweite Angebote und Kampagnen verwalten.
- Freigegebene Teamtermine anzeigen.
- Mehrere Unternehmensstandorte verwalten.
- Eigene Rechnungen und Werbemassnahmen einsehen.

Verbindliche Schutzregel: Eine Agentur darf kein persönliches Anbieterprofil ohne Zustimmung der betroffenen Person übernehmen. Ein Anbieter kann eine Verknüpfung widerrufen. Agenturen erhalten keinen automatischen Zugriff auf private Nachrichten oder Ausweisdaten.

### 3.5 Interne Rollen

- Super Admin: Technische und organisatorische Gesamtverwaltung
- Platform Admin: Accounts, Module, Zahlungen, Systemeinstellungen
- Moderator: Inhalte, Meldungen, Freigaben und Einsprüche
- Trust & Safety: Identitätsfälle, Missbrauch, Sicherheitsvorfälle
- Support: Supportanfragen und eingeschränkte Kontoinformationen
- Finance: Rechnungen, Zahlungen, Gutschriften
- Content Editor: Redaktionelle Inhalte, Landingpages und Blogs

Alle administrativen Berechtigungen folgen dem Least-Privilege-Prinzip.

## 4. Informationsarchitektur und Navigation

Die Plattform besteht aus vier Hauptoberflächen.

### 4.1 Öffentlicher Marktplatz

Primärnavigation:

1. Entdecken
2. Profile
3. Clubs
4. Community
5. Mehr

Angemeldete Mitglieder erhalten zusätzlich direkten Zugriff auf Nachrichten, Favoriten, Termine und ihr eigenes Konto.

Die Navigation soll sich dem Endgerät anpassen.

Desktop:

- Kompakter Header
- Zentrale Suchleiste
- Horizontale Hauptnavigation
- Benutzeraktionen rechts
- Kontextabhängige Seitenleisten
- Bei der Suche: Filterbereich und Ergebnisansicht

Mobile:

- Kompakte Suche im oberen Bereich
- Bottom Navigation mit maximal fünf Hauptaktionen
- Erweiterte Filter in einem eigenständigen Dialog
- Kontextbezogene Aktionen auf Profilseiten
- Kein mehrfach verschachteltes Hauptmenü

### 4.2 Mitgliederbereich

Hauptbereiche:

- Übersicht
- Nachrichten
- Termine
- Favoriten
- Gespeicherte Suchen
- Bewertungen
- Benachrichtigungen
- Profil und Einstellungen

### 4.3 Anbieter-Dashboard

Hauptbereiche:

- Dashboard
- Mein Profil
- Medien
- Nachrichten
- Kalender
- Anfragen
- Community-Inhalte
- Statistiken
- Werbung
- Abrechnung
- Einstellungen

### 4.4 Administrationsbereich

Hauptbereiche:

- Plattformübersicht
- Benutzer
- Anbieter
- Unternehmen
- Verifizierungen
- Moderation
- Community
- Rechnungen und Produkte
- Werbung
- Regionen
- Inhalte und SEO
- Support
- System und Audit-Logs

## 5. Funktionsanforderungen

Die Anforderungen werden nach Priorität eingeteilt.

- P0: Erforderlich für einen sicheren, funktionsfähigen ersten Launch
- P1: Erweiterung nach Marktstart
- P2: Fortgeschrittene Plattformfunktionen

### 5.1 Registrierung und Authentifizierung

Priorität: P0

**FR-AUTH-001 – Registrierung.** Benutzer können Accounts mit E-Mail-Adresse und Passwort erstellen.

Anforderungen:

- E-Mail-Bestätigung
- Passwortprüfung
- Passwort-Reset
- Schutz vor massenhafter Registrierung
- Zustimmung zu Nutzungsbedingungen und Datenschutzinformationen
- Altersprüfung entsprechend den rechtlichen Anforderungen
- Auswahl des gewünschten Kontotyps
- Verhinderung eindeutig missbräuchlicher Doppelaccounts

**FR-AUTH-002 – Accounttypen.** Eine natürliche Person kann innerhalb eines Benutzeraccounts mehrere zulässige Rollen besitzen.

Beispiel: Ein Benutzer ist gleichzeitig registriertes Mitglied und verifizierter Einzelanbieter.

Eine Unternehmensmitgliedschaft wird als separate Organisation verwaltet.

**FR-AUTH-003 – Sicherheitsfunktionen.**

- Zwei-Faktor-Authentifizierung
- Passkeys
- Übersicht aktiver Sitzungen
- Abmeldung von anderen Geräten
- Benachrichtigung bei ungewöhnlichen Logins
- Sperren kompromittierter Sitzungen
- Änderungsprotokoll für sensible Kontoeinstellungen

**FR-AUTH-004 – Accountverwaltung.** Mitglieder können:

- Persönliche Daten bearbeiten
- Benutzernamen ändern, unter definierten Regeln
- Sichtbarkeit konfigurieren
- Daten exportieren
- Account deaktivieren
- Löschung beantragen
- Benachrichtigungen verwalten

Gesetzliche Aufbewahrungsfristen und erforderliche Sicherheitsnachweise sind zu berücksichtigen.

### 5.2 Alters- und Identitätsverifizierung

Priorität: P0

**FR-VERIFY-001 – Altersberechtigung.** Vor der Nutzung altersbeschränkter Funktionen muss eine rechtlich angemessene Altersprüfung erfolgen.

Eine einfache „Ich bin 18“-Schaltfläche wird nicht als alleinige Schutzmassnahme vorausgesetzt.

**FR-VERIFY-002 – Anbieter-Identitätsprüfung.** Vor der Veröffentlichung eines Anbieterprofils sind erforderlich:

- Verifikation einer volljährigen natürlichen Person
- Geeignete Identitäts- und Lebendigkeitsprüfung
- Prüfung möglicher rechtlich erforderlicher Nachweise
- Zustimmung zur konkreten Profilveröffentlichung
- Erfassung von Verifizierungsstatus und Ablaufdatum
- Manuelle Prüfung bei Abweichungen

Identitätsdokumente sollen nach Möglichkeit über einen dafür geeigneten Dienstleister verarbeitet werden. Die Plattform speichert bevorzugt Prüfergebnisse statt unnötiger Dokumentenkopien.

**FR-VERIFY-003 – Unternehmen.**

- Prüfung der Geschäftsidentität
- Berechtigung der handelnden Person
- Regionale Bewilligungen, soweit erforderlich
- Dokumentierte Freigabe
- Erneute Prüfung bei wesentlichen Änderungen

**FR-VERIFY-004 – Öffentliche Verifizierungssignale.** Mögliche getrennte Kennzeichnungen:

- Identität verifiziert
- Fotos geprüft
- Unternehmensdaten geprüft
- Profil kürzlich aktualisiert
- Verfügbarkeit bestätigt

Wichtig: Ein Premium-Abonnement erhöht niemals den Identitäts- oder Sicherheitsstatus.

### 5.3 Profile und Sedcards

Priorität: P0

**FR-PROFILE-001 – Profilstammdaten.** Ein Anbieterprofil beinhaltet:

- Benutzername und individuelle URL
- Profilbild und Titelbild
- Kurze Profilbeschreibung
- Ausführliche Beschreibung
- Allgemeine Standortangabe
- Angebotene Regionen
- Unterstützte Sprachen
- Zulässige persönliche Merkmale
- Verifizierungsinformationen
- Letzte freiwillige Profilaktualisierung
- Öffentlicher Status

**FR-PROFILE-002 – Dienstleistungen.** Anbieter können eine strukturierte Liste zulässiger Dienstleistungen verwalten.

Jede Kategorie besitzt:

- Eindeutige ID
- Mehrsprachigen Namen
- Optionale Beschreibung
- Verfügbarkeitsstatus
- Preisangabe, falls vorgesehen
- Regionale Freigaberegeln

Die Kategorien werden zentral verwaltet, um konsistente Suchfilter zu gewährleisten.

**FR-PROFILE-003 – Preise und Konditionen.**

- Flexible Preislisten
- Unterschiedliche Zeitfenster
- Optionale Zusatzinformationen
- Währungen abhängig vom Markt
- Hinweise zu Bedingungen
- Änderungsdatum
- Ein- und Ausblenden einzelner Preisgruppen

Die Plattform wickelt zunächst keine Zahlungen für persönliche Dienstleistungen ab.

**FR-PROFILE-004 – Profilgestaltung.** Anbieter können:

- Medienreihenfolge festlegen
- Titelbild auswählen
- Inhalte in Abschnitten organisieren
- Kontaktoptionen konfigurieren
- Sichtbarkeit steuern
- Vorschau vor Veröffentlichung öffnen

Das Layout bleibt innerhalb eines konsistenten Designsystems.

**FR-PROFILE-005 – Veröffentlichungsstatus.** Mögliche Zustände:

- Entwurf
- Verifizierung ausstehend
- Prüfung ausstehend
- Veröffentlicht
- Pausiert
- Zur Korrektur zurückgegeben
- Eingeschränkt
- Gesperrt
- Archiviert

Jeder Statuswechsel wird protokolliert.

**FR-PROFILE-006 – Profiländerungen.** Kritische Änderungen an Identität, Kontaktwegen oder geschäftlichen Berechtigungen können eine erneute Prüfung auslösen.

Unkritische Änderungen sollen ohne unnötige Wartezeiten veröffentlicht werden.

### 5.4 Bilder, Videos und Medien

Priorität: P0 für Bilder, P1 für erweiterte Medien

**FR-MEDIA-001 – Medienverwaltung.**

- Mehrere Bilder pro Profil
- Drag-and-Drop-Uploads
- Mehrfachauswahl
- Automatische Bildgrössen
- Optimierte Dateiformate
- Zuschneiden und Neuanordnen
- Alternatives Vorschaubild
- Medienstatus und Löschung

**FR-MEDIA-002 – Datenschutz.**

- EXIF- und GPS-Metadaten entfernen
- Private Originaldateien schützen
- Signierte URLs bei geschützten Medien
- Verhinderung unberechtigter interner Zugriffe
- Unterstützung von Missbrauchsmeldungen
- Nachweisbare Rechte und Einwilligungen für abgebildete Personen

Ein Kopierschutz kann unerlaubtes Speichern oder Screenshots nicht vollständig verhindern; entsprechende Zusicherungen werden vermieden.

**FR-MEDIA-003 – Video.** Geplante Funktionen:

- Video-Upload
- Serverseitige Verarbeitung
- Posterbild
- Adaptive Wiedergabe
- Moderationsprüfung
- Altersabhängige Sichtbarkeit
- Konfigurierbare Veröffentlichung

**FR-MEDIA-004 – Geschützte Medien.** Anbieter können Medien nur für berechtigte Mitglieder sichtbar machen.

Die Freigabe erfolgt ausschliesslich gemäss definierten Berechtigungen und Altersanforderungen.

Ein späteres kostenpflichtiges Medienmodell erfordert eine gesonderte Rechts-, Sicherheits- und Zahlungsprüfung.

### 5.5 Suche und Discovery

Priorität: P0

Die Suche ist eines der wichtigsten Produktelemente.

**FR-SEARCH-001 – Universelle Suche.** Eine zentrale Suchfunktion unterstützt:

- Profilnamen
- Standorte
- Städte und Kantone
- Unternehmen
- Freigegebene Kategorien
- Freitextbegriffe
- Regionale Kombinationen

**FR-SEARCH-002 – Erweiterte Filter.** Filtergruppen:

- Standort: Land, Kanton oder Bundesland, Stadt, Umkreis, Region
- Profil: Profiltyp, Altersbereich, Sprachen, Freigegebene Merkmale, Verifizierungsstatus
- Angebot: Dienstleistungen, Preisrahmen, Verfügbarkeit, Standortoptionen, Touren
- Inhalte: Mit Bildern, Mit Videos, Neue Profile, Kürzlich aktualisiert, Mit verifizierten Bewertungen

Die genaue Filterverfügbarkeit hängt von der Rolle und den rechtlichen Vorgaben ab.

**FR-SEARCH-003 – Ergebnisdarstellung.** Zwei Ansichten:

1. Grid View: Visuelle Profilkarten
2. List View: Kompakte Ergebnisliste mit mehr strukturierten Informationen

Karten enthalten:

- Vorschaubild
- Profilname
- Allgemeine Region
- Verifizierungssignal
- Verfügbarkeitsstatus
- Kurze Profilinformation
- Favoritenfunktion
- Kennzeichnung bezahlter Platzierungen

**FR-SEARCH-004 – Ranking.** Organische Suchergebnisse berücksichtigen:

- Suchrelevanz
- Regionale Übereinstimmung
- Aktuelle zulässige Verfügbarkeit
- Profilvollständigkeit
- Zuverlässigkeit der Daten
- Aktualität des Inserats

Bezahlte Platzierungen erscheinen ausdrücklich als Werbung oder gesponserte Ergebnisse.

Verifizierte Profile dürfen nicht allein aufgrund der Verifizierung als sicherer oder qualitativ besser bezeichnet werden.

**FR-SEARCH-005 – Suchkomfort.**

- Sofortige Filteraktualisierung
- Suchvorschläge
- Speicherung von Filterkombinationen
- Suchverlauf, optional und privat
- Zurücksetzen einzelner Filter
- Ergebnisanzahl
- Eindeutige Leermeldungen
- Teilbare Such-URLs ohne private Daten

**FR-SEARCH-006 – Geografischer Datenschutz.** Die Suchfunktion darf aus privaten Profilinformationen keine genaue Wohnadresse ableiten oder veröffentlichen.

Anbieter wählen selbst, welche allgemeinen Regionen öffentlich erscheinen.

### 5.6 Favoriten und Sammlungen

Priorität: P0

Mitglieder können:

- Profile als Favoriten speichern
- Eigene private Sammlungen erstellen
- Sammlungen umbenennen
- Favoriten sortieren
- Gespeicherte Profile erneut aufrufen
- Optional Benachrichtigungen zu relevanten Änderungen aktivieren

Beispiele für private Sammlungen: Favoriten, Zürich, Interessant, Später ansehen.

Es gibt keine öffentlich einsehbare Favoritenliste ohne ausdrückliche Freigabe.

### 5.7 Echtzeit-Messenger

Priorität: P0

**FR-CHAT-001 – Grundfunktionen.**

- Einzelchats
- Echtzeit-Nachrichten
- Lesebestätigung, optional
- Zustellstatus
- Bilder und zulässige Dateianhänge
- Suche innerhalb eigener Chats
- Nachricht löschen
- Chat archivieren
- Kontakt blockieren
- Nachricht oder Nutzer melden

**FR-CHAT-002 – Postfachansichten.**

- Alle
- Ungelesen
- Favoriten
- Archiviert
- Blockiert, über Einstellungen

**FR-CHAT-003 – Nachrichtenorganisation.** Anbieter können Chats mit privaten Labels organisieren.

Beispiele: Neue Anfrage, Termin offen, Bestätigter Kontakt, Rückmeldung erforderlich.

**FR-CHAT-004 – Vorlagen.** Anbieter können eigene Textvorlagen erstellen.

Vorlagen müssen manuell ausgewählt werden. Eine spätere automatische Beantwortung ist nur mit klarer Offenlegung und Zustimmung zulässig.

**FR-CHAT-005 – Datenschutz und Kontrolle.**

- Blockierfunktion ohne Kontaktaufnahme
- Kein Einblick für verknüpfte Unternehmen ohne separate Berechtigung
- Schutz vor Spam und Nachrichtenfluten
- Sichere Datenübertragung und Speicherung
- Konfigurierbare Sichtbarkeit des Online-Status
- Bereinigbare Anhänge und Datenaufbewahrung

Die Plattform behauptet keine Ende-zu-Ende-Verschlüsselung, sofern diese nicht tatsächlich implementiert und überprüft wurde.

### 5.8 Termin- und Verfügbarkeitsmanagement

Priorität: P0

**FR-BOOKING-001 – Kalender.** Anbieter erhalten einen integrierten Kalender.

Funktionen:

- Tages-, Wochen- und Monatsansicht
- Individuelle Arbeitszeiten
- Wiederkehrende Verfügbarkeitsfenster
- Abwesenheiten
- Manuelle Blockierungen
- Private Notizen
- Puffer zwischen Terminen
- Zeitzonenunterstützung

**FR-BOOKING-002 – Terminanfragen.** Ein Mitglied kann eine unverbindliche Anfrage erstellen.

Daten:

- Angefragter Tag
- Uhrzeit
- Optionaler Zeitraum
- Allgemeine Region
- Nachricht
- Anfragestatus

**FR-BOOKING-003 – Statusmodell.**

- Angefragt
- In Abstimmung
- Bestätigt
- Abgelehnt
- Abgesagt
- Abgelaufen
- Als stattgefunden bestätigt
- Strittig

**FR-BOOKING-004 – Gegenvorschläge.** Anbieter und Mitglieder können alternative Termine vorschlagen.

**FR-BOOKING-005 – Erinnerungen.**

- Neue Anfrage
- Bestätigung
- Terminänderung
- Bevorstehender Termin
- Absage

Benachrichtigungen enthalten standardmässig keine unnötigen sensiblen Details.

**FR-BOOKING-006 – Grundsatz Freiwilligkeit.** Alle Terminanfragen sind freiwillig.

Eine Bestätigung durch die Plattform begründet keinen Anspruch auf Durchführung einer persönlichen Dienstleistung. Absagen, Sicherheitsbedenken und Widerruf der Zustimmung müssen jederzeit möglich bleiben.

### 5.9 Bewertungen und Vertrauenssignale

Priorität: P0 für Grundsystem, P1 für erweiterte Reputation

**FR-REVIEW-001 – Bewertungsberechtigung.** Eine Bewertung kann nur nach einer qualifizierenden, dokumentierten Interaktion erfolgen.

Ein über die Plattform bestätigter Termin kann einen solchen Nachweis darstellen.

**FR-REVIEW-002 – Bewertungskategorien.** Mögliche Kategorien:

- Kommunikation
- Zuverlässigkeit der Profilinformationen
- Organisation
- Allgemeine Erfahrung

Es werden keine öffentlichen Angaben über intime Handlungen oder andere besonders sensible Details verlangt.

**FR-REVIEW-003 – Moderation.**

- Missbrauchsmeldungen
- Vertrauliche Überprüfung
- Recht auf Stellungnahme
- Einspruchsmöglichkeit
- Entfernung rechtswidriger oder persönlichkeitsverletzender Inhalte

**FR-REVIEW-004 – Transparenz.** Bewertungen zeigen ihre Verifikationsart und das Veröffentlichungsdatum.

Bezahlte Mitgliedschaften haben keinen Einfluss auf die Bewertung.

**FR-REVIEW-005 – Missbrauchsprävention.**

- Keine Bewertungen für nicht zuordenbare Kontakte
- Schutz vor Fake-Accounts
- Erkennung von Bewertungsmanipulation
- Schutz vor Erpressung und Vergeltungsbewertungen
- Einschränkung öffentlicher Details, die Personen gefährden könnten

### 5.10 Club- und Agenturmanagement

Priorität: P0 für Basisprofile, P1 für vollständige Business-Suite

**FR-BUSINESS-001 – Unternehmensprofile.**

- Unternehmensname
- Logo
- Titelbild
- Beschreibung
- Allgemeine Standortangaben
- Öffnungszeiten
- Kontaktmöglichkeiten
- Websites
- Verifizierungsstatus
- Bildergalerien
- Zugeordnete Anbieterprofile

**FR-BUSINESS-002 – Standorte.** Unternehmen können mehrere Standorte verwalten.

Jeder Standort erhält eigene:

- Öffnungszeiten
- Beschreibung
- Kontaktinformationen
- Anbieterzuordnungen
- Regionale Freigaben

**FR-BUSINESS-003 – Einladungen.** Ein Unternehmen lädt einen Anbieter zur Zusammenarbeit ein.

Der Anbieter muss die Einladung aktiv bestätigen.

**FR-BUSINESS-004 – Rechteverwaltung.** Beispielrollen:

- Geschäftsinhaber
- Standortmanager
- Marketing
- Redakteur
- Terminorganisation

Jede Berechtigung wird einzeln definiert.

**FR-BUSINESS-005 – Anbieterautonomie.** Die Trennung der Verbindung darf nicht automatisch zur Löschung eines unabhängigen Anbieteraccounts führen.

Unternehmen können keine persönlichen Identitätsdaten oder privaten Nachrichten allein aufgrund einer Profilverknüpfung einsehen.

## 6. Community und soziales Netzwerk

Priorität: P1, teilweise P2

Dieses Modul erweitert die Plattform vom Marktplatz zum sozialen Ökosystem.

### 6.1 Community-Feed

Ein vertikaler Feed zeigt:

- Beiträge
- Profilaktualisierungen
- Angekündigte Touren
- Neue Blogartikel
- Veranstaltungen
- Freigegebene Kurzvideos

Sortiermöglichkeiten:

- Neueste Beiträge
- Gefolgte Profile
- Regionen
- Kategorien

Anzeigen und Empfehlungen müssen gekennzeichnet sein.

### 6.2 Beiträge

Mitglieder mit entsprechender Berechtigung können:

- Texte veröffentlichen
- Bilder hinzufügen
- Sichtbarkeit wählen
- Kommentare erlauben oder deaktivieren
- Beiträge bearbeiten
- Beiträge löschen
- Inhalte melden

### 6.3 Stories

- Zeitlich begrenzte Beiträge
- Bilder und Videos
- Eigene Sichtbarkeitseinstellungen
- Story-Archiv für Eigentümer
- Moderationsstatus
- Optionales Teilen im Profil

Die standardmässige Lebensdauer soll konfigurierbar sein, beispielsweise 24 Stunden.

### 6.4 Reels

- Kurze vertikale Videos
- Medienmoderation
- Zuordnung zum Anbieterprofil
- Abonnieren von Profilen
- Meldefunktion
- Alters- und Sichtbarkeitsregeln
- Option zum Deaktivieren automatischer Wiedergabe

Ein aggressiver Empfehlungsalgorithmus ist nicht erforderlich. Chronologische und selbst gesteuerte Feeds werden bevorzugt.

### 6.5 Blogs

- Rich-Text-Editor
- Beitragsbild
- Kategorien
- Tags
- Entwurf und Veröffentlichung
- Geplante Veröffentlichung
- Kommentarmoderation
- SEO-Metadaten

### 6.6 Forum

Spätere Erweiterung mit:

- Themenbereichen
- Threads
- Antworten
- Moderation
- Abonnements
- Suche
- Community-Regeln

### 6.7 Veranstaltungen

- Veranstaltungsname
- Beschreibung
- Datum und Uhrzeit
- Allgemeine Region
- Veranstalter
- Teilnahmeinformationen
- Alters- und Zugangsregeln
- Moderation

### 6.8 Touren

Anbieter können temporäre regionale Aufenthalte veröffentlichen.

Ein Toureneintrag beinhaltet:

- Zielregion
- Beginn
- Ende
- Optionale Verfügbarkeit
- Kontaktmöglichkeit

## 7. Anbieter-Dashboard und Business Intelligence

Priorität: P1, grundlegende Kennzahlen bereits P0

### 7.1 Dashboard-Startseite

Die Übersicht beinhaltet:

- Profilstatus
- Profilaufrufe
- Neue Nachrichten
- Offene Terminanfragen
- Bevorstehende Termine
- Aktive Werbung
- Mitgliedschaftsstatus
- Sicherheits- und Profilhinweise

### 7.2 Statistiken

Kennzahlen:

- Profilaufrufe
- Suchergebniseinblendungen
- Profil-Klickrate
- Neue Kontaktanfragen
- Terminanfragen
- Bestätigte Termine
- Favoriten-Zuwachs
- Medienaufrufe
- Werbekampagnen-Performance

Zeiträume:

- Heute
- 7 Tage
- 30 Tage
- 90 Tage
- Individuell

### 7.3 Datenschutz in Analytics

- Keine Veröffentlichung personenbezogener Besucherdaten
- Keine Offenlegung, wer ein privates Profil betrachtet hat, ohne entsprechende Rechtsgrundlage und Freigabe
- Keine Verarbeitung von Chatinhalten zur Werbeoptimierung
- Keine Werbezielgruppen anhand besonders sensibler Daten
- Aggregation und Datensparsamkeit

### 7.4 Werbeauswertung

Werbeprodukte zeigen:

- Kosten
- Laufzeit
- Impressionen
- Klicks
- Klickrate
- Zugeordnete Profilbesuche

Soweit möglich werden Statistiken mit überprüfbaren Ereignissen statt künstlichen Reichweitenversprechen berechnet.

## 8. Monetarisierung

### 8.1 Geschäftsmodell

Die Plattform kombiniert drei Hauptumsatzquellen:

1. Premium-Mitgliedschaften
2. Bezahlte Sichtbarkeit und Werbung
3. Optionale Business-Werkzeuge

Credits und kostenpflichtige Medien können später ergänzt werden, sofern die rechtlichen und zahlungsbezogenen Voraussetzungen erfüllt sind.

### 8.2 Mitgliedschaftsmodell

Vorgeschlagene Produktstruktur, keine finalen Preise.

**Basic.** Kostenloses Grundprofil für verifizierte Anbieter.

- Standardprofil
- Basis-Medien
- Nachrichten
- Kalender
- Organische Auffindbarkeit
- Grundlegende Statistik

**Pro.** Bezahlte Mitgliedschaft.

- Erweiterte Profilgestaltung
- Umfangreichere Statistiken
- Chat-Organisation
- Medien- und Marketingwerkzeuge
- Zusätzliche Funktionen

**Business.** Für Clubs und Agenturen.

- Mehrere Standorte
- Berechtigte Teammitglieder
- Anbieterzuordnungen
- Unternehmens-Dashboard
- Erweiterte Analysen
- Zentralisierte Rechnungsverwaltung

**Enterprise.** Für grössere Geschäftskunden, erst bei nachgewiesenem Bedarf.

- Individuelle Organisationseinstellungen
- Erweiterte Verwaltungsfunktionen
- Vereinbarte Supportleistungen
- Zusätzliche Schnittstellen nach Prüfung

### 8.3 Sichtbarkeitsprodukte

Mögliche Produkte:

- Gesponserte regionale Platzierung
- Gesponserte Kategorieplatzierung
- Zeitlich begrenzte Hervorhebung
- Unternehmensbanner
- Kampagnen mit definiertem Budget
- Hervorhebung zulässiger Community-Beiträge

Alle Platzierungen müssen als bezahlte Werbung erkennbar sein.

### 8.4 Preis- und Laufzeitverwaltung

Administratoren können:

- Produkte erstellen
- Preise ändern
- Währungen festlegen
- Länderabhängige Verfügbarkeit bestimmen
- Laufzeiten konfigurieren
- Rabatte vergeben
- Gutscheine verwalten
- Kampagnen pausieren
- Produkte deaktivieren

### 8.5 Guthabenmodell

Priorität: P2

Ein internes Guthabensystem ist optional.

Bei Einführung erforderlich:

- Transaktionsjournal
- Nachvollziehbare Kontostände
- Rückerstattungs- und Korrekturprozesse
- Schutz vor Doppelbuchungen
- Betrugsprävention
- Klare Bedingungen für Ablauf und Rückzahlung
- Rechtliche Prüfung gespeicherter Geldwerte

Ein Guthabenmodell wird nicht als Ersatz für eine geeignete Zahlungsabwicklung eingesetzt.

### 8.6 Zahlungsabwicklung

Bevor Zahlungen aktiviert werden, muss ein Zahlungsdienstleister den konkreten Geschäftsbereich ausdrücklich unterstützen.

Eine pauschale Annahme, dass gewöhnliche Stripe-, PayPal- oder App-Store-Zahlungen funktionieren, ist unzulässig.

Die erste Version verkauft ausschliesslich eindeutig definierte Plattformleistungen und keine persönlichen Dienstleistungen.

## 9. Administration und Moderation

Priorität: P0

### 9.1 Admin-Dashboard

Die Plattformübersicht zeigt:

- Neue Registrierungen
- Aktive Anbieterprofile
- Ausstehende Verifizierungen
- Offene Moderationsfälle
- Beschwerden
- Aktive Abonnements
- Zahlungsstatus
- Technische Fehler
- Sicherheitswarnungen

### 9.2 Benutzerverwaltung

Administratoren können:

- Benutzer suchen
- Rollen prüfen
- Accountstatus anzeigen
- Verifizierungsstatus einsehen, soweit berechtigt
- Nutzer einschränken
- Zeitlich befristete Sperren verwalten
- Sperrgründe dokumentieren
- Einsprüche bearbeiten

### 9.3 Moderations-Queue

Moderatoren bearbeiten:

- Neue Anbieterprofile
- Hochgeladene Medien
- Profiländerungen mit Prüfpflicht
- Gemeldete Nachrichten
- Gemeldete Beiträge
- Bewertungen
- Unternehmensnachweise

Jeder Fall besitzt:

- Fall-ID
- Kategorie
- Priorität
- Status
- Zuständigkeit
- Entscheidung
- Begründung
- Zeitstempel
- Einspruchsstatus

### 9.4 Regelbasierte Prüfungen

Automatisierte Systeme können risikoreiche Inhalte zur manuellen Prüfung markieren.

Endgültige Entscheidungen mit erheblichen Konsequenzen müssen überprüfbar und anfechtbar sein.

### 9.5 Länder- und Regionsverwaltung

Administratoren verwalten:

- Länder
- Kantone und Bundesländer
- Städte
- Sprachversionen
- Rechtliche Freigaberegeln
- Erforderliche Bewilligungen
- Verfügbare Profilkategorien
- Lokale Inhaltsbeschränkungen

Eine Region darf erst aktiviert werden, wenn die rechtlichen und betrieblichen Voraussetzungen geprüft sind.

### 9.6 CMS

Das interne CMS verwaltet:

- Informationsseiten
- FAQ
- Hilfeseiten
- Community-Regeln
- Rechtliche Hinweise
- Landingpages
- Regionale SEO-Seiten
- Redaktionelle Inhalte

### 9.7 Audit-Logs

Sicherheitsrelevante Aktionen werden revisionsfähig protokolliert, insbesondere:

- Rollenänderungen
- Verifizierungsentscheidungen
- Account-Sperrungen
- Zugriffe auf sensible Informationen
- Zahlungsänderungen
- Moderationsentscheidungen

Private Inhalte werden nicht unnötig in Audit-Logs kopiert.

## 10. Sicherheits- und Datenschutzkonzept

### 10.1 Grundsätze

- Privacy by Design
- Privacy by Default
- Data Minimization
- Role-Based Access Control
- Least Privilege
- Verschlüsselung
- Transparenz
- Nutzerkontrolle
- Datenlöschung und Exportierbarkeit
- Nachvollziehbare Moderation

### 10.2 Schutz vor Ausbeutung und Missbrauch

Die Plattform verbietet:

- Profile Minderjähriger
- Nicht freiwillige oder erzwungene Dienstleistungen
- Menschenhandel und Ausbeutung
- Identitätsmissbrauch
- Veröffentlichungen ohne Zustimmung abgebildeter Personen
- Erpressung und Doxxing
- Missbräuchliche Kontaktaufnahme
- Umgehung rechtlich erforderlicher Bewilligungen

Dafür werden verbindliche Moderations- und Eskalationsverfahren benötigt.

### 10.3 Sicherheit für Anbieter

- Öffentliche Pseudonyme
- Schutz privater Kontaktdaten
- Keine standardmässige Offenlegung exakter Aufenthaltsorte
- Blockier- und Meldefunktionen
- Schnelle Pausierung eines Profils
- Möglichkeit zur Entfernung unberechtigter Inhalte
- Schutz vor unbefugten Unternehmenszugriffen

### 10.4 Datenschutz-Folgenabschätzung

Vor dem Launch wird eine Datenschutz-Folgenabschätzung durchgeführt und dokumentiert, soweit gesetzlich erforderlich.

Zu prüfen sind insbesondere:

- Identitätsdaten
- Angaben zur Intimsphäre
- Private Nachrichten
- Bewertungen
- Termin- und Standortinformationen
- Datenübermittlung ins Ausland
- Profiling und Werbefunktionen

### 10.5 Datenaufbewahrung

Für jede Datenklasse ist eine Aufbewahrungsrichtlinie festzulegen.

Beispiele:

- Accountinformationen
- Medien
- Nachrichten
- Termindaten
- Rechnungsdaten
- Audit-Logs
- Sicherheitsvorfälle
- Verifizierungsnachweise

Aufbewahrung und Löschung richten sich nach Zweck, Rechtsgrundlage und gesetzlichen Pflichten.

## 11. UI/UX-Designsystem

### 11.1 Designziele

Die Plattform soll hochwertig, modern, elegant, minimalistisch, professionell, vertrauenswürdig, klar strukturiert sowie schnell und vorhersehbar bedienbar sein.

Die visuelle Ausrichtung ist eher mit hochwertiger Hospitality-, Lifestyle- oder Business-Software vergleichbar als mit einem traditionellen, werbeüberladenen Inserateportal.

### 11.2 Visuelle Prinzipien

- Keine unnötigen Farbverläufe
- Keine dekorativen Glas- und Glanzeffekte
- Keine übermässigen Schatten
- Keine künstliche Überladung mit Icons
- Keine endlosen Dashboard-Karten
- Klare Typografie
- Grosszügige Abstände
- Konsistente Interaktionen
- Zurückhaltende Farbpalette
- Helle und dunkle Darstellung

### 11.3 Komponenten

Das Designsystem umfasst: Header, Navigation, Bottom Navigation, Profilkarten, Suchfelder, Filterchips, Filterdialoge, Tabs, Formulare, Modale Dialoge, Medienslider, Kalender, Chatoberflächen, Tabellen, Statistiken, Benachrichtigungen, Statusanzeigen, Bestätigungsdialoge, Leere Zustände, Fehlermeldungen.

### 11.4 Interaktionsdesign

- Animationen mit klarer Funktion
- Direkte Rückmeldung auf Aktionen
- Vermeidung unnötiger Seitenwechsel
- Tastaturbedienbarkeit
- Barrierearme Farbkontraste
- Respektierung reduzierter Bewegung
- Einheitliche Ladezustände
- Optimistische UI-Aktualisierung nur bei sicher rücksetzbaren Aktionen

### 11.5 Responsive Verhalten

Mobil:

- Fokus auf Discovery und Kommunikation
- Daumenfreundliche Bedienung
- Kompakte Profilkarten
- Filter als Sheet
- Vollbild-Messenger
- Einfacher Terminablauf

Tablet:

- Zwei-Spalten-Layouts
- Erweiterte Profilansichten
- Kombinierte Chat- und Kontaktansicht

Desktop:

- Mehrspaltige Suche
- Sidebar-Navigation
- Umfangreiche Dashboards
- Tabellenansichten
- Parallele Ansichten von Nachrichten und Kalender

## 12. Technische Architektur

### 12.1 Empfohlener Technologie-Stack

| Bereich | Technologie |
| --- | --- |
| Web Framework | Aktuelle stabile Next.js-Version |
| Sprache | TypeScript |
| UI | React |
| Styling | Tailwind CSS |
| Komponenten | shadcn/ui und Radix UI |
| Datenbank | PostgreSQL |
| ORM | Prisma |
| Authentifizierung | Auth.js oder gleichwertige Lösung |
| Dateispeicher | S3-kompatibler Object Storage |
| Suche | Meilisearch oder Typesense |
| Cache und Jobs | Redis-kompatible Infrastruktur und Queue |
| Echtzeit | WebSockets |
| Validierung | Zod |
| Formulare | React Hook Form |
| Internationalisierung | i18n-System |
| Monitoring | Fehlertracking und Metriken |
| Tests | Vitest, Playwright |
| Deployment | Containerbasiert |
| CDN und Schutz | Cloudflare oder gleichwertig |

Hosting- und Storage-Anbieter müssen vor der Auswahl die geplanten Adult-Services-Inhalte und das Geschäftsmodell ausdrücklich zulassen.

### 12.2 Architekturprinzip

Empfohlen wird zunächst ein modularer Monolith, ergänzt durch spezialisierte Hintergrunddienste.

Module:

1. Identity & Authentication
2. User Management
3. Profiles
4. Organizations
5. Verification
6. Search
7. Media
8. Messaging
9. Scheduling
10. Reviews
11. Community
12. Billing
13. Advertising
14. Moderation
15. Notifications
16. Analytics
17. CMS
18. Localization
19. Administration

Vorteil: Die Module bleiben fachlich getrennt, ohne die Komplexität vieler Microservices schon beim MVP tragen zu müssen.

### 12.3 Datenmodell

| Entität | Zweck |
| --- | --- |
| User | Authentifizierte Person |
| AccountRole | Benutzerrollen |
| UserSession | Sitzungsverwaltung |
| Verification | Prüfstatus und Nachweise |
| ProviderProfile | Anbieterprofil |
| ProviderService | Dienstleistungszuordnung |
| ProviderRate | Preisangaben |
| ProviderAvailability | Verfügbarkeit |
| MediaAsset | Bild- und Videodateien |
| Organization | Unternehmen |
| OrganizationMember | Unternehmensberechtigungen |
| OrganizationProvider | Anbieter-Verknüpfungen |
| Location | Regionen und Städte |
| Favorite | Gespeicherte Profile |
| Conversation | Unterhaltung |
| Message | Einzelne Nachricht |
| BookingRequest | Terminanfrage |
| BookingEvent | Terminstatushistorie |
| Review | Bewertung |
| CommunityPost | Beitrag |
| Comment | Kommentar |
| Story | Zeitlich begrenzter Inhalt |
| Tour | Temporärer regionaler Aufenthalt |
| Subscription | Mitgliedschaft |
| Product | Kaufbares Plattformprodukt |
| Invoice | Rechnung |
| Payment | Plattformzahlung |
| AdvertisingCampaign | Werbekampagne |
| Notification | Benachrichtigung |
| ModerationCase | Moderationsvorgang |
| AuditLog | Sicherheitsrelevante Änderungen |
| FeatureFlag | Funktionsaktivierung |
| ConsentRecord | Einwilligungen und Rechtsgrundlagen |

### 12.4 API

Die Anwendung verwendet klar definierte API-Grenzen mit:

- Einheitlicher Validierung
- Authentifizierung
- Autorisierung
- Rate Limiting
- Pagination
- Fehlercodes
- Idempotenz bei Zahlungsaktionen
- Versionierung externer Schnittstellen
- Nachvollziehbaren Administrationsaktionen

### 12.5 Medieninfrastruktur

- Geschützter Objektspeicher
- Separater Medienprozessor
- Bildoptimierung
- Video-Transcoding
- Malware-Prüfung
- Zugriffsregeln
- CDN-Auslieferung
- Lösch- und Sperrprozesse

## 13. Nichtfunktionale Anforderungen

### 13.1 Performance

Zielwerte zum Launch:

- LCP am 75. Perzentil unter 2,5 Sekunden
- INP am 75. Perzentil unter 200 Millisekunden
- CLS am 75. Perzentil unter 0,1
- Typische Suchanfragen am 95. Perzentil unter 500 Millisekunden serverseitiger Antwortzeit
- Kein unnötiger Download grosser Medien vor der Benutzerinteraktion

Diese Werte sind Ziele, keine bereits verifizierten Ergebnisse.

### 13.2 Verfügbarkeit

- Zielverfügbarkeit von 99,9 % nach Stabilisierung
- Automatisierte Datenbank-Backups
- Dokumentierter Wiederherstellungsprozess
- Geprüfte Restore-Tests
- Monitoring kritischer Dienste

### 13.3 Sicherheit

- HTTPS für alle Zugriffe
- Sichere Sessions und Cookies
- CSRF-Schutz
- XSS-Schutz
- Schutz vor SQL-Injection
- Strikte Dateivalidierung
- API-Ratenbegrenzungen
- Schutz vor Enumeration
- Zugriffskontrollen auf Objektebene
- Regelmässige Sicherheitsupdates
- Dependency-Scanning
- Penetrationstest vor öffentlichem Launch

### 13.4 Skalierbarkeit

Die Plattform wird so aufgebaut, dass folgende Komponenten separat skaliert werden können: Webanwendung, Suchmaschine, Messenger, Medienverarbeitung, Hintergrundjobs, Datenspeicherung.

### 13.5 Mehrsprachigkeit

Initial: Deutsch, Französisch, Italienisch, Englisch. Später zusätzliche Sprachen.

Übersetzungen werden zentral verwaltet. Automatische Übersetzung kann später integriert werden, muss jedoch überprüfbar sein und darf sensible private Nachrichten nicht ohne informierte Zustimmung an KI-Dienste senden.

## 14. KI-Funktionen

Priorität: P2

KI soll die Plattform unterstützen, aber nicht dominieren.

### 14.1 Intelligente Suche

Eine natürliche Spracheingabe kann in strukturierte Filter umgewandelt werden.

Beispiel: „Zeige mir verfügbare verifizierte Profile in Zürich.“

Die tatsächlichen Filter werden transparent angezeigt und bleiben manuell änderbar.

### 14.2 Profilassistent

Anbieter können Unterstützung erhalten für:

- Texte verbessern
- Beschreibungen strukturieren
- Sprachliche Fehler korrigieren
- Inhalte übersetzen

Die Anbieter behalten die Kontrolle und müssen Veröffentlichungen bestätigen.

### 14.3 Moderationsunterstützung

KI kann Inhalte nach Risikokategorien vorsortieren und Moderatoren unterstützen.

Automatisierte Erkennung ersetzt keine überprüfbaren Entscheidungsverfahren.

### 14.4 Anbieteranalysen

Mögliche Hilfen:

- Hinweise auf unvollständige Profile
- Verständliche Statistik-Zusammenfassungen
- Empfehlungen für bessere Informationsstruktur
- Hinweise auf technische Medienprobleme

Keine KI-generierten falschen Verifizierungen, Bewertungen oder Nutzeraktivitäten.

## 15. Benachrichtigungssystem

### 15.1 Kanäle

- In-App
- E-Mail
- Web Push, wenn unterstützt und erlaubt

### 15.2 Ereignisse

- Neue Nachricht
- Terminanfrage
- Termin bestätigt
- Terminänderung
- Neue Bewertung
- Profil freigegeben
- Profil eingeschränkt
- Mitgliedschaft läuft ab
- Zahlung erfolgreich oder fehlgeschlagen
- Sicherheitswarnung
- Relevante Community-Aktivität

### 15.3 Einstellungen

Alle nicht notwendigen Benachrichtigungen sind individuell einstellbar.

E-Mails und Push-Nachrichten dürfen auf gesperrten Bildschirmen nicht unbeabsichtigt sensible Details offenlegen.

## 16. SEO, Marketing und Wachstum

### 16.1 Technische SEO

- Sprechende URLs
- Canonical Tags
- XML-Sitemaps
- Strukturierte Metadaten, wo passend
- Indexierbarkeit öffentlicher Inhalte
- Noindex für geschützte und private Bereiche
- Optimierte Ladezeiten
- Server Rendering für geeignete Seiten
- Duplikatvermeidung

### 16.2 Regionale Landingpages

Beispiele: `/ch/zuerich`, `/ch/bern`, `/ch/basel`, `/ch/genf`.

Die tatsächliche URL-Struktur wird konsistent und lokalisierbar umgesetzt.

### 16.3 Programmgesteuerte Seiten

Regionale und kategorische Landingpages können automatisch erzeugt werden, sofern sie tatsächlich nützliche, eigenständige Informationen enthalten.

Es sollen keine massenhaft generierten, inhaltsarmen SEO-Seiten entstehen.

### 16.4 Empfehlungsprogramm

Spätere Möglichkeit:

- Anbieterempfehlungen
- Business-Empfehlungen
- Transparente Gutschriften für zulässige Plattformleistungen

Keine aggressiven oder unerwünschten Einladungsmechanismen.

## 17. Zentrale User Journeys

### Journey A – Besucher entdeckt einen Anbieter

1. Besucher öffnet die Startseite.
2. Altersbezogene Zugangsvoraussetzungen werden geprüft.
3. Besucher sucht nach einer Region.
4. Ergebnisse werden angezeigt.
5. Besucher verändert Filter.
6. Besucher öffnet ein Profil.
7. Profilinformationen und Vertrauenssignale werden angezeigt.
8. Besucher registriert sich bei Bedarf.
9. Besucher stellt Kontakt her.
10. Anbieter entscheidet freiwillig über die Anfrage.

Erfolgsziel: Schnelle Discovery ohne unnötige Schritte.

### Journey B – Einzelanbieter erstellt ein Profil

1. Registrierung.
2. E-Mail-Verifizierung.
3. Alters- und Identitätsprüfung.
4. Auswahl der angebotenen Regionen.
5. Prüfung erforderlicher rechtlicher Voraussetzungen.
6. Ausfüllen strukturierter Profildaten.
7. Medien hinzufügen.
8. Dienstleistungen und Preise verwalten.
9. Verfügbarkeit einstellen.
10. Vorschau öffnen.
11. Profil zur Prüfung einreichen.
12. Freigabe oder begründete Rückmeldung erhalten.
13. Profil wird veröffentlicht.
14. Anbieter kann Nachrichten und Termine verwalten.

Erfolgsziel: Verständliches Onboarding mit klar sichtbarem Fortschritt.

### Journey C – Kunde organisiert einen Termin

1. Profil aufrufen.
2. Verfügbarkeit prüfen.
3. Nachricht oder Terminanfrage senden.
4. Anbieter erhält Benachrichtigung.
5. Beide Seiten stimmen Zeitpunkt ab.
6. Termin wird bestätigt.
7. Beide können ihn verwalten oder absagen.
8. Nach dem Zeitpunkt kann eine zulässige Interaktion bestätigt werden.
9. Optional folgt eine moderierte Bewertung.

Erfolgsziel: Terminorganisation ohne separate Kalender- und Messenger-Anwendungen.

### Journey D – Club verwaltet sein Unternehmen

1. Unternehmenskonto registrieren.
2. Nachweise einreichen.
3. Unternehmen freigeben lassen.
4. Standort erstellen.
5. Mitarbeiterrollen definieren.
6. Anbieter zur Verknüpfung einladen.
7. Freigegebene Profile darstellen.
8. Unternehmensangebote verwalten.
9. Kampagnen buchen.
10. Unternehmensstatistiken auswerten.

Erfolgsziel: Professionelle Organisation bei Erhalt individueller Anbieterrechte.

## 18. MVP und Produktphasen

### Phase 0 – Grundlagen und Freigaben

Vor der produktiven Implementierung klären:

- Geschäftsmodell und rechtliche Einordnung
- Kantonale Rahmenbedingungen
- Alters- und Identitätsprüfung
- Datenschutz-Folgenabschätzung
- Hosting- und Medienrichtlinien
- Zahlungsanbieter
- Moderationskonzept
- Sicherheitsmodell
- Finale Produktstruktur

Release Gate: Keine öffentliche Einführung ohne funktionierende Kernschutzmassnahmen und geklärte rechtliche Voraussetzungen.

### Phase 1 – Marketplace MVP

Enthält: Registrierung, Rollen, Alters- und Identitätsprüfung, Anbieterprofile, Unternehmensprofile, Bilder, Dienstleistungen, Preise, Regionen, Suche und Filter, Favoriten, Messenger, Terminanfragen, Verfügbarkeit, Grundlegende Bewertungen, Admin-Panel, Moderation, Basisstatistiken, Mehrsprachigkeit.

Ziel: Ein funktionierender Marktplatz mit vollständig geschlossenem Kernablauf.

### Phase 2 – Monetarisierung und Anbieterwerkzeuge

Pro-Abonnements, Business-Abonnements, Bezahlte Platzierungen, Rechnungsverwaltung, Erweitertes Dashboard, Chat-Tags, Nachrichtenvorlagen, Erweiterte Kalenderfunktionen, Kampagnenverwaltung.

### Phase 3 – Community

Feed, Stories, Reels, Blogs, Events, Touren, Erweiterte Benachrichtigungen, Folgen von Profilen.

### Phase 4 – Plattform-Ökosystem

Forum, KI-Suchassistent, KI-Profilassistent, Automatische Übersetzungen, Unternehmensanalysen, Optionale API, Erweiterte mobile Nutzung, Weitere Länder.

## 19. Messbare Erfolgskriterien

### 19.1 Marktplatz-Kennzahlen

- Anzahl verifizierter aktiver Anbieter
- Anzahl aktiver Regionen
- Anteil vollständiger Profile
- Suchanfragen pro Besucher
- Suchanfragen mit Profilaufruf
- Profilaufrufe mit Kontaktaktion
- Neue Gespräche
- Bestätigte Terminanfragen

### 19.2 Anbieter-Kennzahlen

- Erfolgreich abgeschlossene Verifizierungen
- Zeit bis zur Profilfreigabe
- Anteil aktiver Profile
- Reaktionsquote auf Anfragen
- Wiederkehrende Anbieter
- Nutzung des Kalenders
- Nutzung des Business-Dashboards

### 19.3 Geschäftskennzahlen

- Zahlende Anbieter
- Wiederkehrender Plattformumsatz
- Durchschnittlicher Umsatz pro zahlendem Account
- Werbekampagnen-Nutzung
- Kündigungsquote
- Zahlungsfehlerquote
- Supportkosten pro Account

### 19.4 Vertrauens- und Sicherheitskennzahlen

- Moderationsbearbeitungszeit
- Anteil berechtigter Meldungen
- Anzahl kritischer Sicherheitsvorfälle
- Quote erfolgreich bearbeiteter Löschanfragen
- Verifizierungsfehler
- Einsprüche gegen Moderationsentscheidungen
- Nachgewiesene falsche Profilangaben

Wichtig: Wachstumskennzahlen dürfen nicht dazu führen, dass riskante Profile schneller oder ohne ausreichende Prüfung veröffentlicht werden.

## 20. Qualitätssicherung und Abnahmekriterien

### 20.1 Registrierung

- Ein neuer Benutzer kann einen Account erstellen.
- E-Mail-Verifizierung funktioniert.
- Nicht verifizierte Benutzer haben keinen unberechtigten Zugang.
- Passwort-Reset funktioniert.
- Session-Verwaltung ist sicher.

### 20.2 Profile

- Anbieter können Profile als Entwurf speichern.
- Veröffentlichung ist erst nach notwendigen Prüfungen möglich.
- Medien sind korrekt geschützt.
- Änderungen werden nach Berechtigungen verarbeitet.
- Profile können selbstständig pausiert werden.

### 20.3 Suche

- Alle öffentlich zulässigen Profile sind suchbar.
- Filterkombinationen liefern korrekte Resultate.
- Gesponserte Resultate sind klar gekennzeichnet.
- Private und gesperrte Profile erscheinen nicht versehentlich.
- Pagination und Sortierung funktionieren.

### 20.4 Messenger

- Nachrichten werden korrekt zugestellt.
- Nicht berechtigte Personen können Chats nicht lesen.
- Blockierte Kontakte können keine weiteren Nachrichten senden.
- Nachrichtenzustände bleiben konsistent.
- Meldungen werden an die Moderation übergeben.

### 20.5 Termine

- Verfügbarkeiten sind korrekt.
- Doppelbuchungen werden verhindert, sofern eine verbindliche Exklusivbelegung eingestellt wurde.
- Terminanfragen können angenommen, abgelehnt und abgesagt werden.
- Jede Statusänderung ist nachvollziehbar.
- Private Terminangaben werden geschützt.

### 20.6 Administration

- Rollenrechte werden in jedem API-Endpunkt geprüft.
- Moderationsentscheidungen werden protokolliert.
- Kritische Änderungen benötigen passende Berechtigungen.
- Ausstehende Verifizierungen sind bearbeitbar.
- Gesperrte Inhalte werden zuverlässig verborgen.

### 20.7 Sicherheit

- Erfolgreicher unabhängiger Sicherheitscheck
- Wiederherstellung aus Backup getestet
- Sensible Daten vor unbeabsichtigtem Zugriff geschützt
- Missbrauchsmeldungen vollständig funktionsfähig
- Notfall-Sperrungen möglich
- Datenschutz- und Sicherheitsdokumentation abgeschlossen

## 21. Zentrale Risiken

| Risiko | Auswirkung | Gegenmassnahme |
| --- | --- | --- |
| Rechtliche Unterschiede zwischen Regionen | Hoch | Länder- und Kantonsfreigaben, rechtliche Prüfung |
| Missbrauch und Identitätsfälschung | Kritisch | Verifizierung, Moderation, Eskalationsprozesse |
| Verletzung der Privatsphäre | Kritisch | Datensparsamkeit, Verschlüsselung, Rechtekontrollen |
| Ungeeigneter Zahlungsanbieter | Hoch | Vorabklärung und ausdrückliche Freigabe |
| Ungeeignete Hostingbedingungen | Hoch | Verbindliche Prüfung der Nutzungsbedingungen |
| Zu wenige Anbieter zum Start | Hoch | Regional fokussierter Launch |
| Zu komplexe erste Version | Hoch | Konsequente Priorisierung |
| Hohe Moderationskosten | Hoch | Effiziente Werkzeuge, klare Regeln, kontrollierte Expansion |
| Betrügerische Bewertungen | Mittel bis hoch | Qualifizierende Interaktionen, Einsprüche |
| Missbrauch von Unternehmensrechten | Hoch | Anbieterautonomie und granulare Berechtigungen |

## 22. Produkteinführung und Wachstum

### 22.1 Startmarkt

Empfohlen wird eine kontrollierte Einführung in ausgewählten Schweizer Regionen.

Zunächst sollten genügend verifizierte Anbieterprofile, funktionierende Moderationsprozesse und eine zuverlässige Suche vorhanden sein, bevor die Plattform umfassend öffentlich beworben wird.

### 22.2 Angebotsseite zuerst aufbauen

Ein Marktplatz ohne ausreichend hochwertige Profile hat für Besucher nur einen geringen Nutzen.

Daher:

- Erste Anbieter gezielt gewinnen
- Kostenloses Basic-Modell anbieten
- Onboarding möglichst unkompliziert gestalten
- Hohe Profilqualität fördern
- Support für erste Anbieter bereitstellen
- Verifizierungen zuverlässig bearbeiten

### 22.3 Öffentliche Einführung

Erst wenn die Kernfunktionen und das Angebot ausreichend stabil sind:

- Regionale SEO-Landingpages aktivieren
- Organische Reichweite aufbauen
- Redaktionelle Inhalte veröffentlichen
- Zulässige Marketingkanäle testen
- Nutzerfeedback auswerten
- Conversion-Probleme beheben

### 22.4 Expansion

Neue Regionen werden schrittweise nach rechtlicher Freigabe, ausreichender Moderationskapazität und verfügbarer Anbieterbasis aktiviert.

## 23. Abschliessende Produktentscheidung

Die Plattform wird nicht als reines Anzeigen-CMS entwickelt.

Sie wird von Anfang an als modularer Marketplace mit integriertem Kommunikations- und Business-System geplant.

Die wichtigsten Architekturentscheidungen:

1. Ein gemeinsames Benutzersystem für alle Kontotypen.
2. Persönliche Anbieterprofile bleiben organisatorisch unabhängig.
3. Regionen und rechtliche Anforderungen sind zentral konfigurierbar.
4. Suche und Profile sind eigenständige, skalierbare Domänen.
5. Messenger und Kalender bilden einen gemeinsamen Kernprozess.
6. Vertrauen und bezahlte Sichtbarkeit werden strikt getrennt.
7. Moderation ist ein Kernbestandteil und kein nachträgliches Plugin.
8. Community-Module können unabhängig aktiviert und erweitert werden.
9. Die erste Version bleibt finanziell und betrieblich beherrschbar.
10. Die Plattform bietet eine langfristige Grundlage für ein umfangreiches digitales Ökosystem.

Produktziel: Einen der benutzerfreundlichsten und professionellsten spezialisierten Marktplätze im DACH-Raum aufbauen – mit einem klaren Fokus auf Sicherheit, Anbieterautonomie, hochwertige Benutzererfahrung und langfristige Skalierbarkeit.

Ende PRD v1.0
