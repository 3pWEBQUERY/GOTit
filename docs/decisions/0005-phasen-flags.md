# 0005 Navigationsziele späterer Phasen

Die Seitenleiste und die Menüs der PRD enthalten Ziele aus Phase 2 (Werbung, Abrechnung, Team, Angebote, Organisations-Kalender und -Statistik) und Phase 3 (Community, Beiträge). Sie hängen an zwei Feature Flags: `business-suite` und `community`. Beide sind aus; die Einträge erscheinen erst, wenn die Phase gebaut und das Flag eingeschaltet ist. So zeigt die Navigation keine Ziele, die es noch nicht gibt.

Ziele aus Phase 1, deren Schritt noch aussteht, sind sichtbar und führen bis dahin auf die 404-Seite mit nächstem Schritt.
