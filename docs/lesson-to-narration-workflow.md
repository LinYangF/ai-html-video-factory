# 教案到演示视频文案工作流

这个工作流用于把一段课程教案，整理成适合 AI 视频生成的输入内容。

目标链路：

```text
教案 -> 画面页文案 -> 逐页口播稿 -> 音频 -> SRT 字幕 -> HTML 预览 -> MP4 视频
```

## 1. 准备教案

把原始教案整理成纯文本，建议保存为：

```text
input/lesson.md
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
narration/pages/chapter-name-pages.md
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
narration/pages/chapter-name-narration.md
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
narration/full/chapter-name.txt
```

## 5. 生成音频

当前本地推荐使用 CosyVoice 生成整段音频。

输入：

```text
narration/full/chapter-name.txt
```

输出：

```text
audio/full/chapter-name.wav
input/voice.mp3
```

第一版先听这些点：

- 声音是否自然。
- 语速是否适合学生跟上。
- 概念解释有没有太密。
- 有没有明显读错的英文、数字或专有名词。

如果某些词经常读错，可以在口播稿里改成更容易读的写法。

## 6. 用 Whisper 生成 SRT

音频生成后，用 Whisper 生成初版字幕：

```bash
whisper audio/full/chapter-name.wav \
  --language Chinese \
  --model small \
  --device cuda \
  --fp16 True \
  --output_format srt \
  --output_dir input/whisper
```

初版字幕保存为：

```text
input/whisper/chapter-name.srt
```

然后把它复制到项目默认入口：

```bash
cp input/whisper/chapter-name.srt input/subtitles.srt
```

## 7. 用原始口播稿校正字幕

Whisper 的时间轴通常可用，但文字可能有错。

推荐做法：

- 时间轴参考 Whisper。
- 字幕文本使用原始口播稿。
- 合并过短字幕，避免一字一条。
- 保留自然停顿和标点。
- 最终写入 `input/subtitles.srt`。

校正后字幕建议另存一份：

```text
input/subtitles_corrected.srt
```

质量检查：

- 专有名词是否正确，例如 Buy Side、Sell Side、alpha。
- 是否有错别字。
- 是否有单字字幕。
- 结尾是否有 Whisper 幻觉文本。
- 字幕是否能被 `npm run build:html` 正常解析。

## 8. 生成 HTML 预览和 MP4

生成 HTML 预览：

```bash
npm run build:html
```

生成视频：

```bash
npm run render
```

输出：

```text
output/preview.html
output/video.mp4
```

## 推荐文件流转

```text
input/lesson.md
  -> narration/pages/chapter-name-pages.md
  -> narration/pages/chapter-name-narration.md
  -> narration/full/chapter-name.txt
  -> audio/full/chapter-name.wav
  -> input/whisper/chapter-name.srt
  -> input/subtitles.srt
  -> output/preview.html
  -> output/video.mp4
```

## 最小可行版本

如果只想快速跑通一版：

1. 把教案改成逐页演示文案。
2. 把所有旁白合并成整段口播稿。
3. 用 CosyVoice 生成一整段音频。
4. 用 Whisper 生成 SRT。
5. 用原始口播稿校正 SRT 文本。
6. 执行 `npm run build:html` 和 `npm run render`。

这个版本先追求完整闭环，不追求每页音频精细拆分。
