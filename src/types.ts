export type SubtitleCue = {
  index: number;
  startMs: number;
  endMs: number;
  durationMs: number;
  text: string;
};

export type SceneKind = "title" | "quote" | "step" | "tool" | "summary";

export type Scene = SubtitleCue & {
  kind: SceneKind;
  label: string;
  headline: string;
  accent?: string;
  items?: VisualItem[];
};

export type VisualItem = {
  title: string;
  body?: string;
  tag?: string;
};

export type VisualScene = {
  title: string;
  body?: string;
  kind?: SceneKind;
  label?: string;
  items?: VisualItem[];
  startMs?: number;
  endMs?: number;
  durationSec?: number;
};

export type VideoStyle = {
  title: string;
  subtitle: string;
  theme: string;
  width: number;
  height: number;
  fps: number;
  fontFamily: string;
  background: string;
  ink: string;
  muted: string;
  accent: string;
  green: string;
  blue: string;
  lavender: string;
  card: string;
};

export type Timeline = {
  title: string;
  subtitle: string;
  width: number;
  height: number;
  fps: number;
  durationMs: number;
  scenes: Scene[];
  subtitles: SubtitleCue[];
  style: VideoStyle;
};

export type ProjectPaths = {
  rootDir: string;
  inputDir: string;
  outputDir: string;
  framesDir: string;
  templateDir: string;
  subtitlesPath: string;
  scenesPath: string;
  stylePath: string;
  voicePath: string;
  previewPath: string;
  videoPath: string;
};
