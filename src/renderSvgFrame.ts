import { writeFile } from "node:fs/promises";
import type { Scene, Timeline } from "./types.ts";

export async function renderSvgFrame(timeline: Timeline, ms: number, outputPath: string): Promise<void> {
  const scene = findScene(timeline, ms);
  const progress = Math.min(100, Math.max(0, (ms / timeline.durationMs) * 100));
  const svg = buildSvg(timeline, scene, progress);
  await writeFile(outputPath, svg, "utf8");
}

function findScene(timeline: Timeline, ms: number): Scene {
  return timeline.scenes.find((scene) => ms >= scene.startMs && ms < scene.endMs) ?? timeline.scenes.at(-1)!;
}

function buildSvg(timeline: Timeline, scene: Scene, progress: number): string {
  const style = timeline.style;
  const headlineLines = wrapText(scene.text, scene.kind === "quote" || scene.kind === "summary" ? 16 : 12);
  const isQuote = scene.kind === "quote" || scene.kind === "summary";

  const cards =
    scene.kind === "tool"
      ? `<g>
          ${stepCard(150, 740, "01", "文案", style.accent)}
          ${stepCard(510, 740, "02", "音频", style.green)}
          ${stepCard(870, 740, "03", "SRT", style.blue)}
          ${stepCard(1230, 740, "04", "HTML / MP4", style.lavender)}
        </g>`
      : "";

  const mainText = isQuote
    ? `<rect x="90" y="340" width="1740" height="380" rx="8" fill="${style.card}" opacity="0.92"/>
       <text x="140" y="444" fill="${style.accent}" font-size="88" font-family="Georgia">“</text>
       ${textLines(headlineLines, 150, 520, 74, style.green, 900)}`
    : `${textLines(headlineLines, 95, 330, 92, style.ink, 900)}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${timeline.width}" height="${timeline.height}" viewBox="0 0 ${timeline.width} ${timeline.height}">
  <defs>
    <radialGradient id="g1" cx="8%" cy="92%" r="26%">
      <stop offset="0%" stop-color="${style.green}" stop-opacity="0.24"/>
      <stop offset="100%" stop-color="${style.green}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g2" cx="91%" cy="8%" r="28%">
      <stop offset="0%" stop-color="${style.lavender}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${style.lavender}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="${style.background}"/>
  <rect width="100%" height="100%" fill="url(#g1)"/>
  <rect width="100%" height="100%" fill="url(#g2)"/>
  <rect x="90" y="88" width="${Math.max(260, scene.label.length * 30 + 70)}" height="58" rx="29" fill="#ffffff" opacity="0.78"/>
  <circle cx="120" cy="117" r="6" fill="${style.accent}"/>
  <text x="146" y="126" fill="${style.muted}" font-size="24" font-weight="700" font-family="${escapeAttr(style.fontFamily)}">${escapeXml(scene.label)}</text>
  ${mainText}
  ${cards}
  <rect x="90" y="1000" width="1540" height="8" rx="4" fill="${style.ink}" opacity="0.12"/>
  <rect x="90" y="1000" width="${(1540 * progress) / 100}" height="8" rx="4" fill="${style.accent}"/>
  <text x="1680" y="1014" fill="${style.muted}" font-size="24" font-weight="700" font-family="${escapeAttr(style.fontFamily)}">${scene.index}/${timeline.scenes.length}</text>
</svg>`;
}

function stepCard(x: number, y: number, number: string, label: string, color: string): string {
  return `<rect x="${x}" y="${y}" width="310" height="170" rx="8" fill="#ffffff" opacity="0.78"/>
    <text x="${x + 28}" y="${y + 68}" fill="${color}" font-size="54" font-weight="900" font-family="Georgia">${number}</text>
    <text x="${x + 28}" y="${y + 124}" fill="#221b38" font-size="30" font-weight="800" font-family="Arial">${escapeXml(label)}</text>`;
}

function textLines(lines: string[], x: number, y: number, size: number, color: string, weight: number): string {
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * size * 1.22}" fill="${color}" font-size="${size}" font-weight="${weight}" font-family="Arial, sans-serif">${escapeXml(line)}</text>`,
    )
    .join("\n");
}

function wrapText(text: string, maxChars: number): string[] {
  const chars = [...text];
  const lines: string[] = [];
  for (let index = 0; index < chars.length; index += maxChars) {
    lines.push(chars.slice(index, index + maxChars).join(""));
  }
  return lines.slice(0, 4);
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttr(value: string): string {
  return escapeXml(value).replaceAll('"', "&quot;");
}
