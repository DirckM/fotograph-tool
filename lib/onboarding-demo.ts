export const DEMO_PROJECT = {
  name: "Summer Collection 2025",
  description:
    "Lifestyle photoshoot for a summer clothing line. Natural outdoor settings with warm, golden-hour lighting.",
  employer: "Fashion Brand Co.",
  context:
    "Summer lifestyle campaign targeting 18-35 demographic. Focus on natural beauty, outdoor settings, and effortless style. Light fabrics, earth tones, and minimalist designs.",
  modelDescription:
    "Young woman, mid-20s, sun-kissed skin, natural freckles, warm brown eyes, shoulder-length wavy auburn hair, soft features with defined cheekbones",
  envPrompt:
    "Bright open-air rooftop terrace, Mediterranean white walls, lush potted greenery, coastal cityscape in background, golden hour sunlight",
  posePrompt:
    "Standing casually with one hand resting on a railing, weight shifted to one hip, chin slightly lifted, relaxed confident expression, fashion editorial pose",
};

export function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function resolveSelector(selector: string): string {
  if (
    selector.startsWith("#") ||
    selector.startsWith(".") ||
    selector.startsWith("[")
  ) {
    return selector;
  }
  return `[data-tour="${selector}"]`;
}

export function waitForElement(
  selector: string,
  timeout = 10000
): Promise<Element | null> {
  const resolved = resolveSelector(selector);
  return new Promise((resolve) => {
    const el = document.querySelector(resolved);
    if (el) return resolve(el);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(resolved);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

export async function typeIntoReactInput(
  selector: string,
  text: string,
  speed = 18
): Promise<void> {
  const el = await waitForElement(selector, 5000);
  if (
    !el ||
    !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
  )
    return;

  el.focus();
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  await delay(200);

  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (!nativeSetter) return;

  for (let i = 0; i <= text.length; i++) {
    nativeSetter.call(el, text.slice(0, i));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    await delay(speed);
  }
}

export async function clickElement(selector: string): Promise<void> {
  const el = await waitForElement(selector, 5000);
  if (el instanceof HTMLElement) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Force visibility for hover-only elements
    el.style.opacity = "1";
    await delay(200);
    el.click();
  }
}

function getProjectIdFromUrl(): string | null {
  const match = window.location.pathname.match(
    /\/dashboard\/projects\/([^/]+)/
  );
  return match?.[1] ?? null;
}

export async function approveStage(stage: number): Promise<void> {
  const projectId = getProjectIdFromUrl();
  if (!projectId) return;

  await fetch(`/api/projects/${projectId}/stage/${stage}/approve`, {
    method: "POST",
  });
}
