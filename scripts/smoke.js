"use strict";

const assert = require("assert");
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const engine = require("../fighter.js");

const root = path.join(__dirname, "..");
const snippet = fs
  .readFileSync(path.join(root, "src/razor-knobs.snippet.js"), "utf8")
  .trimEnd();
const built = fs.readFileSync(path.join(root, "fighter.js"), "utf8");
assert.ok(built.includes(snippet), "fighter.js is missing the verbatim knob block");

const start =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
assert.equal(engine.perft(engine.parseFen(start), 4), 197281);
assert.equal(engine.pickMove(start).uci, "e2e4");

const cli = spawnSync(process.execPath, [path.join(root, "fighter.js")], {
  input: `${start}\n`,
  encoding: "utf8",
});
assert.equal(cli.status, 0, cli.stderr);
assert.equal(cli.stdout.trim(), "e2e4");

const invalid = spawnSync(process.execPath, [path.join(root, "fighter.js")], {
  input: "not-a-fen\n",
  encoding: "utf8",
});
assert.equal(invalid.status, 1);
assert.equal(invalid.stdout, "");

process.stdout.write("smoke ok\n");
