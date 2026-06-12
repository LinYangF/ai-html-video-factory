import { existsSync } from "node:fs";
import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import type { ProjectPaths, Timeline } from "./types.ts";
import { renderSvgFrame } from "./renderSvgFrame.ts";

type BrowserWindow = Window & {
  __setVideoTime?: (ms: number) => void;
};

export async function renderVideo(timeline: Timeline, paths: ProjectPaths): Promise<void> {
  await prepareFrames(paths.framesDir);
  assertFfmpeg();

  const renderedWithBrowser = await tryRenderBrowserFrames(timeline, paths).catch((error) => {
    console.warn(`Browser frame rendering failed, falling back to SVG frames: ${messageOf(error)}`);
    return false;
  });

  if (!renderedWithBrowser) {
    await renderSvgFrames(timeline, paths.framesDir);
  }

  const audioPath = await ensureAudio(timeline, paths);
  await combineFrames(timeline, paths, audioPath, renderedWithBrowser ? "png" : "svg");
}

async function prepareFrames(framesDir: string): Promise<void> {
  await rm(framesDir, { recursive: true, force: true });
  await mkdir(framesDir, { recursive: true });
}

async function tryRenderBrowserFrames(timeline: Timeline, paths: ProjectPaths): Promise<boolean> {
  let playwright: typeof import("playwright");
  try {
    playwright = await import("playwright");
  } catch {
    return false;
  }

  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: timeline.width, height: timeline.height },
      deviceScaleFactor: 1,
    });
    await page.goto(pathToFileURL(paths.previewPath).toString(), { waitUntil: "load" });

    for (let frame = 0; frame < frameCount(timeline); frame += 1) {
      const ms = (frame / timeline.fps) * 1000;
      await page.evaluate((timeMs) => {
        (window as BrowserWindow).__setVideoTime?.(timeMs);
      }, ms);
      await page.screenshot({
        path: path.join(paths.framesDir, `frame_${String(frame + 1).padStart(6, "0")}.png`),
        type: "png",
      });
    }
  } finally {
    await browser.close();
  }

  return true;
}

async function renderSvgFrames(timeline: Timeline, framesDir: string): Promise<void> {
  for (let frame = 0; frame < frameCount(timeline); frame += 1) {
    const ms = (frame / timeline.fps) * 1000;
    const outputPath = path.join(framesDir, `frame_${String(frame + 1).padStart(6, "0")}.svg`);
    await renderSvgFrame(timeline, ms, outputPath);
  }
}

async function ensureAudio(timeline: Timeline, paths: ProjectPaths): Promise<string> {
  if (existsSync(paths.voicePath)) {
    return paths.voicePath;
  }

  const silencePath = path.join(paths.outputDir, "silence.wav");
  const durationSec = (timeline.durationMs / 1000).toFixed(3);
  run("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-t",
    durationSec,
    silencePath,
  ]);
  return silencePath;
}

async function combineFrames(
  timeline: Timeline,
  paths: ProjectPaths,
  audioPath: string,
  extension: "png" | "svg",
): Promise<void> {
  const files = await readdir(paths.framesDir);
  if (files.length === 0) {
    throw new Error("No rendered frames found.");
  }

  run("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-framerate",
    String(timeline.fps),
    "-i",
    path.join(paths.framesDir, `frame_%06d.${extension}`),
    "-i",
    audioPath,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    "-movflags",
    "+faststart",
    paths.videoPath,
  ]);
}

function assertFfmpeg(): void {
  const result = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error("FFmpeg is required but was not found. Install ffmpeg and try again.");
  }
}

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, { stdio: "pipe", encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
  }
}

function frameCount(timeline: Timeline): number {
  return Math.max(1, Math.ceil((timeline.durationMs / 1000) * timeline.fps));
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
