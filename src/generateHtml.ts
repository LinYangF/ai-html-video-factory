import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Timeline } from "./types.ts";

export async function generateHtml(timeline: Timeline, templateDir: string, outputPath: string): Promise<void> {
  const [base, css] = await Promise.all([
    readFile(path.join(templateDir, "base.html"), "utf8"),
    readFile(path.join(templateDir, "styles.css"), "utf8"),
  ]);

  const styledCss = css
    .replaceAll("{{BACKGROUND}}", timeline.style.background)
    .replaceAll("{{INK}}", timeline.style.ink)
    .replaceAll("{{MUTED}}", timeline.style.muted)
    .replaceAll("{{ACCENT}}", timeline.style.accent)
    .replaceAll("{{GREEN}}", timeline.style.green)
    .replaceAll("{{BLUE}}", timeline.style.blue)
    .replaceAll("{{LAVENDER}}", timeline.style.lavender)
    .replaceAll("{{CARD}}", timeline.style.card)
    .replaceAll("{{FONT}}", timeline.style.fontFamily);

  const html = base
    .replaceAll("{{TITLE}}", escapeHtml(timeline.title))
    .replace("{{CSS}}", styledCss)
    .replace("{{DATA}}", JSON.stringify(timeline))
    .replace("{{JS}}", clientJs());

  await writeFile(outputPath, html, "utf8");
}

function clientJs(): string {
  return String.raw`
const data = window.__VIDEO_DATA__;
const stage = document.querySelector("#stage");
let manualTime = null;
let startedAt = performance.now();

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sceneAt(ms) {
  return data.scenes.find((scene) => ms >= scene.startMs && ms < scene.endMs) || null;
}

function render(ms) {
  const scene = sceneAt(ms);
  const progress = Math.min(100, Math.max(0, (ms / data.durationMs) * 100));
  const subtitle = subtitleAt(ms);

  if (!scene) {
    stage.innerHTML = "";
    return;
  }

  stage.innerHTML = template(scene, progress, subtitle, ms);
}

function subtitleAt(ms) {
  const cue = data.subtitles?.find((item) => ms >= item.startMs && ms < item.endMs);
  return cue ? cue.text : "";
}

function cardItems(scene) {
  if (Array.isArray(scene.items) && scene.items.length > 0) {
    return scene.items;
  }
  const parts = String(scene.accent || scene.text)
    .split(/[；;。，,、]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
  return parts.length
    ? parts.map((part, index) => ({ title: part, body: "", tag: String(index + 1).padStart(2, "0") }))
    : [{ title: scene.text, body: "", tag: "01" }];
}

function keywordBadges(text) {
  return escapeHtml(text)
    .replaceAll("Buy Side", '<span class="badge">Buy Side</span>')
    .replaceAll("Sell Side", '<span class="badge">Sell Side</span>')
    .replaceAll("SRT", '<span class="badge">SRT</span>')
    .replaceAll("HTML", '<span class="badge">HTML</span>')
    .replaceAll("MP4", '<span class="badge">MP4</span>')
    .replaceAll("AI", '<span class="badge">AI</span>')
    .replaceAll("alpha", '<span class="badge">alpha</span>')
    .replaceAll("Alpha", '<span class="badge">Alpha</span>');
}

function itemStyle(scene, item, index, ms) {
  const revealMs = typeof item.revealMs === "number" ? item.revealMs : scene.startMs + 520 + index * 180;
  const t = Math.min(1, Math.max(0, (ms - revealMs) / 520));
  const eased = 1 - Math.pow(1 - t, 3);
  const y = 24 * (1 - eased);
  return 'style="opacity:' + eased.toFixed(3) + '; transform: translateY(' + y.toFixed(1) + 'px)"';
}

function template(scene, progress, subtitle, ms) {
  const text = escapeHtml(scene.headline);
  const accent = scene.accent ? keywordBadges(scene.accent) : "";
  const progressLine = '<div class="progress"><div class="progress-line"><div class="progress-fill" style="--progress: ' + progress.toFixed(2) + '%"></div></div><span>' + scene.index + '/' + data.scenes.length + '</span></div>';
  const bottomSubtitle = '<div class="spoken-subtitle">' + escapeHtml(subtitle) + '</div>';
  const pageChrome = progressLine + bottomSubtitle;
  const cards = cardItems(scene)
    .map((item, index) => '<article class="info-card color-' + (index % 4) + '" ' + itemStyle(scene, item, index, ms) + '><div class="card-num">' + escapeHtml(item.tag || String(index + 1).padStart(2, "0")) + '</div><h3>' + keywordBadges(item.title) + '</h3><p>' + keywordBadges(item.body || "") + '</p></article>')
    .join("");

  if (scene.kind === "title") {
    return '<article class="frame enter"><div class="kicker">' + escapeHtml(scene.label) + '</div><div class="hero-content"><h1 class="headline">' + text + '</h1><p class="lead">' + accent + '</p><div class="mini-strip"><span>Buy Side</span><span>Sell Side</span><span>Quant</span></div></div>' + pageChrome + '</article>';
  }

  if (scene.kind === "tool") {
    return '<article class="frame enter"><div class="kicker">' + escapeHtml(scene.label) + '</div><div class="content grid-content"><section class="feature-card"><div class="card-num">' + String(scene.index).padStart(2, "0") + '</div><h2>' + text + '</h2><p>' + accent + '</p></section><div class="card-grid">' + cards + '</div></div>' + pageChrome + '</article>';
  }

  if (scene.kind === "quote" || scene.kind === "summary") {
    return '<article class="frame enter"><div class="kicker">' + escapeHtml(scene.label) + '</div><div class="content split-content"><section class="feature-card wide"><div class="card-num">' + String(scene.index).padStart(2, "0") + '</div><h2>' + text + '</h2><p>' + accent + '</p></section><div class="side-note">' + cards + '</div></div>' + pageChrome + '</article>';
  }

  return '<article class="frame enter"><div class="kicker">' + escapeHtml(scene.label) + '</div><div class="content grid-content"><section class="feature-card compact"><div class="card-num">' + String(scene.index).padStart(2, "0") + '</div><h2>' + text + '</h2><p>' + accent + '</p></section><div class="card-grid">' + cards + '</div></div>' + pageChrome + '</article>';
}

function tick(now) {
  const ms = manualTime ?? ((now - startedAt) % data.durationMs);
  render(ms);
  if (manualTime === null) {
    requestAnimationFrame(tick);
  }
}

window.__setVideoTime = (ms) => {
  manualTime = ms;
  render(ms);
};

window.__playPreview = () => {
  manualTime = null;
  startedAt = performance.now();
  requestAnimationFrame(tick);
};

requestAnimationFrame(tick);
`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
