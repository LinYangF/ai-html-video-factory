# AI HTML Video Factory

把一段 SRT 时间轴字幕生成 PPT 风格 HTML 动画页面，并渲染为 MP4。

核心流程：

```text
教案 -> 演示文案 -> 口播稿 -> 音频 -> SRT 字幕 -> HTML 动画页面 -> MP4 视频
```

教案改写、逐页口播稿、字幕校正的完整内容生产流程见：

```text
docs/lesson-to-narration-workflow.md
```

## 环境要求

- Node.js 18+
- npm
- FFmpeg

说明：

- 当前 MVP 不需要任何 npm 依赖，`npm install` 只用于生成/确认锁文件。
- 项目会优先尝试 Playwright 截取 HTML 帧；如果没有安装 Playwright 或没有可用浏览器，会自动退回到 SVG 帧渲染，仍然可以生成 MP4。
- 如果后续想启用浏览器截帧，可手动安装：`npm install playwright && npx playwright install chromium`。

## 快速开始

```bash
npm install
npm run build:html
npm run render
```

输出文件：

```text
output/current/preview.html
output/current/video.mp4
```

启动预览服务：

```bash
npm run dev
```

然后打开：

```text
http://localhost:4173/preview.html
```

## 教案到音频自动化

每个教案放在独立目录里。比如：

```text
lessons/chapter1-buy-side-vs-sell-side/lesson.md
```

可以先创建目录和教案占位文件：

```bash
npm run lesson:init -- chapter1-buy-side-vs-sell-side
```

使用 OpenAI 兼容接口：

```bash
export OPENAI_API_KEY=你的_API_Key
export OPENAI_MODEL=gpt-4o-mini
npm run lesson:audio:all -- chapter1-buy-side-vs-sell-side
```

或者使用本地 Ollama：

```bash
export LLM_PROVIDER=ollama
export OLLAMA_MODEL=qwen2.5:14b
npm run lesson:audio:all -- chapter1-buy-side-vs-sell-side
```

分步执行：

```bash
npm run lesson:init -- chapter1-buy-side-vs-sell-side       # 创建教案目录
npm run lesson:pages -- chapter1-buy-side-vs-sell-side      # 教案 -> 画面页文案
npm run lesson:narration -- chapter1-buy-side-vs-sell-side  # 画面页文案 -> 逐页口播稿
npm run lesson:full -- chapter1-buy-side-vs-sell-side       # 逐页口播稿 -> 整段口播文本
npm run lesson:audio -- chapter1-buy-side-vs-sell-side      # 整段口播文本 -> WAV/MP3
```

默认输出：

```text
lessons/chapter1-buy-side-vs-sell-side/pages.md
lessons/chapter1-buy-side-vs-sell-side/narration.md
lessons/chapter1-buy-side-vs-sell-side/full.txt
lessons/chapter1-buy-side-vs-sell-side/audio.wav
lessons/chapter1-buy-side-vs-sell-side/voice.mp3
```

渲染前，把某个教案激活到 `input/`：

```bash
npm run lesson:activate -- chapter1-buy-side-vs-sell-side
npm run render
```

也可以一条命令激活并渲染，视频会同时复制回对应教案目录：

```bash
npm run lesson:render -- chapter1-buy-side-vs-sell-side
```

## 输入文件

把你的文件放到 `input/`：

```text
input/
  script.md        # 原始文案，可选
  voice.mp3        # 解说音频，可选；不存在时自动生成静音音轨
  subtitles.srt    # 必需，带时间戳的字幕
  scenes.json      # 可选，控制画面页；不存在时会退回到按字幕生成画面
  style.json       # 可选，控制主题、字体、颜色、尺寸和帧率
```

`subtitles.srt` 只负责时间轴和总时长。示例：

```srt
1
00:00:00,000 --> 00:00:02,500
今天这期视频包括你看到的每一页画面

2
00:00:02,500 --> 00:00:05,200
都不是用传统剪辑软件做的
```

如果你想要真正的演示动画页面，而不是每条字幕生成一页，需要在 lesson 目录里提供：

```text
lessons/{lesson-slug}/scenes.json
```

示例：

```json
[
  {
    "title": "金融市场里，谁在赚钱？",
    "body": "同样都在金融行业，分工其实很不一样",
    "kind": "title",
    "label": "导入问题",
    "durationSec": 24
  }
]
```

执行 `npm run lesson:activate -- {lesson-slug}` 时，`scenes.json` 会被复制到 `input/scenes.json` 参与渲染。

## 命令说明

```bash
npm run build:html
```

读取 `input/subtitles.srt` 和 `input/style.json`，生成 `output/current/preview.html`。

```bash
npm run render
```

先生成 HTML 预览，再把时间轴渲染为帧序列，最后用 FFmpeg 合成为 `output/current/video.mp4`。

```bash
npm run dev
```

启动本地预览服务。

## 目录结构

```text
ai-html-video-factory/
  input/
  output/
    current/      # 当前激活 lesson 的临时预览、帧序列和视频
  lessons/
    lesson-slug/
      output/     # 这个 lesson 自己的最终预览和视频
  src/
    parseSrt.ts
    buildTimeline.ts
    generateHtml.ts
    renderVideo.ts
    renderSvgFrame.ts
    types.ts
  templates/
    base.html
    styles.css
    themes/
  scripts/
    dev.ts
```

## 当前 MVP 能力

- 读取并解析 SRT。
- 根据字幕生成时间轴场景。
- 生成 1920x1080 的 HTML 动画预览页。
- 按时间轴渲染帧。
- 合成 MP4。
- 没有 `voice.mp3` 时自动生成静音音轨，方便先验证视频画面。

## 后续可扩展方向

- 自动调用 TTS 生成音频。
- 支持导入剪映导出的 SRT 字幕。
- 自动把教案改写成画面页文案和逐页口播稿。
- 根据字幕内容选择更多模板。
- 关键词高亮。
- 竖屏 1080x1920 输出。
- 批量渲染多个视频。
