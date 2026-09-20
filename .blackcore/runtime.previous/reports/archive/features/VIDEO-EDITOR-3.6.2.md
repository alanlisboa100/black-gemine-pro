# BLACKCORE Native 3.6.2 — Video Editor

> Esta documentação descreve o editor legado. O pacote 3.7.0 substitui esse módulo pelo [AI Video Studio completo](VIDEO-STUDIO-3.7.0.md), mantendo todas as ações abaixo.

BLACKCORE now includes a structured `video_editor` tool for local FFmpeg editing on Termux/Android and Linux.

Supported actions: inspect, trim, timeline keep-cuts, concatenate, resize, crop, rotate, speed, volume, mute, fades, music mixing, subtitle burn-in, text overlay, watermark overlay, compression, audio extraction, thumbnails, silence detection, and scene-cut detection.

Android shared-storage paths such as `~/storage/shared/Movies/video.mp4` and `~/storage/downloads/video.mp4` are supported. BLACKCORE's normal external read/write permission prompts remain active unless the user selected the `yolo` permission profile.

FFmpeg and ffprobe are installed by the existing `creator` and `full` Termux profiles. If absent: `pkg install ffmpeg`.
