# The Hero Was Not Invited

A 2D top-down action roguelite with a romantic-comedy twist, built with Phaser 3, TypeScript and Vite.
Every sprite, tile, sound effect and music track is original and generated in code, so there are no asset licenses to worry about.

> Spoiler warning for players: don't read `src/data/story.ts` or `src/scenes/EndingScene.ts` before finishing the game.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173 (also on your LAN, so you can test on a phone)
```

## Build for production

```bash
npm run build      # type-checks, then bundles into dist/
npm run preview    # serve the built version locally
```

The `dist/` folder is a static site. To deploy on Vercel, import the repo (the Vite preset is detected automatically) or run `npx vercel` in this folder. Netlify, GitHub Pages and any static host also work.

## Personalize it (recommended)

Open `src/data/story.ts`:

| Constant     | What it does                                                         |
| ------------ | -------------------------------------------------------------------- |
| `QUEEN_NAME` | The Demon Queen's name (boss bar, dialogue, credits)                 |
| `LOVER_NAME` | The mystery guy revealed in the ending (you!)                        |
| `GIFT_FOR`   | Dedication line in the final credits                                 |
| `MADE_BY`    | Your credit line                                                     |

All the dialogue (intro, notes, boss lines, the ending script and the credits) is in the same file, in Thai.
Thai text automatically uses the Kanit font with Thai-aware line wrapping (`src/ui/thai.ts`).

### Photos
Real photos are used as dialogue portraits and in the ending (a polaroid moment after the hug, the credits and the final card).
They live in `public/assets/photos/`; the original photos in `picture/` are not shipped:

| File | Used for |
| --- | --- |
| `queen.jpg`, `queen_cry.jpg`, `queen_love.jpg` | Queen portraits: normal / crying / in love (60x60) |
| `lover.jpg`, `lover_happy.jpg` | Lover portraits (60x60) |
| `card_queen.jpg`, `card_lover.jpg` | Polaroids in the ending (100x120) |

Replace any file with another image of the same size and name. If a file is missing, the game falls back to the pixel-art sprite.
Note: anything in `public/` is publicly downloadable once the game is deployed.
Character colors (hair, outfit, eyes) are the palettes `QUEEN_PAL`, `LOVER_PAL` and `HERO_PAL` in `src/art/sprites.ts`.

## Controls

| Action        | Desktop                       | Mobile                     |
| ------------- | ----------------------------- | -------------------------- |
| Move          | WASD / arrow keys             | Left-side virtual joystick |
| Aim           | Mouse                         | Auto-aims nearest enemy    |
| Attack        | Left click (hold)             | ATK button (hold)          |
| Dash          | Space / Shift / right click   | DASH button                |
| Swap weapon   | Q / mouse wheel / 1-2         | SWAP button                |
| Interact      | E                             | USE button (contextual)    |
| Pause         | Esc / P / pause button        | Pause button               |

## Project structure

```
src/
  main.ts                 entry: creates the Phaser game, audio unlock
  game/                   config.ts (Phaser config), constants.ts
  scenes/                 Boot, Menu, Intro, Game, HUD, Pause, Settings, Upgrade, GameOver, Ending
  entities/               Player, Enemy, DemonQueen, Projectile
  weapons/WeaponSystem.ts melee arcs, bullet deflection, ranged patterns, crits
  systems/                DungeonGenerator, EnemyAI, ProgressionSystem (save data), Fx, Settings, InputState
  ui/                     DialogueBox, VirtualJoystick, widgets (buttons/panels)
  data/                   weapons, enemies, stages, perks, story, roomTemplates
  art/                    PixelArt helpers, sprites, tiles, backgrounds (procedural textures)
  audio/                  AudioEngine (WebAudio synth + sequencer), music (chiptune tracks)
  utils/                  math, rng, helpers
```

To replace generated art with real PNGs, load images in `BootScene` using the same texture keys (for example `hero_idle0`, `queen_idle0`, `tiles_0`). Nothing else needs to change.

## Secret owner cheat
Open the game once with `?cheat=gato` added to the URL. That browser then remembers it.
In game, press **K** (or long-press the minimap on a phone) to defeat every monster in the room instantly.
`?cheat=off` turns it off. On other devices the key does nothing.

## Save data

Saved in `localStorage`: settings, the stage checkpoint (Continue / Retry Stage), the boss checkpoint (Retry Boss Fight) and achievements.
To reset, clear the site data in the browser.
