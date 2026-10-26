# ⚡ Apex ClipStudio AI — Autonomous Viral Video Suite
### In-House Alternative to Viblo AI ($49/mo) and OpusClip ($29/mo)

Generate unlimited 1080x1920 60fps vertical shorts with zero credit limits, zero subscriptions, and zero watermarks.

---

## 🚀 Included Automation Engines:
1. **Auto-Clipper & 9:16 Reframe Engine** (`auto_clipper.py`):
   - Turns landscape 16:9 podcasts/streams into high-retention 9:16 vertical shorts.
   - Adds cinematic blurred background and sharp focused center.
   - Embeds bold hook banners and call-to-action badges.

2. **Viral Split-Screen Creator** (`split_screen_generator.py`):
   - Places talking-head/podcast on top (1080x960) and satisfying gameplay/b-roll on bottom (1080x960).
   - Adds glowing neon divider and hook overlay.

3. **Viral Text Story / SMS Drama Generator** (`text_story_generator.py`):
   - Converts any text dialogue JSON into authentic animated iMessage chat bubbles over background video.

4. **Web Studio Dashboard** (`clipping_studio.html`):
   - Interactive local browser interface to preview, switch modes, and copy ready-to-post YouTube Shorts / TikTok metadata.

---

## 🛠️ Quick Start Guide:
```bash
# 1. Generate 9:16 Reframe Short
python3 auto_clipper.py --local-input "source.mp4" --hook "MIND-BLOWING SECRET 🤯" --sub "Follow for Part 2"

# 2. Generate Split-Screen Video
python3 split_screen_generator.py --top "podcast.mp4" --bottom "gameplay.mp4" --hook "REACTION MOMENT"

# 3. Generate Fake Text Story Short
python3 text_story_generator.py --bg "gameplay.mp4" --script "sample_story.json" --out "text_story.mp4"
```

Enjoy 100% free, unlimited viral video creation!
