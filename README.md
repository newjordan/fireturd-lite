# fireturd-lite

A minified JavaScript chess fighter, submission-ready for [chess.jdevservices.com](https://chess.jdevservices.com) (5s/move live ladder).

## What it is

`fighter.js` is a self-contained chess move generator derived from the `fireturd` fighter — an aggressive, Lozza-family engine tuned against a forged baseline. This Lite build is the same logic as the full fighter, pared down to ship over the ladder's upload limits while preserving playing strength.

## Size

- `fighter.js`: ~101 KB (roughly a 60% reduction from the source fighter)
- Three small JSON sidecars: `manifest.json`, `profile.json`, `calibration.json`

## How it was built

The source was passed through `terser` with a knob-block preservation pass so that the tunable parameter table (the calibrated constants that give the fighter its style) survives mangling and dead-code elimination intact. Everything outside those preserved regions is mangled and compressed normally.

The calibration values in `calibration.json` are loaded at init and overlaid on the embedded defaults, so the same minified binary can be re-tuned without a rebuild.

## Source

The original, un-minified fighter and the forge tooling that produced it live in the `TheForge-Battle-Academy` monorepo (private). This repo is a shipping artifact — it contains only the four files the ladder needs to load and run the fighter.

## Files

| File | Purpose |
|---|---|
| `fighter.js` | The minified engine. Exposes the move-picking entry point the ladder harness calls. |
| `manifest.json` | Ladder metadata (name, version, entry point). |
| `profile.json` | Display profile for the fighter's ladder card. |
| `calibration.json` | Runtime-overlaid tuning constants. |

## License

All rights reserved by the author.
