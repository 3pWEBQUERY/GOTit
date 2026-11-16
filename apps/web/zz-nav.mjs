import { chromium } from "playwright-core";
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("framenavigated", (f) => { if (f === page.mainFrame()) console.log("NAV", Date.now() % 100000, f.url()); });
page.on("console", (m) => console.log("CONSOLE", m.type(), m.text().slice(0, 300)));
page.on("pageerror", (e) => console.log("PAGEERROR", e.message.slice(0, 300)));
await page.goto("http://localhost:3000/de/alterspruefung");
await page.waitForTimeout(6000);
await browser.close();
