# Emmy's Coding Game

A plain HTML/JS/CSS browser game hosted on GitHub Pages.

## Commands

| Command | Description |
|---------|-------------|
| `open index.html` | Open locally in browser |
| `python3 -m http.server` | Serve locally at localhost:8000 |

## Architecture

```
Emmys-Coding-Game/
  index.html    # Entry point and game UI
  style.css     # All styles
  game.js       # Game logic
  assets/       # Images, sounds, fonts
```

## Code Style

- Vanilla JS only, no frameworks or build tools
- `const`/`let`, no `var`
- camelCase functions and variables

## Deploy

GitHub Pages: Settings → Pages → Deploy from branch → `main` / `root`

## Gotchas

- No build step — changes to files are live immediately when refreshed
- GitHub Pages serves from root, so all asset paths must be relative
