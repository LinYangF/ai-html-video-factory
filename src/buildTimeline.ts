import type { Scene, SceneKind, SubtitleCue, Timeline, VideoStyle } from "./types.ts";

export function buildTimeline(cues: SubtitleCue[], style: VideoStyle): Timeline {
  const scenes = cues.map((cue, position) => buildScene(cue, position, cues.length));
  const durationMs = Math.max(...cues.map((cue) => cue.endMs)) + 500;

  return {
    title: style.title,
    subtitle: style.subtitle,
    width: style.width,
    height: style.height,
    fps: style.fps,
    durationMs,
    scenes,
    style,
  };
}

function buildScene(cue: SubtitleCue, position: number, total: number): Scene {
  const kind = chooseKind(cue.text, position, total);
  const { headline, accent } = splitAccent(cue.text);

  return {
    ...cue,
    kind,
    label: labelFor(kind, position),
    headline,
    accent,
  };
}

function chooseKind(text: string, position: number, total: number): SceneKind {
  if (position === 0) {
    return "title";
  }
  if (position === total - 1) {
    return "summary";
  }
  if (/SRT|HTML|MP4|AI|音频|字幕|网页|渲染/i.test(text)) {
    return "tool";
  }
  if (/不是|传统|成本|批量|自动|流程/.test(text)) {
    return "quote";
  }
  return "step";
}

function labelFor(kind: SceneKind, position: number): string {
  const labels: Record<SceneKind, string> = {
    title: "开场",
    quote: "核心观点",
    step: `步骤 ${String(position + 1).padStart(2, "0")}`,
    tool: "工具链路",
    summary: "总结",
  };
  return labels[kind];
}

function splitAccent(text: string): { headline: string; accent?: string } {
  const parts = text.split(/[，,。.\s]/).filter(Boolean);
  if (parts.length <= 1) {
    return { headline: text };
  }
  const accent = parts.at(-1);
  const prefix = text.slice(0, Math.max(0, text.lastIndexOf(accent ?? ""))).trim();
  return {
    headline: prefix || text,
    accent,
  };
}
