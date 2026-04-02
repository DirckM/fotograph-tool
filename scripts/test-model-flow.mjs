#!/usr/bin/env node
/**
 * End-to-end visual test for the Model Generation flow.
 * Runs through the real pipeline (hits Gemini) and screenshots every step.
 *
 * Usage:
 *   node scripts/test-model-flow.mjs [--project=<id>] [--skip-generate] [--angles=1]
 *
 * Options:
 *   --project=<id>   Use an existing project (skips creation)
 *   --skip-generate  Skip face generation (use existing face in project)
 *   --angles=N       How many angles to generate (0-5, default 1)
 *   --refine         Also test the refinement flow
 *
 * Results are saved to test-results/<timestamp>/
 */

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = "http://localhost:3000";
const PROJECT_REF = "egcgluafjzimgqhcaram";

// Parse CLI args
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  })
);

const angleCount = parseInt(args.angles ?? "1");
const skipGenerate = args["skip-generate"] === "true";
const doRefine = args.refine === "true";
let projectId = args.project;

// Results directory
const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const resultsDir = path.resolve(`test-results/${timestamp}`);
fs.mkdirSync(resultsDir, { recursive: true });

const log = (msg) => {
  const time = new Date().toLocaleTimeString();
  console.log(`[${time}] ${msg}`);
};

async function screenshot(page, name) {
  const filePath = path.join(resultsDir, `${name}.png`);
  await page.screenshot({ path: filePath });
  log(`  Screenshot: ${name}.png`);
  return filePath;
}

async function getSession() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { users },
  } = await supabase.auth.admin.listUsers();
  const user = users[0];
  log(`Authenticating as ${user.email}`);

  const {
    data: linkData,
  } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: user.email,
  });

  const {
    data: sessionData,
  } = await supabase.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });

  const session = sessionData.session;
  const cookieValue = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type,
    user: session.user,
  });

  const CHUNK_SIZE = 3180;
  const chunks = [];
  for (let i = 0; i < cookieValue.length; i += CHUNK_SIZE) {
    chunks.push(cookieValue.slice(i, i + CHUNK_SIZE));
  }

  return chunks.map((chunk, index) => ({
    name: `sb-${PROJECT_REF}-auth-token.${index}`,
    value: chunk,
    domain: "localhost",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
  }));
}

async function main() {
  const cookies = await getSession();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  await context.addCookies(cookies);
  const page = await context.newPage();

  // If no project specified, use the first available one
  if (!projectId) {
    log("Finding a project to test with...");
    await page.goto(`${BASE_URL}/api/projects`, { waitUntil: "networkidle" });
    const projectsText = await page.textContent("body");
    const projects = JSON.parse(projectsText);
    if (projects.length === 0) {
      log("No projects found. Seed some first: POST /api/projects/seed");
      process.exit(1);
    }
    // Pick a project at stage 1
    const stageOneProject = projects.find((p) => p.current_stage === 1);
    projectId = stageOneProject?.id ?? projects[0].id;
    log(`Using project: ${projectId}`);
  }

  const modelUrl = `${BASE_URL}/dashboard/projects/${projectId}/model`;

  // ── Step 1: Load the model page ──
  log("Step 1: Loading model page...");
  await page.goto(modelUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await screenshot(page, "01-model-page-loaded");

  // Check if face already exists (skip to refinement)
  const hasExistingFace = await page.$('text="Refinement"');

  if (!hasExistingFace && !skipGenerate) {
    // ── Step 2: Fill in description and generate face ──
    log("Step 2: Generating face...");

    // Check if description field exists (pre-generation state)
    const descriptionField = await page.$(
      'textarea[id="model-description"]'
    );
    if (descriptionField) {
      await descriptionField.fill(
        "Young man, early 20s, light skin with prominent freckles, short cropped red-blonde hair, sharp blue eyes, strong jawline, athletic build. Clean-shaven, symmetrical features."
      );
      await page.waitForTimeout(500);
      await screenshot(page, "02-description-filled");

      // Click Generate Face
      const generateBtn = await page.$('button:has-text("Generate Face")');
      if (generateBtn) {
        log("  Clicking Generate Face (this will call Gemini - may take 30-60s)...");
        await generateBtn.click();
        await screenshot(page, "03-generating-face");

        // Wait for the job to complete (poll for the Refinement heading to appear)
        log("  Waiting for generation to complete...");
        try {
          await page.waitForSelector('text="Refinement"', {
            timeout: 120000,
          });
          await page.waitForTimeout(2000);
          log("  Face generated!");
          await screenshot(page, "04-face-generated");
        } catch {
          log("  WARNING: Face generation timed out after 2 minutes");
          await screenshot(page, "04-face-generation-timeout");
        }
      }
    }
  } else if (hasExistingFace) {
    log("Step 2: Face already exists, skipping generation");
    await screenshot(page, "02-existing-face");
  }

  // ── Step 3: Refinement (optional) ──
  if (doRefine) {
    log("Step 3: Testing refinement flow...");

    // Scroll to see refinement controls
    const refinePrompt = await page.$(
      'textarea[placeholder="Describe what should change in the masked area..."]'
    );
    if (refinePrompt) {
      await refinePrompt.fill("Make the eyes slightly brighter and more vivid blue");
      await page.waitForTimeout(300);

      // Click the Refine button (will show toast if no mask painted)
      const refineBtn = await page.$('button:has-text("Refine")');
      if (refineBtn) {
        await refineBtn.click();
        await page.waitForTimeout(1000);
        await screenshot(page, "05-refine-toast-or-processing");
      }
    }
  }

  // ── Step 4: Scroll to angle generation ──
  log("Step 4: Scrolling to angle generation...");
  const scrollContainer = await page.evaluateHandle(() => {
    const candidates = document.querySelectorAll('[class*="overflow-y-auto"]');
    for (const el of candidates) {
      if (el.scrollHeight > el.clientHeight) return el;
    }
    return null;
  });

  if (scrollContainer) {
    await scrollContainer.evaluate((el) => (el.scrollTop = 500));
    await page.waitForTimeout(500);
    await screenshot(page, "06-angle-section-visible");
  }

  // ── Step 5: Generate angles ──
  if (angleCount > 0) {
    const angleLabels = ["Front", "3/4 Left", "3/4 Right", "Profile L", "Profile R"];

    for (let i = 0; i < Math.min(angleCount, 5); i++) {
      const label = angleLabels[i];
      log(`Step 5.${i + 1}: Generating angle "${label}" (calling Gemini)...`);

      const angleBtn = await page.$(`button:has-text("${label}")`);
      if (angleBtn) {
        await angleBtn.click();
        await screenshot(page, `07-angle-${i + 1}-generating`);

        // Wait for this angle to complete
        log(`  Waiting for "${label}" to complete...`);
        try {
          // Wait for the button to get a green checkmark (done state)
          await page.waitForFunction(
            (lbl) => {
              const btns = document.querySelectorAll("button");
              for (const btn of btns) {
                if (
                  btn.textContent.includes(lbl) &&
                  btn.className.includes("green")
                ) {
                  return true;
                }
              }
              return false;
            },
            label,
            { timeout: 120000 }
          );
          await page.waitForTimeout(1000);

          // Scroll down to see the angle result
          if (scrollContainer) {
            await scrollContainer.evaluate((el) => (el.scrollTop = el.scrollHeight));
            await page.waitForTimeout(500);
          }
          log(`  Angle "${label}" done!`);
          await screenshot(page, `07-angle-${i + 1}-done`);
        } catch {
          log(`  WARNING: Angle "${label}" timed out`);
          await screenshot(page, `07-angle-${i + 1}-timeout`);
        }
      } else {
        log(`  Could not find button for "${label}"`);
      }
    }
  }

  // ── Step 6: Final state ──
  log("Step 6: Capturing final state...");
  if (scrollContainer) {
    await scrollContainer.evaluate((el) => (el.scrollTop = 0));
    await page.waitForTimeout(500);
  }
  await screenshot(page, "08-final-top");

  if (scrollContainer) {
    await scrollContainer.evaluate((el) => (el.scrollTop = el.scrollHeight));
    await page.waitForTimeout(500);
  }
  await screenshot(page, "08-final-bottom");

  await browser.close();

  // ── Summary ──
  const files = fs.readdirSync(resultsDir);
  log("");
  log("=== Test Complete ===");
  log(`Results saved to: ${resultsDir}`);
  log(`Screenshots: ${files.length}`);
  files.forEach((f) => log(`  ${f}`));
  log("");
  log(`Open the results: open ${resultsDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
