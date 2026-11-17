import { describe, expect, it } from "vitest";
import { isTestProviderEnabled } from "./test-provider";

describe("Test-Dienstleister /dev/verifizierung", () => {
  it("existiert mit IDENTITY_PROVIDER=test ausserhalb der Produktion", () => {
    expect(isTestProviderEnabled({ APP_ENV: "test", IDENTITY_PROVIDER: "test" })).toBe(true);
    expect(
      isTestProviderEnabled({
        APP_ENV: "development",
        IDENTITY_PROVIDER: "test",
      }),
    ).toBe(true);
    expect(isTestProviderEnabled({ IDENTITY_PROVIDER: "test" })).toBe(true);
  });

  it("existiert nicht ohne IDENTITY_PROVIDER=test", () => {
    expect(isTestProviderEnabled({ APP_ENV: "test" })).toBe(false);
    expect(isTestProviderEnabled({ APP_ENV: "test", IDENTITY_PROVIDER: "other" })).toBe(false);
  });

  it("existiert in der Produktion nie, auch nicht mit IDENTITY_PROVIDER=test", () => {
    expect(
      isTestProviderEnabled({
        APP_ENV: "production",
        IDENTITY_PROVIDER: "test",
      }),
    ).toBe(false);
  });
});
