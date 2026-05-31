# 🎮 Vibe Gaming

A personal browser-based gaming hub built entirely from scratch using vanilla HTML, CSS, and JavaScript. No frameworks, no game engines — just hand-written code and a love for building things.

> **No downloads. No installations. Just click, play, and enjoy.**

---

## 🕹️ Games

| Game | Description | Controls |
|------|-------------|----------|
| 🧠 **Memory Match** | Flip cards and match all 8 emoji pairs in the fewest moves. Cards shuffle randomly every game. | Click to flip |
| 🏃 **Endless Runner** | Dodge obstacles in a neon-lit world. Speed increases over time — beat your high score. | `Space` / `↑` Jump · `↓` Duck |
| ❌ **Tic-Tac-Toe** | Classic 1v1 on the same device. X vs O — get three in a row to win. | Click a square |
| 🐍 **Snake** | Eat food to grow, avoid your own tail and the walls. | `↑ ↓ ← →` Arrow keys |
| 🧱 **Brick Breaker** | 8-level upgraded brick breaker with power-ups, lives, combos, and particle effects. | `← →` / Mouse · `Space` launch · `P` pause |

---

## ✨ Brick Breaker — Feature Highlights

The most technically involved game in the project, rebuilt from the ground up:

- **8 levels** — rows and ball speed increase each level; armored (2-hit) bricks appear from level 4
- **3 lives** — heart display in HUD; lose a life when the ball falls
- **4 power-ups** — drop from glowing bricks and fall for the paddle to catch:
  - 🟦 **WIDE** — expands paddle width for 7 seconds
  - 🟩 **SLOW** — reduces ball speed for 6 seconds
  - 🔴 **+Life** — adds one extra life (max 5)
  - 🟠 **FIRE** — fireball passes through bricks for 5 seconds
- **Combo multiplier** — consecutive brick hits chain up to 8× score bonus
- **Particle explosions** on every brick break
- **Accurate circle-vs-AABB collision** with face detection (top/bottom/left/right)
- **Paddle angle control** — ball reflects at an angle based on where it hits the paddle
- **Mouse + keyboard** — smooth mouse-follow or hold `← →` keys
- **Persistent high score** via `localStorage`
- **Full state machine** — MENU → PLAYING → PAUSED → LIFE_LOST → GAME_OVER → WIN

---

## 📁 Project Structure

```
VibGaming/
│
├── index.html              # Home page — game hub
├── about.html              # About the project
│
├── assets/
│   ├── images/             # All .jpg background and preview images
│   ├── videos/             # Game demo .mp4 clips
│   └── audio/              # Background music (bg-music.mp3)
│
├── css/
│   ├── main.css            # Shared styles + home page layout
│   ├── brick.css           # Brick Breaker styles
│   ├── memory.css          # Memory Match styles
│   ├── tictactoe.css       # Tic-Tac-Toe styles
│   ├── snake.css           # Snake styles
│   └── runner.css          # Endless Runner styles
│
├── js/
│   ├── home.js             # Card flip animations + runner preview canvas
│   ├── brick.js            # Brick Breaker — full game engine (721 lines)
│   ├── memory.js           # Memory Match logic
│   ├── tictactoe.js        # Tic-Tac-Toe logic
│   ├── snake.js            # Snake game logic
│   └── runner.js           # Endless Runner game engine
│
└── games/
    ├── brick.html          # Brick Breaker
    ├── memory.html         # Memory Match
    ├── tictactoe.html      # Tic-Tac-Toe
    ├── snake.html          # Snake
    └── runner.html         # Endless Runner
```

---

## 🚀 Running Locally

No build step, no dependencies.

**Option 1 — Open directly:**
```
Open index.html in any modern browser.
```

**Option 2 — Local server (recommended to avoid CORS issues with assets):**
```bash
# Python
python -m http.server 8000

# Node (if http-server is installed)
npx http-server .
```
Then visit `http://localhost:8000` in your browser.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Markup | HTML5 |
| Styling | CSS3 — custom properties, flexbox, grid, keyframe animations, `backdrop-filter` |
| Logic | Vanilla JavaScript (ES6+) — Canvas API, `requestAnimationFrame`, `localStorage` |
| Fonts | Google Fonts (Orbitron, Nunito), CDN Fonts (SurprisedMonkey) |
| Icons | Font Awesome 6 |
| Assets | Custom images, self-recorded demo videos |

No libraries. No build tools. No dependencies.

---

## 🎨 Design Decisions

- **Neon / dark aesthetic** — consistent across all games and the home page. Dark backgrounds with glowing cyan, magenta, and lime accents.
- **Separated concerns** — every game has its own `.html`, `.css`, and `.js` file. No inline styles or scripts anywhere.
- **Shared `main.css`** — nav, back button, footer, and hero section are defined once and reused.
- **Fisher-Yates shuffle** in Memory Match for truly random card placement (not biased `sort(() => 0.5 - Math.random())`).
- **Canvas-based games** (Brick Breaker, Snake, Endless Runner) use `requestAnimationFrame` loops, not `setInterval`, for smooth 60fps rendering.

---

## 📌 Known Limitations

- No mobile touch controls on canvas games (Brick Breaker, Snake, Runner) — keyboard/mouse only.
- No backend — suggestion box and rating in the footer are UI-only.
- High score in Brick Breaker is stored in `localStorage` and is browser/device specific.

---

## 📄 License

Personal project — all rights reserved. Feel free to look around and learn from the code, but please don't redistribute it as your own.