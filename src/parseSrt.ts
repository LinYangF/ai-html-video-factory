import type { SubtitleCue } from "./types.ts";

const TIMECODE_RE =
  /(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/;

export function parseSrt(input: string): SubtitleCue[] {
  const normalized = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) {
    throw new Error("SRT file is empty.");
  }

  const blocks = normalized.split(/\n{2,}/);
  const cues = blocks.map(parseBlock).filter(Boolean) as SubtitleCue[];

  if (cues.length === 0) {
    throw new Error("No valid subtitle cues found in SRT file.");
  }

  return cues.sort((a, b) => a.startMs - b.startMs);
}

function parseBlock(block: string): SubtitleCue | null {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return null;
  }

  const maybeIndex = Number.parseInt(lines[0] ?? "", 10);
  const timeLineIndex = Number.isFinite(maybeIndex) ? 1 : 0;
  const timeLine = lines[timeLineIndex] ?? "";
  const match = timeLine.match(TIMECODE_RE);

  if (!match) {
    return null;
  }

  const startMs = parseTimecode(match[1]);
  const endMs = parseTimecode(match[2]);
  if (endMs <= startMs) {
    throw new Error(`Invalid SRT cue timing: ${timeLine}`);
  }

  const text = lines.slice(timeLineIndex + 1).join(" ").trim();
  if (!text) {
    return null;
  }

  return {
    index: Number.isFinite(maybeIndex) ? maybeIndex : 0,
    startMs,
    endMs,
    durationMs: endMs - startMs,
    text,
  };
}

export function parseTimecode(value: string): number {
  const [hh = "0", mm = "0", rest = "0"] = value.replace(",", ".").split(":");
  const [ss = "0", ms = "0"] = rest.split(".");

  return (
    Number.parseInt(hh, 10) * 60 * 60 * 1000 +
    Number.parseInt(mm, 10) * 60 * 1000 +
    Number.parseInt(ss, 10) * 1000 +
    Number.parseInt(ms.padEnd(3, "0").slice(0, 3), 10)
  );
}
