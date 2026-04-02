#!/usr/bin/env node
/**
 * Takes an authenticated screenshot of a localhost page.
 * Usage: node scripts/screenshot.mjs <path> <output>
 * Example: node scripts/screenshot.mjs /dashboard/projects/abc123/model /tmp/screenshot.png
 */

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://egcgluafjzimgqhcaram.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = "http://localhost:3000";
const PROJECT_REF = "egcgluafjzimgqhcaram";

const pagePath = process.argv[2] || "/dashboard";
const outputPath = process.argv[3] || "/tmp/screenshot.png";

async function main() {
  // 1. Get a user and generate a session via admin API
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { users } } = await supabase.auth.admin.listUsers();
  if (!users || users.length === 0) {
    console.error("No users found");
    process.exit(1);
  }

  const user = users[0];
  console.log(`Using user: ${user.email}`);

  // Generate a magic link and verify it server-side to get a session
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: user.email,
  });

  if (linkError) {
    console.error("Failed to generate link:", linkError.message);
    process.exit(1);
  }

  // Verify the OTP to get a session
  const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });

  if (verifyError || !sessionData.session) {
    console.error("Failed to verify OTP:", verifyError?.message || "no session");
    process.exit(1);
  }

  const session = sessionData.session;
  console.log("Session obtained");

  // 2. Build the cookie value that @supabase/ssr expects
  // It stores the session as a JSON string, chunked into cookies named
  // sb-{ref}-auth-token.{chunk_index}
  const cookieValue = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type,
    user: session.user,
  });

  // Supabase SSR chunks cookies at ~3180 chars
  const CHUNK_SIZE = 3180;
  const chunks = [];
  for (let i = 0; i < cookieValue.length; i += CHUNK_SIZE) {
    chunks.push(cookieValue.slice(i, i + CHUNK_SIZE));
  }

  const cookies = chunks.map((chunk, index) => ({
    name: `sb-${PROJECT_REF}-auth-token.${index}`,
    value: chunk,
    domain: "localhost",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
  }));

  console.log(`Setting ${cookies.length} auth cookie chunk(s)`);

  // 3. Launch browser, set cookies, navigate to target page
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  await context.addCookies(cookies);

  const page = await context.newPage();
  const targetUrl = `${BASE_URL}${pagePath}`;
  console.log(`Navigating to ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: "networkidle" });

  // Wait for client-side rendering
  await page.waitForTimeout(2000);

  // Scroll down if --scroll=N flag (pixels)
  const scrollArg = process.argv.find(a => a.startsWith("--scroll"));
  if (scrollArg) {
    const px = parseInt(scrollArg.split("=")[1]) || 99999;
    await page.evaluate((scrollPx) => {
      const candidates = document.querySelectorAll('[class*="overflow-y-auto"]');
      for (const el of candidates) {
        if (el.scrollHeight > el.clientHeight) {
          el.scrollTop = scrollPx;
          break;
        }
      }
    }, px);
    await page.waitForTimeout(500);
  }

  const fullPage = process.argv.includes("--full");
  await page.screenshot({ path: outputPath, fullPage });
  console.log(`Screenshot saved to ${outputPath}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
