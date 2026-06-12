import { writeFile } from "node:fs/promises";
import type { Scene, SubtitleCue, Timeline, VisualItem } from "./types.ts";

export async function renderSvgFrame(timeline: Timeline, ms: number, outputPath: string): Promise<void> {
  const scene = findScene(timeline, ms);
  const subtitle = findSubtitle(timeline, ms);
  const progress = Math.min(100, Math.max(0, (ms / timeline.durationMs) * 100));
  const svg = buildSvg(timeline, scene, progress, subtitle?.text ?? "");
  await writeFile(outputPath, svg, "utf8");
}

function findScene(timeline: Timeline, ms: number): Scene {
  return timeline.scenes.find((scene) => ms >= scene.startMs && ms < scene.endMs) ?? timeline.scenes.at(-1)!;
}

function findSubtitle(timeline: Timeline, ms: number): SubtitleCue | undefined {
  return timeline.subtitles.find((cue) => ms >= cue.startMs && ms < cue.endMs);
}

function buildSvg(timeline: Timeline, scene: Scene, progress: number, subtitle: string): string {
  const style = timeline.style;
  const localMs = Math.max(0, Math.min(scene.durationMs, progressToMs(timeline, progress) - scene.startMs));
  const mainText = renderSceneSvg(scene, style, localMs);
  const header = animated(
    `<text x="150" y="150" fill="${style.muted}" font-size="22" font-weight="900" font-family="${escapeAttr(style.fontFamily)}">${escapeXml(scene.label)}</text>`,
    localMs,
    0,
    480,
    0,
    16,
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${timeline.width}" height="${timeline.height}" viewBox="0 0 ${timeline.width} ${timeline.height}">
  <defs>
    <radialGradient id="g1" cx="92%" cy="8%" r="24%">
      <stop offset="0%" stop-color="${style.lavender}" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="${style.lavender}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g2" cx="94%" cy="92%" r="22%">
      <stop offset="0%" stop-color="${style.accent}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${style.accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="#fff8f1"/>
  <rect width="100%" height="100%" fill="url(#g1)"/>
  <rect width="100%" height="100%" fill="url(#g2)"/>
  <circle cx="1600" cy="130" r="92" fill="${style.lavender}" opacity="0.18"/>
  ${header}
  ${mainText}
  <rect x="150" y="956" width="1400" height="7" rx="4" fill="${style.ink}" opacity="0.09"/>
  <rect x="150" y="956" width="${(1400 * progress) / 100}" height="7" rx="4" fill="${style.accent}"/>
  <text x="1600" y="970" fill="${style.muted}" font-size="20" font-weight="800" font-family="${escapeAttr(style.fontFamily)}">${scene.index}/${timeline.scenes.length}</text>
  ${subtitleText(subtitle)}
</svg>`;
}

function progressToMs(timeline: Timeline, progress: number): number {
  return (progress / 100) * timeline.durationMs;
}

function renderSceneSvg(scene: Scene, style: Timeline["style"], localMs: number): string {
  const items = cardItems(scene);
  if (scene.kind === "title") {
    return `${animated(textLines(wrapText(scene.headline, 13), 150, 390, 96, style.ink, 900, "Georgia, serif"), localMs, 160, 620, 0, 28)}
      ${animated(textLines(wrapText(scene.accent ?? "", 24), 155, 570, 46, "#343044", 800), localMs, 520, 620, 0, 24)}
      ${animated(`${pill(155, 685, "Buy Side")} ${pill(320, 685, "Sell Side")} ${pill(500, 685, "Quant")}`, localMs, 880, 520, 0, 18)}`;
  }

  if (scene.kind === "tool") {
    return `${animated(featureCard(150, 220, 760, 250, scene, style), localMs, 120, 600, 0, 22)}
      ${items.slice(0, 4).map((item, index) => animated(infoCard(950 + (index % 2) * 390, 220 + Math.floor(index / 2) * 280, 360, 250, item, index), localMs, itemDelay(scene, item, index), 520, 0, 24)).join("\n")}`;
  }

  if (scene.kind === "quote" || scene.kind === "summary") {
    return `${animated(featureCard(150, 220, 1460, 310, scene, style), localMs, 120, 620, 0, 24)}
      ${items.slice(0, 3).map((item, index) => animated(infoCard(150 + index * 500, 570, 460, 210, item, index), localMs, itemDelay(scene, item, index), 520, 0, 24)).join("\n")}`;
  }

  return `${animated(featureCard(150, 250, 720, 470, scene, style), localMs, 120, 620, 0, 24)}
    ${items.slice(0, 4).map((item, index) => animated(infoCard(930 + (index % 2) * 360, 250 + Math.floor(index / 2) * 245, 330, 220, item, index), localMs, itemDelay(scene, item, index), 520, 0, 24)).join("\n")}`;
}

function itemDelay(scene: Scene, item: VisualItem, index: number): number {
  if (typeof item.revealMs === "number") {
    return Math.max(260, item.revealMs - scene.startMs);
  }
  return 520 + index * 180;
}

function featureCard(x: number, y: number, w: number, h: number, scene: Scene, style: Timeline["style"]): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#ddcdf6" opacity="0.94"/>
  <text x="${x + 42}" y="${y + 84}" fill="#201a31" font-size="64" font-style="italic" font-weight="900" font-family="Georgia">${String(scene.index).padStart(2, "0")}</text>
  ${textLines(wrapText(scene.headline, 14), x + 42, y + 152, 46, style.ink, 900, "Georgia, serif")}
  ${textLines(wrapText(scene.accent ?? "", 26), x + 42, y + 225, 27, "#343044", 800)}`;
}

function infoCard(x: number, y: number, w: number, h: number, item: VisualItem, index: number): string {
  const fills = ["#ffd9c5", "#ccefdc", "#cfe0fb", "#ddcdf6"];
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fills[index % fills.length]}" opacity="0.96"/>
  <text x="${x + 34}" y="${y + 72}" fill="#201a31" font-size="52" font-style="italic" font-weight="900" font-family="Georgia">${escapeXml(item.tag ?? String(index + 1).padStart(2, "0"))}</text>
  ${textLines(wrapText(item.title, 10), x + 34, y + 124, 32, "#201a31", 900, "Georgia, serif")}
  ${textLines(wrapText(item.body ?? "", 18), x + 34, y + 174, 22, "#343044", 750)}`;
}

function cardItems(scene: Scene): VisualItem[] {
  if (scene.items?.length) return scene.items;
  const source = scene.accent || scene.text;
  const parts = source.split(/[；;。，,、]/).map((item) => item.trim()).filter(Boolean);
  return (parts.length ? parts : [source]).slice(0, 4).map((title, index) => ({
    title,
    tag: String(index + 1).padStart(2, "0"),
  }));
}

function pill(x: number, y: number, label: string): string {
  return `<rect x="${x}" y="${y}" width="${label.length * 18 + 46}" height="42" rx="6" fill="#211d32"/>
  <text x="${x + 20}" y="${y + 29}" fill="#ffffff" font-size="22" font-weight="900" font-family="Arial">${escapeXml(label)}</text>`;
}

function subtitleText(text: string): string {
  if (!text) return "";
  const lines = wrapText(text, 24).slice(0, 2);
  return lines
    .map((line, index) => `<text x="960" y="${910 + index * 52}" text-anchor="middle" fill="#ffffff" stroke="#111111" stroke-width="7" paint-order="stroke" font-size="44" font-weight="950" font-family="Arial">${escapeXml(line)}</text>`)
    .join("\n");
}

function animated(content: string, localMs: number, delayMs: number, durationMs: number, fromX: number, fromY: number): string {
  const t = clamp((localMs - delayMs) / durationMs, 0, 1);
  const eased = 1 - Math.pow(1 - t, 3);
  const x = fromX * (1 - eased);
  const y = fromY * (1 - eased);
  const opacity = eased.toFixed(3);
  return `<g opacity="${opacity}" transform="translate(${x.toFixed(2)} ${y.toFixed(2)})">${content}</g>`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function textLines(lines: string[], x: number, y: number, size: number, color: string, weight: number, family = "Arial, sans-serif"): string {
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * size * 1.22}" fill="${color}" font-size="${size}" font-weight="${weight}" font-family="${escapeAttr(family)}">${escapeXml(line)}</text>`,
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
