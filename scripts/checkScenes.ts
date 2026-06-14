import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseSrt } from "../src/parseSrt.ts";
import type { VisualScene } from "../src/types.ts";

type Finding = {
  level: "error" | "warn";
  message: string;
};

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const lessonSlug = process.argv[2];
  if (!lessonSlug) {
    throw new Error("Usage: npm run lesson:check-scenes -- <lesson-slug>");
  }

  const lessonDir = path.join(rootDir, "lessons", lessonSlug);
  const scenesPath = path.join(lessonDir, "scenes.json");
  const subtitlesPath = path.join(lessonDir, "subtitles.srt");

  if (!existsSync(scenesPath)) {
    throw new Error(`Missing scenes.json: ${relative(scenesPath)}`);
  }
  if (!existsSync(subtitlesPath)) {
    throw new Error(`Missing subtitles.srt: ${relative(subtitlesPath)}`);
  }

  const scenes = JSON.parse(await readFile(scenesPath, "utf8")) as VisualScene[];
  const cues = parseSrt(await readFile(subtitlesPath, "utf8"));
  const durationMs = Math.max(...cues.map((cue) => cue.endMs));
  const findings = validateScenes(scenes, durationMs);

  if (findings.length === 0) {
    console.log(`Scene check passed: ${relative(scenesPath)}`);
    return;
  }

  for (const finding of findings) {
    console.log(`${finding.level.toUpperCase()}: ${finding.message}`);
  }

  if (findings.some((finding) => finding.level === "error")) {
    process.exitCode = 1;
  }
}

function validateScenes(scenes: VisualScene[], durationMs: number): Finding[] {
  const findings: Finding[] = [];
  if (!Array.isArray(scenes) || scenes.length === 0) {
    return [{ level: "error", message: "scenes.json must be a non-empty array." }];
  }

  let previousEnd = 0;
  scenes.forEach((scene, index) => {
    const page = index + 1;
    const title = scene.title?.trim() || "(untitled)";
    const startMs = scene.startMs;
    const endMs = scene.endMs;

    if (typeof startMs !== "number" || typeof endMs !== "number") {
      findings.push({
        level: "error",
        message: `Page ${page} "${title}" must use explicit startMs/endMs after SRT is available.`,
      });
    } else {
      if (startMs < 0 || endMs <= startMs) {
        findings.push({ level: "error", message: `Page ${page} "${title}" has invalid startMs/endMs.` });
      }
      if (startMs < previousEnd - 50) {
        findings.push({ level: "error", message: `Page ${page} "${title}" overlaps previous page.` });
      }
      const gap = startMs - previousEnd;
      if (index > 0 && gap > 1500) {
        findings.push({ level: "warn", message: `Page ${page} "${title}" starts ${gap}ms after previous page.` });
      }
      if (endMs > durationMs + 1000) {
        findings.push({ level: "error", message: `Page ${page} "${title}" ends after subtitle duration.` });
      }
      previousEnd = Math.max(previousEnd, endMs);
    }

    if (scene.durationSec !== undefined && typeof startMs === "number" && typeof endMs === "number") {
      findings.push({ level: "warn", message: `Page ${page} "${title}" has durationSec plus explicit times; keep only explicit times for final videos.` });
    }

    if (textLength(scene.title) > 18) {
      findings.push({ level: "warn", message: `Page ${page} title may be too long: "${scene.title}".` });
    }
    if (textLength(scene.body) > 42) {
      findings.push({ level: "warn", message: `Page ${page} body may be too long for the main card.` });
    }

    const items = scene.items ?? [];
    if (items.length > 4) {
      findings.push({ level: "warn", message: `Page ${page} "${title}" has ${items.length} items; use 2-4 items.` });
    }
    if (items.length === 1 && /^\d+$/.test(items[0]?.tag ?? "")) {
      findings.push({ level: "warn", message: `Page ${page} "${title}" has one numbered item; remove tag or fold it into the main card.` });
    }

    items.forEach((item, itemIndex) => {
      const itemName = item.title || `item ${itemIndex + 1}`;
      if (textLength(item.title) > 14) {
        findings.push({ level: "warn", message: `Page ${page} item "${itemName}" title may overflow; shorten it.` });
      }
      if (textLength(item.body) > 24) {
        findings.push({ level: "warn", message: `Page ${page} item "${itemName}" body may overflow; shorten it.` });
      }
      if (hasLongAsciiWord(item.title, 14)) {
        findings.push({ level: "warn", message: `Page ${page} item "${itemName}" contains a long English word; prefer Chinese title.` });
      }
      if (typeof item.revealMs !== "number") {
        findings.push({ level: "warn", message: `Page ${page} item "${itemName}" has no revealMs; it will use default stagger timing.` });
      } else if (typeof startMs === "number" && typeof endMs === "number" && (item.revealMs < startMs || item.revealMs > endMs)) {
        findings.push({ level: "error", message: `Page ${page} item "${itemName}" revealMs is outside page time range.` });
      }
    });
  });

  const lastEnd = scenes.at(-1)?.endMs;
  if (typeof lastEnd === "number" && Math.abs(lastEnd - durationMs) > 2000) {
    findings.push({
      level: "warn",
      message: `Last scene ends at ${lastEnd}ms, subtitle duration is ${durationMs}ms.`,
    });
  }

  return findings;
}

function textLength(value: string | undefined): number {
  return [...(value ?? "")].length;
}

function hasLongAsciiWord(value: string | undefined, maxLength: number): boolean {
  return /[A-Za-z0-9/+-]{15,}/.test(value ?? "") && [...(value ?? "")].length > maxLength;
}

function relative(filePath: string): string {
  return path.relative(rootDir, filePath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
