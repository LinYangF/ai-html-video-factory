import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type PipelinePaths = {
  rootDir: string;
  inputDir: string;
  outputDir: string;
  lessonSlug: string;
  lessonDir: string;
  lessonPath: string;
  pagesPath: string;
  narrationPath: string;
  fullTextPath: string;
  wavPath: string;
  mp3Path: string;
  whisperPath: string;
  subtitlesPath: string;
  stylePath: string;
  activeVoicePath: string;
  activeSubtitlesPath: string;
  activeStylePath: string;
  previewPath: string;
  videoPath: string;
  lessonOutputDir: string;
};

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const command = process.argv[2] ?? "all";
  const paths = getPaths(rootDir, resolveLessonSlug());

  if (command === "pages") {
    await generatePages(paths);
    return;
  }

  if (command === "init") {
    await initLesson(paths);
    return;
  }

  if (command === "narration") {
    await generateNarration(paths);
    return;
  }

  if (command === "full") {
    await generateFullText(paths);
    return;
  }

  if (command === "audio") {
    await generateAudio(paths);
    return;
  }

  if (command === "activate") {
    await activateLesson(paths);
    return;
  }

  if (command === "render") {
    await renderLesson(paths);
    return;
  }

  if (command === "all") {
    await generatePages(paths);
    await generateNarration(paths);
    await generateFullText(paths);
    await generateAudio(paths);
    return;
  }

  throw new Error(`Unknown command "${command}". Use init, pages, narration, full, audio, activate, render, or all.`);
}

async function initLesson(paths: PipelinePaths): Promise<void> {
  await mkdir(paths.lessonDir, { recursive: true });
  if (!existsSync(paths.lessonPath)) {
    await writeFile(
      paths.lessonPath,
      `# ${paths.lessonSlug}\n\n把这节课的原始教案粘贴到这里。\n`,
      "utf8",
    );
    console.log(`Lesson created at ${paths.lessonPath}`);
    return;
  }
  console.log(`Lesson already exists at ${paths.lessonPath}`);
}

async function generatePages(paths: PipelinePaths): Promise<void> {
  const lesson = await readRequired(paths.lessonPath, `Put your lesson content in ${relative(paths.lessonPath)} first.`);
  const output = await callLlm([
    {
      role: "system",
      content:
        "你是课程视频脚本策划。你的任务是把教案改写成适合演示视频的逐页文案，语言清楚、口语化、适合学生理解。",
    },
    {
      role: "user",
      content: `请把下面这段教案改写成适合演示视频使用的文案。

要求：
1. 按“画面页”拆分。
2. 每页包含【画面标题】【旁白】【画面建议】【预计时长】。
3. 语言要口语化，适合学生理解。
4. 每页只讲一个重点。
5. 整体结构按照“导入问题 -> 核心概念 -> 示例说明 -> 方法步骤 -> 总结提升”组织。
6. 不要写成论文，不要堆概念，要像老师在课堂上带着学生理解。
7. 画面建议要能指导后续生成 HTML/PPT 风格页面。

以下是教案内容：

${lesson}`,
    },
  ]);

  await writeOutput(paths.pagesPath, output);
  console.log(`Page script written to ${paths.pagesPath}`);
}

async function generateNarration(paths: PipelinePaths): Promise<void> {
  const pages = await readRequired(
    paths.pagesPath,
    `Run npm run lesson:pages -- ${paths.lessonSlug} first, or put page script content in ${relative(paths.pagesPath)}.`,
  );
  const output = await callLlm([
    {
      role: "system",
      content:
        "你是适合 TTS 的中文口播稿编辑。你的任务是把演示页旁白改成自然、清晰、像老师讲课的逐页口播稿。",
    },
    {
      role: "user",
      content: `请把下面的演示视频文案改写成逐页口播稿。

要求：
1. 保留原来的画面页顺序。
2. 每页只输出【画面标题】和【口播稿】。
3. 口播稿要像老师对学生自然讲解，不要像书面稿。
4. 短句为主，适合 TTS 朗读。
5. 术语第一次出现时，用一句白话解释。
6. 每页之间加入自然过渡，但不要太啰嗦。
7. 不要输出画面建议和预计时长。

以下是演示视频文案：

${pages}`,
    },
  ]);

  await writeOutput(paths.narrationPath, output);
  console.log(`Page narration written to ${paths.narrationPath}`);
}

async function generateFullText(paths: PipelinePaths): Promise<void> {
  const narration = await readRequired(
    paths.narrationPath,
    `Run npm run lesson:narration -- ${paths.lessonSlug} first, or put page narration content in ${relative(paths.narrationPath)}.`,
  );
  const fullText = extractNarrationText(narration);
  await writeOutput(paths.fullTextPath, fullText);
  console.log(`Full narration text written to ${paths.fullTextPath}`);
}

async function generateAudio(paths: PipelinePaths): Promise<void> {
  await readRequired(paths.fullTextPath, `Run npm run lesson:full -- ${paths.lessonSlug} first.`);

  const cosyVoiceDir = process.env.COSYVOICE_DIR ?? "/home/sun/LinYF/CosyVoice";
  const cosyVoiceScript = process.env.COSYVOICE_TTS_SCRIPT ?? path.join(cosyVoiceDir, "scripts", "tts_full_text.py");
  const python = process.env.COSYVOICE_PYTHON ?? "/home/sun/anaconda3/envs/cosyvoice/bin/python";

  if (!existsSync(cosyVoiceScript)) {
    throw new Error(`CosyVoice TTS script not found: ${cosyVoiceScript}`);
  }

  if (!existsSync(python)) {
    throw new Error(`CosyVoice Python not found: ${python}`);
  }

  await mkdir(path.dirname(paths.wavPath), { recursive: true });
  await mkdir(path.dirname(paths.mp3Path), { recursive: true });

  await runCommand(python, [
    cosyVoiceScript,
    "--text",
    paths.fullTextPath,
    "--wav",
    paths.wavPath,
    "--mp3",
    paths.mp3Path,
  ]);

  console.log(`WAV written to ${paths.wavPath}`);
  console.log(`MP3 written to ${paths.mp3Path}`);
}

async function activateLesson(paths: PipelinePaths): Promise<void> {
  await mkdir(paths.inputDir, { recursive: true });
  await copyRequired(paths.subtitlesPath, paths.activeSubtitlesPath, "Final subtitles are required before rendering.");

  if (existsSync(paths.mp3Path)) {
    await copyFile(paths.mp3Path, paths.activeVoicePath);
    console.log(`Activated voice: ${relative(paths.mp3Path)} -> ${relative(paths.activeVoicePath)}`);
  } else {
    await rm(paths.activeVoicePath, { force: true });
    console.log(`No lesson voice found. Render will use a generated silent audio track.`);
  }

  if (existsSync(paths.stylePath)) {
    await copyFile(paths.stylePath, paths.activeStylePath);
    console.log(`Activated style: ${relative(paths.stylePath)} -> ${relative(paths.activeStylePath)}`);
  }

  console.log(`Activated subtitles: ${relative(paths.subtitlesPath)} -> ${relative(paths.activeSubtitlesPath)}`);
}

async function renderLesson(paths: PipelinePaths): Promise<void> {
  await activateLesson(paths);
  await runCommand(process.execPath, ["src/index.ts", "render"]);
  await mkdir(paths.lessonOutputDir, { recursive: true });
  await copyFile(paths.previewPath, path.join(paths.lessonOutputDir, "preview.html"));
  await copyFile(paths.videoPath, path.join(paths.lessonOutputDir, "video.mp4"));
  console.log(`Lesson preview written to ${path.join(paths.lessonOutputDir, "preview.html")}`);
  console.log(`Lesson video written to ${path.join(paths.lessonOutputDir, "video.mp4")}`);
}

async function callLlm(messages: ChatMessage[]): Promise<string> {
  const provider = (process.env.LLM_PROVIDER ?? "openai").toLowerCase();

  if (provider === "ollama") {
    return callOllama(messages);
  }

  return callOpenAiCompatible(messages);
}

async function callOpenAiCompatible(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY or LLM_API_KEY. Set it first, or use LLM_PROVIDER=ollama with a local Ollama model.",
    );
  }

  const baseUrl = (process.env.OPENAI_BASE_URL ?? process.env.LLM_BASE_URL ?? "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );
  const model = process.env.OPENAI_MODEL ?? process.env.LLM_MODEL ?? "gpt-4o-mini";
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: Number(process.env.LLM_TEMPERATURE ?? "0.4"),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM request failed: ${response.status} ${response.statusText}\n${body}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("LLM returned an empty response.");
  }
  return content;
}

async function callOllama(messages: ChatMessage[]): Promise<string> {
  const baseUrl = (process.env.OLLAMA_BASE_URL ?? "http://localhost:11434").replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL ?? process.env.LLM_MODEL ?? "qwen2.5:14b";
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: {
        temperature: Number(process.env.LLM_TEMPERATURE ?? "0.4"),
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama request failed: ${response.status} ${response.statusText}\n${body}`);
  }

  const data = (await response.json()) as { message?: { content?: string } };
  const content = data.message?.content?.trim();
  if (!content) {
    throw new Error("Ollama returned an empty response.");
  }
  return content;
}

function extractNarrationText(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const result: string[] = [];
  let collecting = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (result.at(-1) !== "") {
        result.push("");
      }
      continue;
    }

    if (/^#+\s*/.test(line) || /^[-*]\s*【?画面标题】?/.test(line) || /^【?画面标题】?/.test(line)) {
      collecting = false;
      continue;
    }

    const narrationMatch = line.match(/^[-*]?\s*【?口播稿】?[：:]\s*(.*)$/);
    if (narrationMatch) {
      collecting = true;
      if (narrationMatch[1]) {
        result.push(cleanNarrationLine(narrationMatch[1]));
      }
      continue;
    }

    if (/^[-*]?\s*【?(画面建议|预计时长|旁白)】?[：:]/.test(line)) {
      collecting = false;
      continue;
    }

    if (collecting) {
      result.push(cleanNarrationLine(line));
    }
  }

  const extracted = result
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (extracted) {
    return extracted + "\n";
  }

  return markdown
    .replace(/^#+\s*/gm, "")
    .replace(/^[-*]?\s*【?(画面标题|画面建议|预计时长)】?[：:].*$/gm, "")
    .replace(/^[-*]?\s*【?(口播稿|旁白)】?[：:]\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .concat("\n");
}

function cleanNarrationLine(line: string): string {
  return line.replace(/^[-*]\s*/, "").replace(/^["“]|["”]$/g, "").trim();
}

async function readRequired(filePath: string, hint: string): Promise<string> {
  try {
    const content = await readFile(filePath, "utf8");
    if (!content.trim()) {
      throw new Error(`Empty file: ${filePath}`);
    }
    return content.trim();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Missing file: ${filePath}\n${hint}`);
    }
    throw error;
  }
}

async function writeOutput(filePath: string, content: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content.trim() + "\n", "utf8");
}

async function copyRequired(source: string, target: string, hint: string): Promise<void> {
  if (!existsSync(source)) {
    throw new Error(`Missing file: ${source}\n${hint}`);
  }
  await copyFile(source, target);
}

function getPaths(baseDir: string, slug: string): PipelinePaths {
  const lessonDir = process.env.LESSON_DIR ?? path.join(baseDir, "lessons", slug);
  return {
    rootDir: baseDir,
    inputDir: path.join(baseDir, "input"),
    outputDir: path.join(baseDir, "output"),
    lessonSlug: slug,
    lessonDir,
    lessonPath: process.env.LESSON_INPUT ?? path.join(lessonDir, "lesson.md"),
    pagesPath: process.env.LESSON_PAGES_OUTPUT ?? path.join(lessonDir, "pages.md"),
    narrationPath: process.env.LESSON_NARRATION_OUTPUT ?? path.join(lessonDir, "narration.md"),
    fullTextPath: process.env.LESSON_FULL_OUTPUT ?? path.join(lessonDir, "full.txt"),
    wavPath: process.env.LESSON_WAV_OUTPUT ?? path.join(lessonDir, "audio.wav"),
    mp3Path: process.env.LESSON_MP3_OUTPUT ?? path.join(lessonDir, "voice.mp3"),
    whisperPath: process.env.LESSON_WHISPER_OUTPUT ?? path.join(lessonDir, "whisper.srt"),
    subtitlesPath: process.env.LESSON_SUBTITLES_OUTPUT ?? path.join(lessonDir, "subtitles.srt"),
    stylePath: process.env.LESSON_STYLE ?? path.join(lessonDir, "style.json"),
    activeVoicePath: path.join(baseDir, "input", "voice.mp3"),
    activeSubtitlesPath: path.join(baseDir, "input", "subtitles.srt"),
    activeStylePath: path.join(baseDir, "input", "style.json"),
    previewPath: path.join(baseDir, "output", "preview.html"),
    videoPath: path.join(baseDir, "output", "video.mp4"),
    lessonOutputDir: path.join(lessonDir, "output"),
  };
}

function resolveLessonSlug(): string {
  const rawSlug = process.argv[3] ?? process.env.LESSON_SLUG ?? "lesson";
  return slugify(rawSlug);
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) {
    throw new Error("Lesson slug cannot be empty.");
  }
  return slug;
}

function relative(filePath: string): string {
  return path.relative(rootDir, filePath);
}

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      env: process.env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with code ${code ?? "unknown"}`));
    });
  });
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
