"use strict";

const assert = require("assert");
const { spawnSync } = require("child_process");
const path = require("path");
const test = require("node:test");
const { Chess } = require("chess.js");
const engine = require("../src/engine.js");

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const PERFT = [
  [START, [20, 400, 8902, 197281]],
  [
    "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
    [48, 2039, 97862],
  ],
  ["8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1", [14, 191, 2812, 43238]],
  [
    "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1",
    [6, 264, 9467],
  ],
  ["rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8", [44, 1486, 62379]],
  [
    "r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10",
    [46, 2079, 89890],
  ],
];

function uciList(fen) {
  return engine
    .legalMoves(engine.parseFen(fen))
    .map((move) => engine.moveToUci(move))
    .sort();
}

function chessList(fen) {
  return new Chess(fen)
    .moves({ verbose: true })
    .map((move) => move.from + move.to + (move.promotion || ""))
    .sort();
}

function toFen(pos) {
  const rows = [];
  for (let rank = 0; rank < 8; rank++) {
    let empty = 0;
    let row = "";
    for (let file = 0; file < 8; file++) {
      const piece = pos.board[rank * 8 + file];
      if (!piece) {
        empty++;
        continue;
      }
      if (empty) {
        row += empty;
        empty = 0;
      }
      const letter = " pnbrqk"[piece.type];
      row += piece.color === 0 ? letter.toUpperCase() : letter;
    }
    if (empty) row += empty;
    rows.push(row);
  }
  let castle = "";
  if (pos.castleRights & 1) castle += "K";
  if (pos.castleRights & 2) castle += "Q";
  if (pos.castleRights & 4) castle += "k";
  if (pos.castleRights & 8) castle += "q";
  if (!castle) castle = "-";
  const ep =
    pos.epSq < 0
      ? "-"
      : "abcdefgh"[pos.epSq & 7] + (8 - (pos.epSq >> 3));
  const side = pos.side === 0 ? "w" : "b";
  return `${rows.join("/")} ${side} ${castle} ${ep} ${pos.halfmove} ${pos.fullmove}`;
}

test("perft matches the standard positions", () => {
  for (const [fen, counts] of PERFT) {
    counts.forEach((expected, index) => {
      const depth = index + 1;
      assert.equal(engine.perft(engine.parseFen(fen), depth), expected, fen);
    });
  }
});

test("legal moves match chess.js on tactical positions", () => {
  const fens = [
    START,
    "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
    "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1",
    "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1",
    "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8",
    "rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3",
    "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1",
    "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1",
    "rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 2",
  ];
  for (const fen of fens) assert.deepEqual(uciList(fen), chessList(fen), fen);
});

test("castling is generated only from the king's home square", () => {
  const moves = uciList("r3k2r/8/8/8/8/8/8/R2K3R w KQkq - 0 1");
  assert.equal(moves.includes("e1g1"), false);
  assert.equal(moves.includes("e1c1"), false);
  assert.equal(moves.includes("d1f1"), false);
  assert.ok(uciList("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1").includes("e1g1"));
});

test("make and unmake keep hash, eval, and FEN in step with a fresh parse", () => {
  const chess = new Chess();
  const pos = engine.parseFen(chess.fen());
  for (let ply = 0; ply < 24 && !chess.isGameOver(); ply++) {
    const moves = chess.moves({ verbose: true });
    const chosen = moves[ply % moves.length];
    const uci = chosen.from + chosen.to + (chosen.promotion || "");
    const move = engine.generateMoves(pos, false).find((item) => engine.moveToUci(item) === uci);
    assert.ok(move, uci);
    const undo = engine.makeMove(pos, move);
    chess.move(chosen);
    const reparsed = engine.parseFen(chess.fen());
    assert.equal(pos.hash, reparsed.hash, chess.fen());
    assert.equal(pos.mgScore, reparsed.mgScore);
    assert.equal(pos.egScore, reparsed.egScore);
    assert.equal(pos.phase, reparsed.phase);
    assert.equal(toFen(pos), chess.fen());
    engine.unmakeMove(pos, move, undo);
    chess.undo();
    assert.equal(toFen(pos), chess.fen());
    chess.move(chosen);
    engine.makeMove(pos, move);
  }
});

test("en passant is recorded only when an enemy pawn can take", () => {
  const quiet = engine.parseFen(START);
  const e2e4 = engine.generateMoves(quiet, false).find((move) => engine.moveToUci(move) === "e2e4");
  engine.makeMove(quiet, e2e4);
  assert.equal(quiet.epSq, -1);
  assert.equal(quiet.fullmove, 1);

  const ready = engine.parseFen(
    "rnbqkbnr/pp1ppppp/8/8/1p6/8/PPPPPPPP/RNBQKBNR w KQkq - 0 2",
  );
  const c2c4 = engine
    .generateMoves(ready, false)
    .find((move) => engine.moveToUci(move) === "c2c4");
  const undo = engine.makeMove(ready, c2c4);
  assert.equal(8 - (ready.epSq >> 3), 3);
  assert.equal(ready.epSq & 7, 2);
  assert.ok(engine.legalMoves(ready).some((move) => engine.moveToUci(move) === "b4c3"));
  engine.unmakeMove(ready, c2c4, undo);
  assert.equal(ready.epSq, -1);
  assert.equal(ready.fullmove, 2);
});

test("quiescence generation includes quiet promotions", () => {
  const pos = engine.parseFen("4k3/P7/8/8/8/8/8/4K3 w - - 0 1");
  const tactical = engine.generateMoves(pos, true).map((move) => engine.moveToUci(move));
  assert.deepEqual(tactical.sort(), ["a7a8b", "a7a8n", "a7a8q", "a7a8r"]);
});

test("captures are ordered by MVV-LVA", () => {
  const pos = engine.parseFen("k7/8/8/3q4/2p1P3/2Q5/8/K7 w - - 0 1");
  const captures = engine.generateMoves(pos, false).filter((move) => move.captured);
  engine.orderMoves(captures, 0, null, 0, pos);
  assert.equal(engine.moveToUci(captures[0]), "e4d5");
});

test("mate in one is checkmate and the trace stores numbers", () => {
  const fen = "6k1/8/6K1/8/3Q4/8/8/8 w - - 2 2";
  const result = engine.pickMove(fen, { timeLimitMs: 400, maxDepth: 3 });
  const chess = new Chess(fen);
  const played = chess.move({
    from: result.uci.slice(0, 2),
    to: result.uci.slice(2, 4),
  });
  assert.ok(played);
  assert.equal(chess.isCheckmate(), true);
  assert.equal(typeof result.trace.fullmove, "number");
  assert.equal(typeof result.trace.phase, "number");
  assert.ok(result.trace.selectedScore > 90000);
  const scored = result.trace.iterations.filter((iter) => typeof iter.score === "number");
  assert.ok(scored.length > 0);
  assert.ok(scored.some((iter) => iter.rootCandidates.length > 0));
});

test("terminal positions with no legal move print 0000", () => {
  for (const fen of [
    "k7/8/1Q6/8/8/8/8/7K b - - 0 1",
    "6k1/6Q1/6K1/8/8/8/8/8 b - - 2 2",
  ]) {
    const result = engine.pickMove(fen, { timeLimitMs: 40, maxDepth: 2 });
    assert.equal(result.uci, "0000", fen);
    assert.equal(result.move, null);
  }
});

test("the opening book returns e2e4 on the start position", () => {
  const result = engine.pickMove(START);
  assert.equal(result.uci, "e2e4");
  assert.equal(result.metrics.isBook, true);
  assert.equal(result.trace.selectedSource, "book");
  assert.equal(result.trace.fullmove, 1);
  assert.equal(result.trace.bookMove, "e2e4");
});

test("a later search is not stuck with the previous transposition table", () => {
  engine.pickMove("6k1/8/6K1/8/3Q4/8/8/8 w - - 2 2", {
    timeLimitMs: 200,
    maxDepth: 2,
  });
  const fen = "8/8/8/3k4/8/3K4/8/8 w - - 0 1";
  const result = engine.pickMove(fen, { timeLimitMs: 40, maxDepth: 2 });
  const legal = new Chess(fen)
    .moves({ verbose: true })
    .map((move) => move.from + move.to);
  assert.ok(legal.includes(result.uci), result.uci);
});

test("malformed FENs are rejected", () => {
  for (const fen of [
    "",
    "not a fen",
    "8/8/8/8/8/8/8/8 w - - 0 1",
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR x KQkq - 0 1",
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq e2 0 1",
    "rnbqkbnr/pppppppp/8/8/8/7/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  ]) {
    assert.throws(() => engine.parseFen(fen), fen);
  }
});

test("calibration postures and direct knob overrides", () => {
  const base = engine.RAZOR_X_5S_KNOBS;
  const balanced = engine.applyCalibration(base, {
    timePosture: "balanced",
    searchPosture: "balanced",
  });
  assert.equal(balanced.timeBase, base.timeBase);
  assert.equal(balanced.aspirationBase, base.aspirationBase);
  assert.notEqual(balanced.layerTemps, base.layerTemps);

  const fast = engine.applyCalibration(base, { timePosture: "fast" });
  assert.ok(fast.timeFloor < base.timeFloor);
  const long = engine.applyCalibration(base, { timePosture: "long" });
  assert.ok(long.timeFloor > base.timeFloor);
  const tactical = engine.applyCalibration(base, { searchPosture: "tactical" });
  assert.ok(tactical.aspirationBase < base.aspirationBase);
  const solid = engine.applyCalibration(base, { searchPosture: "solid" });
  assert.ok(solid.aspirationBase > base.aspirationBase);

  const overridden = engine.applyCalibration(base, {
    timePosture: "balanced",
    searchPosture: "balanced",
    aspirationBase: 99,
  });
  assert.equal(overridden.aspirationBase, 99);
  assert.throws(() => engine.applyCalibration(base, { timePosture: "reckless" }));
  assert.throws(() =>
    engine.applyCalibration(base, { layerTemps: [1, 2, 3] }),
  );

  const shipped = engine.loadKnobs(path.join(__dirname, ".."));
  assert.equal(shipped.timeBase, base.timeBase);
  assert.equal(shipped.timeFloor, base.timeFloor);
});

test("the command line reads a FEN and rejects garbage", () => {
  const script = path.join(__dirname, "..", "src", "engine.js");
  const book = spawnSync(process.execPath, [script], {
    input: `${START}\n`,
    encoding: "utf8",
  });
  assert.equal(book.status, 0, book.stderr);
  assert.equal(book.stdout.trim(), "e2e4");

  const empty = spawnSync(process.execPath, [script], {
    input: "\n",
    encoding: "utf8",
  });
  assert.equal(empty.status, 1);
  assert.match(empty.stderr, /Usage/);

  const bad = spawnSync(process.execPath, [script], {
    input: "nope\n",
    encoding: "utf8",
  });
  assert.equal(bad.status, 1);
  assert.equal(bad.stdout, "");
  assert.match(bad.stderr, /FEN/);
});
