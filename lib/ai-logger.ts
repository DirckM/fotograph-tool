import "server-only";
import { writeFile, mkdir } from "fs/promises";
import { exec } from "child_process";
import { join } from "path";

const LOG_DIR = join(process.cwd(), "logs", "ai");
const PROJECT_ROOT = process.cwd();

interface AiLogEntry {
  timestamp: string;
  function: "generateWithImages" | "generateText";
  model: string;
  prompt: string;
  inputImages: { mimeType: string; sizeBytes: number; file: string }[];
  output:
    | { type: "image"; mimeType: string; sizeBytes: number; file: string }
    | { type: "text"; text: string }
    | { type: "error"; error: string }
    | { type: "null" };
  durationMs: number;
}

interface RawImage {
  mimeType: string;
  data: string;
}

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function extForMime(mime: string) {
  return MIME_EXT[mime] ?? "bin";
}

export async function logAiCall(
  entry: Omit<AiLogEntry, "inputImages" | "output"> & {
    inputImagesRaw: RawImage[];
    outputRaw:
      | { type: "image"; image: RawImage }
      | { type: "text"; text: string }
      | { type: "error"; error: string }
      | { type: "null" };
  }
) {
  try {
    const ts = entry.timestamp.replace(/[:.]/g, "-");
    const callDir = join(LOG_DIR, `${ts}_${entry.function}`);
    await mkdir(callDir, { recursive: true });

    // Save input images as files
    const inputSummaries = await Promise.all(
      entry.inputImagesRaw.map(async (img, i) => {
        const filename = `input_${i}.${extForMime(img.mimeType)}`;
        await writeFile(join(callDir, filename), Buffer.from(img.data, "base64"));
        return {
          mimeType: img.mimeType,
          sizeBytes: Math.round((img.data.length * 3) / 4),
          file: filename,
        };
      })
    );

    // Save output image if present
    let outputSummary: AiLogEntry["output"];
    if (entry.outputRaw.type === "image") {
      const img = entry.outputRaw.image;
      const filename = `output.${extForMime(img.mimeType)}`;
      await writeFile(join(callDir, filename), Buffer.from(img.data, "base64"));
      outputSummary = {
        type: "image",
        mimeType: img.mimeType,
        sizeBytes: Math.round((img.data.length * 3) / 4),
        file: filename,
      };
    } else {
      outputSummary = entry.outputRaw;
    }

    // Write the JSON log
    const logEntry: AiLogEntry = {
      timestamp: entry.timestamp,
      function: entry.function,
      model: entry.model,
      prompt: entry.prompt,
      inputImages: inputSummaries,
      output: outputSummary,
      durationMs: entry.durationMs,
    };

    await writeFile(
      join(callDir, "log.json"),
      JSON.stringify(logEntry, null, 2),
      "utf-8"
    );

    // Auto-commit in the background
    exec(
      `git add "${callDir}" && git commit -m "log: AI ${entry.function} (${outputSummary.type})"`,
      { cwd: PROJECT_ROOT },
      (err) => {
        if (err) console.error("[ai-logger] Git commit failed:", err.message);
      }
    );
  } catch (err) {
    console.error("[ai-logger] Failed to write log:", err);
  }
}
