import { REVIEW_TEXT_MAX } from "@app/core/review/schemas";
import { describe, expect, it } from "vitest";
import {
  countedLength,
  emptyReviewForm,
  reasonError,
  reviewFormErrors,
  toReviewInput,
} from "./form";
import { appealView, decisionsFrom } from "./status";

const filled = () => ({
  ratings: { communication: 4, accuracy: 5, organization: 3, overall: 4 },
  text: "Fiktive Bewertung, freundlich und pünktlich.",
});

describe("Formular der Bewertung", () => {
  it("meldet jede Kategorie ohne Wahl und den zu kurzen Text", () => {
    expect(reviewFormErrors(emptyReviewForm())).toEqual({
      communication: "ratingMissing",
      accuracy: "ratingMissing",
      organization: "ratingMissing",
      overall: "ratingMissing",
      text: "textTooShort",
    });
  });

  it("zählt wie der Kern: Leerraum aussen und Zeilenenden zählen nicht doppelt", () => {
    expect(countedLength("  ab\r\ncd  ")).toBe(5);
    const values = { ...filled(), text: `   ${"a".repeat(19)}   ` };
    expect(reviewFormErrors(values)).toEqual({ text: "textTooShort" });
  });

  it("begrenzt den Text nach oben", () => {
    const values = { ...filled(), text: "a".repeat(REVIEW_TEXT_MAX + 1) };
    expect(reviewFormErrors(values)).toEqual({ text: "textTooLong" });
  });

  it("ein vollständiges Formular ergibt die Eingabe des Kerns", () => {
    expect(reviewFormErrors(filled())).toEqual({});
    expect(toReviewInput(filled())).toEqual({
      communication: 4,
      accuracy: 5,
      organization: 3,
      overall: 4,
      text: "Fiktive Bewertung, freundlich und pünktlich.",
    });
  });

  it("Gründe brauchen mindestens 10 Zeichen ohne Leerraum aussen", () => {
    expect(reasonError("   kurz    ", 1000)).toBe("reasonTooShort");
    expect(reasonError("Zehn Zeich", 1000)).toBeNull();
    expect(reasonError("a".repeat(11), 10)).toBe("reasonTooLong");
  });
});

describe("Einspruch je Seite", () => {
  it("der Autor gegen Abgelehnt und Entfernt, der Anbieter gegen Veröffentlicht", () => {
    expect(appealView("MEMBER", "REJECTED", []).canAppeal).toBe(true);
    expect(appealView("MEMBER", "REMOVED", []).canAppeal).toBe(true);
    expect(appealView("MEMBER", "PUBLISHED", []).canAppeal).toBe(false);
    expect(appealView("MEMBER", "PENDING", []).canAppeal).toBe(false);
    expect(appealView("PROVIDER", "PUBLISHED", []).canAppeal).toBe(true);
    expect(appealView("PROVIDER", "REMOVED", []).canAppeal).toBe(false);
  });

  it("ein offener Einspruch sperrt einen zweiten; der letzte Entscheid bleibt sichtbar", () => {
    expect(appealView("PROVIDER", "PUBLISHED", [{ status: "OPEN" }])).toEqual({
      open: true,
      canAppeal: false,
      last: null,
    });
    expect(
      appealView("PROVIDER", "PUBLISHED", [
        { status: "UPHELD" },
        { status: "DISMISSED" },
      ]),
    ).toEqual({ open: false, canAppeal: true, last: "DISMISSED" });
  });
});

describe("Entscheide der Moderation", () => {
  it("folgen den Übergängen des Kerns", () => {
    expect(decisionsFrom("PENDING")).toEqual(["PUBLISHED", "REJECTED"]);
    expect(decisionsFrom("PUBLISHED")).toEqual(["REMOVED"]);
    expect(decisionsFrom("REJECTED")).toEqual(["PUBLISHED"]);
    expect(decisionsFrom("REMOVED")).toEqual(["PUBLISHED"]);
  });
});
