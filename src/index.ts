import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildTimeline } from "./buildTimeline.ts";
import { generateHtml } from "./generateHtml.ts";
import { parseSrt } from "./parseSrt.ts";
import { renderVideo } from "./renderVideo.ts";
import type { ProjectPaths, Timeline, VideoStyle } from "./types.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const command = process.argv[2] ?? "build";
  const paths = projectPaths(rootDir);

  if (command === "build") {
    await buildHtml(paths);
    return;
  }

  if (command === "render") {
    const timeline = await buildHtml(paths);
    await renderVideo(timeline, paths);
    console.log(`Video written to ${paths.videoPath}`);
    return;
  }

  throw new Error(`Unknown command "${command}". Use "build" or "render".`);
}

export async function buildHtml(paths = projectPaths(rootDir)): Promise<Timeline> {
  await mkdir(paths.outputDir, { recursive: true });
  await mkdir(paths.framesDir, { recursive: true });

  const [srt, style] = await Promise.all([readFile(paths.subtitlesPath, "utf8"), loadStyle(paths)]);
  const cues = parseSrt(srt);
  const timeline = buildTimeline(cues, style);
  await generateHtml(timeline, paths.templateDir, paths.previewPath);
  console.log(`Preview written to ${paths.previewPath}`);
  return timeline;
}

function projectPaths(baseDir: string): ProjectPaths {
  const outputDir = path.join(baseDir, "output", "current");
  return {
    rootDir: baseDir,
    inputDir: path.join(baseDir, "input"),
    outputDir,
    framesDir: path.join(outputDir, "frames"),
    templateDir: path.join(baseDir, "templates"),
    subtitlesPath: path.join(baseDir, "input", "subtitles.srt"),
    stylePath: path.join(baseDir, "input", "style.json"),
    voicePath: path.join(baseDir, "input", "voice.mp3"),
    previewPath: path.join(outputDir, "preview.html"),
    videoPath: path.join(outputDir, "video.mp4"),
  };
}

async function loadStyle(paths: ProjectPaths): Promise<VideoStyle> {
  const raw = await readFile(paths.stylePath, "utf8");
  const style = JSON.parse(raw) as Partial<VideoStyle>;
  const themePath = path.join(paths.templateDir, "themes", `${style.theme ?? "clean"}.json`);
  const theme = JSON.parse(await readFile(themePath, "utf8")) as Partial<VideoStyle>;

  return {
    title: "AI 视频自动生成工作流",
    subtitle: "文案 -> 音频 -> SRT 字幕 -> HTML 页面 -> MP4 视频",
    theme: "clean",
    width: 1920,
    height: 1080,
    fps: 30,
    fontFamily: "Inter, PingFang SC, Microsoft YaHei, Arial, sans-serif",
    background: "#fbf7ef",
    ink: "#221b38",
    muted: "#6e687c",
    accent: "#df765f",
    green: "#3ba66b",
    blue: "#8fb4e8",
    lavender: "#c9b8ef",
    card: "#fffdfa",
    ...theme,
    ...style,
  };
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
