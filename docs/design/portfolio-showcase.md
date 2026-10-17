# Portfolio showcase delivery

Updated 2026-10-17: a brisk, silent 54.53-second tour following the requested interaction sequence. Captured from the populated local demo as an authenticated presenter. No login, captions, exports, submitted task edits, creation or deletion. Opening a notification may mark it read, as requested. No unexpected API mutation or download was detected.

## Media

Installed in `/Users/user/Projects/Base/public/media/`, with local copies in ignored `demo-recording/delivery/`:

| Asset | Resolution | Size |
| --- | --- | --- |
| `nodal-demo.mp4` | 2880×1800 | 6,233,959 bytes |
| `nodal-demo.webm` | 2880×1800 | 8,495,544 bytes |
| `nodal-demo-mobile.mp4` | 1440×900 | 2,556,883 bytes |
| `nodal-demo-mobile.webm` | 1440×900 | 3,290,438 bytes |
| `nodal-demo-poster.jpg` | 2880×1800 | 289,962 bytes |

All four videos are 30 fps, contain one video stream and no audio/subtitles. MP4 uses H.264, yuv420p, BT.709 limited range and faststart. WebM uses VP9. The poster now uses the dark Reports frame at 41.4 seconds; portfolio metadata matches.

The layout is 1440×900 logical pixels at native deviceScaleFactor 2, captured as 2880×1800 JPEG quality-100 screencast frames. This is a fresh Retina render, not an upscale of the previous recording. Timestamped source frames, scene marks and the FFmpeg concat manifest are in ignored `demo-recording/retina-selected/`; exports and ffprobe verification are in `demo-recording/retina-release/`. Previous delivery files are retained in `demo-recording/previous-delivery/`.

## Coverage

Approximate times; frame normalization adds less than one second across the clip.

| Time | Scene |
| --- | --- |
| 0–6s | Tasks: type Portal, Blocked, Due this week, Clear |
| 6–11s | Filters: All statuses → To Do; All projects → first project; select a tag; Clear |
| 11–14s | Columns: enable Recurring and Subtasks |
| 14–20s | Portal task inspector: properties, subtasks, attachment and discussion |
| 20–22s | Create task: expand optional controls, cancel |
| 22–28s | Tasks calendar: Month → populated Day → Week |
| 28–36s | Schedule: date picker → Next 7 Days → Daniel Tan; inspect a timeline task |
| 36–46s | Reports: hover PDF and Excel; switch light to dark; Logged Time, Task Completions, Team Summary |
| 46–50s | Notifications: open inbox, open an item, Done, close |
| 50–55s | Return to Logged Time and light theme |

## Portfolio behavior and verification

The listing player selects the 1440×900 mobile export at widths up to 767px, and the Retina export above that. Both it and the 3D workbook prefer MP4, the smaller delivery format, with WebM fallback. The workbook receives the same mobile variants. Existing playback policy and the 52% black overlay are preserved.

Playwright CLI verified the actual portfolio listing in local Chromium:

- Desktop selects 2880×1800 MP4: 300 decoded frames over 10 seconds, zero dropped frames.
- Mobile-sized viewport selects 1440×900 MP4: 150 decoded frames over 5 seconds, zero dropped frames.
- No video resource requests before scrolling the mobile player into view.
- Scrolling offscreen pauses playback.
- Reduced motion keeps the poster, paused at time zero, with readyState 0.
- Desktop and mobile screenshots reviewed at `/tmp/nodal-retina-portfolio-desktop.png` and `/tmp/nodal-retina-portfolio-mobile.png`.

Portfolio typecheck, targeted existing media-mapping/source tests (6 tests), and production build pass. NODAL typecheck passes. Playback measurements cover local Chromium, not physical mobile hardware or Safari. No deployment or commits were made.

## Dark-first variant — 2026-10-18

`DEMO_START_DARK=true` repeats the same feature sequence, opening Tasks in dark mode and switching to light when Schedule opens. Reports and notifications then remain light. The export ends after the completed notification interaction, omitting the redundant closing return; a small pacing adjustment keeps it approximately one minute.

The separate asset family is `nodal-demo-dark.mp4`, `nodal-demo-dark.webm`, `nodal-demo-dark-mobile.mp4`, `nodal-demo-dark-mobile.webm` and `nodal-demo-dark-poster.jpg`, saved alongside the originals in the portfolio's `public/media/` and local `demo-recording/delivery/`. The default portfolio recording is unchanged. Desktop remains native 2880×1800 at 30 fps; mobile is 1440×900. The poster matches 0.4 seconds. Raw frames and theme-switch marks are in ignored `demo-recording/dark-selected/`.

The Retina MP4 is 58.966667 seconds and 5,986,959 bytes, H.264/yuv420p with faststart and no audio. Browser playback was verified in Chromium, with CLI screenshots at `/tmp/nodal-demo-dark-opening.png` and `/tmp/nodal-demo-dark-schedule-light.png`; the encoded Schedule frame at 36 seconds is light. No production data reset, deployment or replacement of the original clip.
