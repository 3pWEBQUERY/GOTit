import { describe, expect, it } from "vitest";
import { canonicalRedirectUrl } from "./canonical-host";

const production = { APP_ENV: "production", APP_URL: "https://thegnd.net" };

describe("Kanonischer Host", () => {
  it("leitet www und die Railway-Domain mit Pfad und Suche auf APP_URL um", () => {
    expect(canonicalRedirectUrl({ host: "www.thegnd.net", pathname: "/de/suche", search: "?ort=basel" }, production)).toBe("https://thegnd.net/de/suche?ort=basel");
    expect(canonicalRedirectUrl({ host: "web-production-1.up.railway.app", pathname: "/de", search: "" }, production)).toBe("https://thegnd.net/de");
  });

  it("lässt den kanonischen Host in Ruhe, auch in Grossschreibung", () => {
    expect(canonicalRedirectUrl({ host: "THEGND.NET", pathname: "/de", search: "" }, production)).toBeNull();
  });

  it("nur in production und staging, nur mit https und gültiger APP_URL", () => {
    expect(canonicalRedirectUrl({ host: "localhost:3000", pathname: "/de", search: "" }, { APP_ENV: "test", APP_URL: "https://thegnd.net" })).toBeNull();
    expect(canonicalRedirectUrl({ host: "x", pathname: "/", search: "" }, { APP_ENV: "production", APP_URL: "http://thegnd.net" })).toBeNull();
    expect(canonicalRedirectUrl({ host: "x", pathname: "/", search: "" }, { APP_ENV: "production" })).toBeNull();
    expect(canonicalRedirectUrl({ host: null, pathname: "/", search: "" }, production)).toBeNull();
  });
});
