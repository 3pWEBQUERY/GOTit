/** Übersetzte Pfade des Mitgliederbereichs (PRD 7.5). */
export const memberPathnames = {
  "/ich": { de: "/ich", fr: "/moi", it: "/io", en: "/me" },
  "/nachrichten": { de: "/nachrichten", fr: "/messages", it: "/messaggi", en: "/messages" },
  "/nachrichten/[id]": { de: "/nachrichten/[id]", fr: "/messages/[id]", it: "/messaggi/[id]", en: "/messages/[id]" },
  "/termine": { de: "/termine", fr: "/rendez-vous", it: "/appuntamenti", en: "/appointments" },
  "/favoriten": { de: "/favoriten", fr: "/favoris", it: "/preferiti", en: "/favourites" },
  "/favoriten/[sammlung]": { de: "/favoriten/[sammlung]", fr: "/favoris/[sammlung]", it: "/preferiti/[sammlung]", en: "/favourites/[sammlung]" },
  "/suchen": { de: "/suchen", fr: "/recherches", it: "/ricerche", en: "/searches" },
  "/bewertungen": { de: "/bewertungen", fr: "/avis", it: "/recensioni", en: "/reviews" },
  "/benachrichtigungen": { de: "/benachrichtigungen", fr: "/notifications", it: "/notifiche", en: "/notifications" },
  "/einstellungen/profil": { de: "/einstellungen/profil", fr: "/parametres/profil", it: "/impostazioni/profilo", en: "/settings/profile" },
  "/einstellungen/sicherheit": { de: "/einstellungen/sicherheit", fr: "/parametres/securite", it: "/impostazioni/sicurezza", en: "/settings/security" },
  "/einstellungen/privatsphaere": {
    de: "/einstellungen/privatsphaere",
    fr: "/parametres/confidentialite",
    it: "/impostazioni/privacy",
    en: "/settings/privacy",
  },
  "/einstellungen/benachrichtigungen": {
    de: "/einstellungen/benachrichtigungen",
    fr: "/parametres/notifications",
    it: "/impostazioni/notifiche",
    en: "/settings/notifications",
  },
  "/einstellungen/daten": { de: "/einstellungen/daten", fr: "/parametres/donnees", it: "/impostazioni/dati", en: "/settings/data" },
  "/einstellungen/darstellung": {
    de: "/einstellungen/darstellung",
    fr: "/parametres/affichage",
    it: "/impostazioni/aspetto",
    en: "/settings/appearance",
  },
} as const;
