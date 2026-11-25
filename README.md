# fireturd-lite

fireturd_Lite picks one chess move. It reads a FEN from standard input and writes a UCI move to standard output. `fighter.js` is the file a ladder loads. The readable program is `src/engine.js`; `npm run build` minifies it into `fighter.js` and puts the original `@RAZOR_X_5S_KNOBS` block back in place.

The built entry is 109036 bytes. The source file is 163338 bytes. Both sizes were measured with `wc -c` after the build in this change.

## Requirements

Node.js 20 or newer. Running `fighter.js` needs only Node. `npm install` is for the tests and for rebuilding.

## Play a move

```bash
printf '%s\n' 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' | node fighter.js
```

That start position is in the opening book and the program prints:

```text
e2e4
```

For any other legal FEN it searches and prints the chosen move, such as `e7e8q` when a pawn promotes. When the side to move has no legal move, including checkmate and stalemate, it prints `0000`. A blank or malformed FEN exits with status 1 and writes the reason to stderr.

Programs can also load the engine without starting the command line:

```js
const { pickMove, perft, parseFen } = require("./fighter.js");
pickMove("6k1/8/6K1/8/3Q4/8/8/8 w - - 2 2", { timeLimitMs: 200, maxDepth: 3 });
```

`pickMove` returns `uci`, `move`, `metrics`, and `trace`. `metrics.totalMs` is the elapsed time for that call. `trace.iterations` records each finished depth with a numeric score, the nodes searched, and the root moves considered. Pass `timeLimitMs` and `maxDepth` to cap a call. Omit them and the search uses the time knobs.

## What the search does

An opening-book hit returns immediately. Otherwise the engine runs iterative deepening with aspiration windows. The search has a transposition table, quiescence on captures and promotions, null-move pruning, late-move reductions, futility and razoring, late-move pruning, killer moves, a history table, and MVV-LVA capture ordering. A position repeated on the current line is scored as a draw. A halfmove clock of 100 or more is scored as a draw. The evaluation is a tapered piece-square table plus an adjustment from the embedded endgame and pattern tables.

Castling is generated only when the king is on e1 or e8, the rights are set, and the path is empty and not attacked. A double pawn push records an en-passant square only when an enemy pawn can capture there. The fullmove number advances after Black moves.

## Calibration

On startup the command line reads `calibration.json` next to `fighter.js`.

| Key | Values |
|---|---|
| `timePosture` | `fast`, `balanced`, `long` |
| `searchPosture` | `tactical`, `balanced`, `solid` |

`balanced` keeps the built-in knobs. `fast` and `long` change the time knobs. `tactical` and `solid` change the aspiration, futility, razor, and reduction knobs. A key that matches a knob name, including `layerTemps`, overrides that knob after the posture is applied. The file in this repo sets both postures to `balanced`. Unknown posture names throw.

## Develop

```bash
npm install
npm test
npm run build
npm run smoke
```

`npm test` runs 14 tests with `node --test`. The run that produced this README reported 14 passed and 0 failed. The tests check:

- Perft node counts on these FENs. Start position depths 1–4: 20, 400, 8902, 197281. `r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1` depths 1–3: 48, 2039, 97862. `8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1` depths 1–4: 14, 191, 2812, 43238. `r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1` depths 1–3: 6, 264, 9467. `rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8` depths 1–3: 44, 1486, 62379. `r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10` depths 1–3: 46, 2079, 89890.
- Legal moves against chess.js, including en passant, castling, and promotions.
- Make/unmake restoring the FEN, hash, and evaluation.
- A mate in one, stalemate, the opening book, calibration, and the command line.

`npm run smoke` loads the built `fighter.js`, checks the knob block, checks start-position perft at depth 4, and checks the command line.

GitHub Actions runs `npm ci`, `npm test`, `npm run build`, a clean diff of `fighter.js`, and `npm run smoke` on Ubuntu with Node.js 22.

## Files

| File | Purpose |
|---|---|
| `fighter.js` | Built ladder entry. Reads a FEN, writes a UCI move. |
| `src/engine.js` | Readable source. |
| `src/razor-knobs.snippet.js` | The knob block spliced back into `fighter.js` verbatim. |
| `calibration.json` | Postures applied at startup. |
| `manifest.json` | Ladder metadata. Name `fireturd_Lite`, entry `fighter.js`, version 1.1.0. |
| `profile.json` | Ladder card profile. |
| `test/engine.test.js` | Automated tests. |
| `scripts/build.js` | Minifies the source with terser. |
| `scripts/smoke.js` | Checks the built file. |

## License

All rights reserved by the author.
