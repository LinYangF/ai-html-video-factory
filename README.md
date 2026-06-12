# AI HTML Video Factory

把一段 SRT 时间轴字幕生成 PPT 风格 HTML 动画页面，并渲染为 MP4。

核心流程：

```text
文案 -> 音频 -> SRT 字幕 -> HTML 动画页面 -> MP4 视频
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
output/preview.html
output/video.mp4
```

启动预览服务：

```bash
npm run dev
```

然后打开：

```text
http://localhost:4173/preview.html
```

## 输入文件

把你的文件放到 `input/`：

```text
input/
  script.md        # 原始文案，可选
  voice.mp3        # 解说音频，可选；不存在时自动生成静音音轨
  subtitles.srt    # 必需，带时间戳的字幕
  style.json       # 可选，控制主题、字体、颜色、尺寸和帧率
```

`subtitles.srt` 是最关键的文件。示例：

```srt
1
00:00:00,000 --> 00:00:02,500
今天这期视频包括你看到的每一页画面

2
00:00:02,500 --> 00:00:05,200
都不是用传统剪辑软件做的
```

## 命令说明

```bash
npm run build:html
```

读取 `input/subtitles.srt` 和 `input/style.json`，生成 `output/preview.html`。

```bash
npm run render
```

先生成 HTML 预览，再把时间轴渲染为帧序列，最后用 FFmpeg 合成为 `output/video.mp4`。

```bash
npm run dev
```

启动本地预览服务。

## 目录结构

```text
ai-html-video-factory/
  input/
  output/
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
- 自动调用 Whisper 生成 SRT。
- 根据字幕内容选择更多模板。
- 关键词高亮。
- 竖屏 1080x1920 输出。
- 批量渲染多个视频。
