import { describe, expect, it } from "vitest";
import { REALTIME_TOKEN_TTL_MS, createRealtimeToken, verifyRealtimeToken } from "./realtime-token";

const secret = "s".repeat(32);
const now = 1_800_000_000_000;

describe("Echtzeit-Token", () => {
  it("liefert die Konto-ID eines gültigen Tokens", () => {
    expect(verifyRealtimeToken(createRealtimeToken("user_1", secret, now), secret, now + 1)).toBe("user_1");
  });
  it("lehnt abgelaufene Token ab", () => {
    const token = createRealtimeToken("user_1", secret, now);
    expect(verifyRealtimeToken(token, secret, now + REALTIME_TOKEN_TTL_MS + 1)).toBeNull();
  });
  it("lehnt fremde Signaturen und vertauschte Konto-IDs ab", () => {
    const token = createRealtimeToken("user_1", secret, now);
    const other = createRealtimeToken("user_2", secret, now);
    const swapped = [other.split(".")[0], ...token.split(".").slice(1)].join(".");
    expect(verifyRealtimeToken(swapped, secret, now)).toBeNull();
    expect(verifyRealtimeToken(createRealtimeToken("user_1", "x".repeat(32), now), secret, now)).toBeNull();
    expect(verifyRealtimeToken(null, secret, now)).toBeNull();
    expect(verifyRealtimeToken("a.b", secret, now)).toBeNull();
  });
});
