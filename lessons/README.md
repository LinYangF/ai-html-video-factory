# Lessons

每个教案放在一个独立目录里，目录名建议使用短横线 slug。

示例：

```text
lessons/
  chapter1-buy-side-vs-sell-side/
    lesson.md
    pages.md
    narration.md
    full.txt
    audio.wav
    voice.mp3
    whisper.srt
    subtitles.srt
    output/
```

创建新教案目录：

```bash
npm run lesson:init -- chapter1-buy-side-vs-sell-side
```

一键生成到音频：

```bash
npm run lesson:audio:all -- chapter1-buy-side-vs-sell-side
```
