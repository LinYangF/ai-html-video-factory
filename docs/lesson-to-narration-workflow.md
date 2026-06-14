# 教案到演示视频文案工作流

这个工作流用于把一段课程教案，整理成适合 AI 视频生成的输入内容。

目标链路：

```text
教案 -> 画面页文案 -> 逐页口播稿 -> 音频 -> SRT 字幕 -> HTML 预览 -> MP4 视频
```

## 1. 准备教案

把原始教案整理成纯文本，建议保存到独立 lesson 目录：

```text
lessons/chapter-name/lesson.md
```

可以用命令创建目录：

```bash
npm run lesson:init -- chapter-name
```

教案不需要一开始就很精炼，但最好包含：

- 课程主题
- 教学目标
- 核心概念
- 示例或故事
- 方法步骤
- 小结和思考题

处理原则：

- 保留真实教学内容，不要先删太多。
- 删除明显无关的排版符号。
- 表格可以保留，但后续要改写成口语化说明。

## 2. 教案改写成画面页文案

这一阶段的目标是把长教案拆成一页一页的演示内容。

每页只讲一个重点，推荐结构：

```text
导入问题 -> 核心概念 -> 示例说明 -> 方法步骤 -> 总结提升
```

每页包含四个字段：

```text
【画面标题】
【旁白】
【画面建议】
【预计时长】
```

推荐提示词：

```text
请把下面这段教案改写成适合演示视频使用的文案。

要求：
1. 按“画面页”拆分。
2. 每页包含【画面标题】【旁白】【画面建议】【预计时长】。
3. 语言要口语化，适合学生理解。
4. 每页只讲一个重点。
5. 整体结构按照“导入问题 -> 核心概念 -> 示例说明 -> 方法步骤 -> 总结提升”组织。
6. 不要写成论文，不要堆概念，要像老师在课堂上带着学生理解。

以下是教案内容：
```

输出建议保存为：

```text
lessons/chapter-name/pages.md
```

质量检查：

- 每页标题能不能一眼看懂？
- 每页旁白是否只讲一个重点？
- 示例是否足够生活化？
- 画面建议是否能直接指导生成 HTML 页面？
- 总时长是否符合预期？

## 3. 画面页文案改成逐页口播稿

这一阶段的目标是把每页的【旁白】改成真正适合朗读的口播稿。

口播稿要求：

- 更像老师自然说话。
- 短句多一点，少用长复句。
- 重要概念要先用白话解释，再补充英文或术语。
- 每页之间要有自然过渡。
- 不要读出“画面标题”“画面建议”等标签。

推荐提示词：

```text
请把下面的演示视频文案改写成逐页口播稿。

要求：
1. 保留原来的画面页顺序。
2. 每页只输出【画面标题】和【口播稿】。
3. 口播稿要像老师对学生自然讲解，不要像书面稿。
4. 短句为主，适合 TTS 朗读。
5. 术语第一次出现时，用一句白话解释。
6. 每页之间加入自然过渡，但不要太啰嗦。
7. 不要输出画面建议和预计时长。

以下是演示视频文案：
```

输出建议保存为：

```text
lessons/chapter-name/narration.md
```

## 4. 合并成整段口播文本

第一版音频建议先生成整段，便于快速听整体效果。

合并规则：

- 删除页码、标签和 Markdown 装饰。
- 保留自然段。
- 每个画面页之间空一行。
- 不要加入多余解释。
- 不要把画面建议读进去。

输出建议保存为：

```text
lessons/chapter-name/full.txt
```

## 5. 生成音频

当前本地推荐使用 CosyVoice 生成整段音频。

输入：

```text
lessons/chapter-name/full.txt
```

输出：

```text
lessons/chapter-name/audio.wav
lessons/chapter-name/voice.mp3
```

第一版先听这些点：

- 声音是否自然。
- 语速是否适合学生跟上。
- 概念解释有没有太密。
- 有没有明显读错的英文、数字或专有名词。

如果某些词经常读错，可以在口播稿里改成更容易读的写法。

## 6. 用剪映生成 SRT

音频生成后，把 `lessons/chapter-name/voice.mp3` 或 `lessons/chapter-name/audio.wav` 导入剪映。

在剪映里使用自动字幕功能生成字幕，然后导出 SRT。

导出的最终字幕保存为：

```text
lessons/chapter-name/subtitles.srt
```

字幕只负责时间轴和总时长，不建议直接拿字幕内容生成画面页。

如果要生成演示动画页面，需要准备画面脚本：

```text
lessons/chapter-name/scenes.json
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

`durationSec` 用来控制每页画面的大致占比。系统会按整段字幕总时长自动缩放，不要求这些秒数精确等于音频时长。

质量检查：

- 专有名词是否正确，例如 Buy Side、Sell Side、alpha。
- 是否有错别字。
- 是否有单字字幕。
- 字幕是否能被 `npm run build:html` 正常解析。

## 7. 设计 HTML 动画页节奏

SRT 只负责字幕和总时长，不直接决定画面。真正的 PPT 页面结构和动画节奏由 `scenes.json` 控制。

详细质量规范见：

```text
docs/ppt-animation-quality-guide.md
```

推荐采用“逐步呈现信息”的方法，而不是一页开始就把所有内容铺满：

1. 页面开始时，先出现主视觉或主标题。
2. 稍后出现一句核心解释。
3. 旁白讲到一个关键词，再弹出对应卡片、节点或对比项。
4. 每个 `items[]` 只承载一个小重点。
5. 当前讲到的卡片可以短暂高亮，让观众知道眼睛该看哪里。

`revealMs` 使用整条音频中的绝对毫秒时间。比如旁白在第 52.8 秒讲到“提供交易”，就在对应卡片上写 `52800`：

```json
{
  "title": "卖方 Sell Side",
  "body": "提供交易、融资、研究、报价等服务",
  "kind": "step",
  "label": "概念 02",
  "startMs": 42933,
  "endMs": 65633,
  "items": [
    { "tag": "01", "title": "提供交易", "body": "帮客户完成买卖", "revealMs": 52800 },
    { "tag": "02", "title": "融资", "body": "帮公司找钱", "revealMs": 54700 },
    { "tag": "03", "title": "研究", "body": "写研究报告", "revealMs": 55400 },
    { "tag": "04", "title": "报价", "body": "提供买卖价格", "revealMs": 57266 }
  ]
}
```

动效节奏参考：

- 标题页：慢入场，先问题，再补充背景。
- 对比页：左右两侧分开进入，不要同时出现。
- 流程页：节点按讲述顺序逐个点亮。
- 故事页：按“人物 -> 行为 -> 结果”的镜头顺序推进。
- 总结页：先给结论，再逐条出现 takeaway。

质量检查：

- 暂停在每页开始 0.5 秒时，页面不应该已经铺满所有卡片。
- 旁白说到“提供交易”“融资”“研究”等词时，对应卡片才出现。
- 字幕在底部，只辅助听觉，不应该变成画面主体。
- 每页只有一个主重点，其他信息都作为逐项补充。
- 第 8 页之后也必须继续和音频对齐，不能只检查前 2 分钟。
- 没有明确子项的页面应该是单主卡，不要硬拆 `01/02/03`。

## 8. 生成 HTML 预览和 MP4

生成前先检查 `scenes.json`：

```bash
npm run lesson:check-scenes -- chapter-name
```

生成 HTML 预览：

```bash
npm run lesson:activate -- chapter-name
npm run build:html
```

生成视频：

```bash
npm run render
```

输出：

```text
output/current/preview.html
output/current/video.mp4
lessons/chapter-name/output/preview.html
lessons/chapter-name/output/video.mp4
```

## 推荐文件流转

```text
lessons/chapter-name/lesson.md
  -> lessons/chapter-name/pages.md
  -> lessons/chapter-name/narration.md
  -> lessons/chapter-name/full.txt
  -> lessons/chapter-name/audio.wav
  -> lessons/chapter-name/voice.mp3
  -> lessons/chapter-name/subtitles.srt
  -> lessons/chapter-name/scenes.json  # 画面页、视觉结构、revealMs 动画节奏
  -> input/voice.mp3 + input/subtitles.srt
  -> input/scenes.json
  -> output/current/preview.html
  -> output/current/video.mp4
  -> lessons/chapter-name/output/preview.html
  -> lessons/chapter-name/output/video.mp4
```

## 最小可行版本

如果只想快速跑通一版：

1. 把教案改成逐页演示文案。
2. 把所有旁白合并成整段口播稿。
3. 用 CosyVoice 生成一整段音频。
4. 用剪映生成并导出 SRT。
5. 把 SRT 保存为 `lessons/chapter-name/subtitles.srt`。
6. 执行 `npm run lesson:activate -- chapter-name` 和 `npm run render`。

这个版本先追求完整闭环，不追求每页音频精细拆分。

## 自动化命令

项目已经内置教案到音频的自动化入口。

准备教案：

```text
lessons/chapter-name/lesson.md
```

使用 OpenAI 兼容接口：

```bash
export OPENAI_API_KEY=你的_API_Key
export OPENAI_MODEL=gpt-4o-mini
npm run lesson:audio:all -- chapter-name
```

使用本地 Ollama：

```bash
export LLM_PROVIDER=ollama
export OLLAMA_MODEL=qwen2.5:14b
npm run lesson:audio:all -- chapter-name
```

也可以分步执行：

```bash
npm run lesson:init -- chapter-name
npm run lesson:pages -- chapter-name
npm run lesson:narration -- chapter-name
npm run lesson:full -- chapter-name
npm run lesson:audio -- chapter-name
```

默认输出：

```text
lessons/chapter-name/pages.md
lessons/chapter-name/narration.md
lessons/chapter-name/full.txt
lessons/chapter-name/audio.wav
lessons/chapter-name/voice.mp3
```

渲染前激活某个 lesson：

```bash
npm run lesson:activate -- chapter-name
npm run render
```

或者直接激活并渲染：

```bash
npm run lesson:render -- chapter-name
```
