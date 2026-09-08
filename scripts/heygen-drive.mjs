#!/usr/bin/env node
/**
 * Persistent HeyGen driver (MCP-style): ONE long-lived Chrome you can also touch by hand,
 * driven over CDP so it never closes between steps.
 *
 *   node scripts/heygen-drive.mjs serve     # opens Chrome on the logged-in profile, stays open (run in bg)
 *   node scripts/heygen-drive.mjs check      # screenshot + describe current page (auth check)
 *   node scripts/heygen-drive.mjs goto <url>
 *   node scripts/heygen-drive.mjs click "<visible text>"   # follows a new tab if one opens
 *   node scripts/heygen-drive.mjs inspect <query>
 *   node scripts/heygen-drive.mjs upload <abs-file-path>    # sets the first file input
 *
 * Env: HEYGEN_PROFILE (reuse a logged-in profile), HEYGEN_CHANNEL=chrome
 * Screenshots -> /tmp/heygen/*.png
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const PROFILE = process.env.HEYGEN_PROFILE || path.join(ROOT, ".heygen-profile");
const PORT = 9222;
const SHOTS = "/tmp/heygen";
fs.mkdirSync(SHOTS, { recursive: true });

const mode = process.argv[2] || "check";

async function describe(page) {
  const info = await page.evaluate(() => ({
    inputs: [...document.querySelectorAll("input,textarea")].map((i) => ({ type: i.type || i.tagName, name: i.name, ph: i.placeholder })),
    buttons: [...document.querySelectorAll("button,a[role=button],[role=tab]")].map((b) => (b.innerText || "").trim()).filter(Boolean).slice(0, 30),
    fileInputs: document.querySelectorAll('input[type=file]').length,
    loggedOut: /log ?in|sign ?in|sign ?up/i.test(document.body.innerText.slice(0, 4000)),
  }));
  console.log("  url:", page.url());
  console.log("  inputs:", JSON.stringify(info.inputs).slice(0, 300));
  console.log("  buttons:", JSON.stringify(info.buttons));
  console.log("  fileInputs:", info.fileInputs, "| looksLoggedOut:", info.loggedOut);
}
const snap = async (page, name) => { await page.screenshot({ path: path.join(SHOTS, name) }).catch(() => {}); console.log("  shot:", name); };

async function serve() {
  for (const f of ["SingletonLock", "SingletonCookie", "SingletonSocket"]) fs.rmSync(path.join(PROFILE, f), { force: true });
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    headless: false,
    channel: process.env.HEYGEN_CHANNEL || undefined,
    viewport: { width: 1440, height: 900 },
    // hide the automation flags so Google SSO does not reject the sign-in
    ignoreDefaultArgs: ["--enable-automation"],
    args: [`--remote-debugging-port=${PORT}`, "--disable-blink-features=AutomationControlled"],
  });
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto("https://app.heygen.com/home", { waitUntil: "domcontentloaded" }).catch(() => {});
  console.log(`SERVING heygen on CDP :${PORT} — window stays open. Log in by hand if needed.`);
  await new Promise(() => {}); // hold the browser open
}

async function connect() {
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  const page = pages[pages.length - 1];
  return { browser, ctx, page };
}

async function drive() {
  const { browser, ctx, page } = await connect();
  const arg = process.argv[3];
  try {
    if (mode === "goto") { await page.goto(arg, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(4000); }
    if (mode === "inspect") {
      const q = (arg || "avatar").toLowerCase();
      const hits = await page.evaluate((n) => [...document.querySelectorAll("button,a,[role=button],[role=tab],div,span")]
        .map((e) => ({ t: (e.innerText || "").trim(), c: (e.className || "").toString().slice(0, 40) }))
        .filter((x) => x.t && x.t.length < 45 && x.t.toLowerCase().includes(n)).slice(0, 25), q);
      console.log(JSON.stringify(hits, null, 1));
    }
    if (mode === "click") {
      const before = ctx.pages().length;
      await page.getByText(arg, { exact: false }).first().click({ timeout: 8000 }).catch((e) => console.log("  click err:", e.message));
      await page.waitForTimeout(3500);
      const after = ctx.pages();
      const active = after.length > before ? after[after.length - 1] : page;
      await active.waitForLoadState("domcontentloaded").catch(() => {});
      await active.waitForTimeout(3000);
      await snap(active, `click-${(arg || "x").replace(/\W+/g, "-").slice(0, 18)}.png`);
      await describe(active);
      browser.close(); return;
    }
    if (mode === "signin") {
      const env = Object.fromEntries(fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")
        .filter((l) => l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; }));
      const email = page.getByPlaceholder(/enter your.*email/i).first();
      if (await email.count()) { await email.fill(env.HEYGEN_EMAIL); console.log("  filled email"); }
      await page.getByRole("button", { name: /use password/i }).first().click({ timeout: 4000 }).catch(() => {});
      await page.getByRole("button", { name: /^continue$|^next$/i }).first().click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const pass = page.locator('input[type=password]').first();
      await pass.waitFor({ timeout: 6000 }).catch(() => {});
      if (await pass.count()) { await pass.fill(env.HEYGEN_PASSWORD); console.log("  filled password"); }
      await snap(page, "signin-filled.png");
      await page.getByRole("button", { name: /sign ?in|log ?in|verify|continue/i }).first().click({ timeout: 5000 }).catch((e) => console.log("  submit err:", e.message));
      await page.waitForTimeout(7000);
      await snap(page, "signin-after.png");
      await describe(page);
      browser.close(); return;
    }
    if (mode === "upload") {
      await page.locator('input[type=file]').first().setInputFiles(arg);
      await page.waitForTimeout(4000);
    }
    await snap(page, `${mode}.png`);
    await describe(page);
  } finally { browser.close(); } // disconnects CDP only; served browser stays open
}

(mode === "serve" ? serve() : drive()).catch((e) => { console.error(e.message); process.exit(1); });
