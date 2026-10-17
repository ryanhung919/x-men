# Portfolio showcase delivery

One browsing-only, silent product tour; recorded from the existing populated local Supabase demo with an authenticated presenter. No login, captions, marketing overlay, submitted edits, creation, deletion or exports. Capture detected no unexpected mutation or download. Existing tasks, dates, permissions and report calculations are preserved.

## Media

Final assets are installed at `/Users/user/Projects/Base/public/media/nodal-demo.mp4`, `nodal-demo.webm`, and `nodal-demo-poster.jpg`. Local copies are in ignored `demo-recording/delivery/`; raw capture and scene marks are in `demo-recording/take2/`.

Both encodings show the same 1440×900 sequence at 30 fps. MP4 H.264/yuv420p/faststart: 59.933333 s, 3,446,134 bytes. WebM VP9/yuv420p: 59.933 s, 2,882,606 bytes. FFprobe reports exactly one video stream per file, with no audio/subtitle streams. Poster is the MP4 frame at 3 s; portfolio metadata now matches. Source span 60.268 s was trimmed before login-free opening and normalized by 0.99555 to 60 s (encoding lands 59.933 s).

## Coverage

| Approximate final time | Scene |
| --- | --- |
| 0.0–6.0s | reportsLight |
| 6.0–10.0s | reportsThemeSwitch |
| 10.0–15.9s | reportComparisons |
| 15.9–22.9s | tasks |
| 22.9–31.9s | inspector |
| 31.9–35.8s | creation |
| 35.8–43.1s | calendar |
| 43.1–50.0s | schedule |
| 50.0–53.0s | notifications |
| 53.0–60.0s | closing |

Reports opens light, exposes scope/export affordances, switches through the real theme menu to dark, and shows all three report types. Tasks shows search, columns and filters. Customer portal v2 launch inspector exposes properties, subtasks, uploaded file and discussion with controlled scrolling. Creation opens optional controls and cancels; Calendar shows month/day/week using existing deadlines; Schedule is scoped to Customer Portal Revamp and opens/cancels a deadline editor. Notifications opens without reading an item. Closing returns to light Reports for continuity. Some capabilities are represented by their visible controls, rather than submitted operations, as approved.

## Portfolio verification

Preserved the existing 52% black scrim and player. Playwright CLI verified muted autoplay on visibility, WebM playback, MP4 fallback playback, loop wrap (59.7→0.7s), and paused poster at 0 s with reduced motion. Desktop 1440×900 and mobile 390×844 screenshots reviewed; mobile intentionally uses the existing cover crop. Light and dark dashboard frames remain visible behind the layer. No deployment.

Screenshots: `/tmp/nodal-portfolio-final-light.png`, `-dark.png`, `-poster.png`, `-mobile.png`. Contact sheet: `/tmp/nodal-final-contact-sheet.jpg`. Portfolio TypeScript/Vite production build passed; existing unrelated VERSO chunk-size advisory remains. Codec testing was in Chromium; cross-engine Safari/Firefox playback was not exercised.
