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
let lastSceneKey = "";

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
  const key = scene ? scene.index + ":" + scene.kind : "empty";
  const progress = Math.min(100, Math.max(0, (ms / data.durationMs) * 100));

  if (!scene) {
    stage.innerHTML = "";
    return;
  }

  if (key !== lastSceneKey) {
    lastSceneKey = key;
    stage.innerHTML = template(scene, progress);
  } else {
    const fill = stage.querySelector(".progress-fill");
    if (fill) {
      fill.style.setProperty("--progress", progress.toFixed(2) + "%");
    }
  }
}

function template(scene, progress) {
  const text = escapeHtml(scene.headline);
  const accent = scene.accent ? '<span class="accent">' + escapeHtml(scene.accent) + '</span>' : "";
  const full = escapeHtml(scene.text);
  const progressLine = '<div class="progress"><div class="progress-line"><div class="progress-fill" style="--progress: ' + progress.toFixed(2) + '%"></div></div><span>' + scene.index + '/' + data.scenes.length + '</span></div>';

  if (scene.kind === "title") {
    return '<article class="frame enter"><div class="kicker">' + escapeHtml(data.title) + '</div><div class="content"><h1 class="headline">' + text + ' ' + accent + '</h1><div class="subtitle">' + escapeHtml(data.subtitle) + '</div></div>' + progressLine + '</article>';
  }

  if (scene.kind === "quote" || scene.kind === "summary") {
    return '<article class="frame enter"><div class="kicker">' + escapeHtml(scene.label) + '</div><div class="content"><section class="card quote"><div class="quote-mark">“</div><p class="statement">' + full + '</p></section></div>' + progressLine + '</article>';
  }

  if (scene.kind === "tool") {
    return '<article class="frame enter"><div class="kicker">' + escapeHtml(scene.label) + '</div><div class="content"><h1 class="headline">' + text + ' ' + accent + '</h1><div class="steps"><div class="step-card"><div class="step-number">01</div><div class="step-label">文案</div></div><div class="step-card"><div class="step-number">02</div><div class="step-label">音频</div></div><div class="step-card"><div class="step-number">03</div><div class="step-label">SRT</div></div><div class="step-card"><div class="step-number">04</div><div class="step-label">HTML / MP4</div></div></div></div>' + progressLine + '</article>';
  }

  return '<article class="frame enter"><div class="kicker">' + escapeHtml(scene.label) + '</div><div class="content"><h1 class="headline">' + text + ' ' + accent + '</h1><section class="card"><p class="statement">' + full + '</p></section></div>' + progressLine + '</article>';
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
