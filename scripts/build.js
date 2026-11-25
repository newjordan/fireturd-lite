"use strict";

const fs = require("fs");
const path = require("path");
const terser = require("terser");

async function main() {
  const root = path.join(__dirname, "..");
  const source = fs.readFileSync(path.join(root, "src/engine.js"), "utf8");
  const snippet = fs
    .readFileSync(path.join(root, "src/razor-knobs.snippet.js"), "utf8")
    .trimEnd();
  const result = await terser.minify(source, {
    compress: { passes: 2 },
    mangle: { reserved: ["RAZOR_X_5S_KNOBS"] },
    format: { comments: /@RAZOR_X_5S_KNOBS/ },
  });
  if (result.error) throw result.error;
  if (!result.code.includes("@RAZOR_X_5S_KNOBS_START"))
    throw new Error("minifier dropped the knob-block markers");
  // Terser also emits a compact copy of the object. Drop that copy so the
  // verbatim block below is the only declaration.
  const stripped = result.code.replace(/,RAZOR_X_5S_KNOBS=\{[^{}]*\};/, ";");
  const code = stripped.replace(
    /\/\/ @RAZOR_X_5S_KNOBS_START[\s\S]*?\/\/ @RAZOR_X_5S_KNOBS_END/,
    () => snippet,
  );
  if (!code.includes(snippet))
    throw new Error("failed to splice the verbatim knob block");
  const out = `#!/usr/bin/env node\n${code.endsWith("\n") ? code : `${code}\n`}`;
  const dest = path.join(root, "fighter.js");
  fs.writeFileSync(dest, out);
  fs.chmodSync(dest, 0o755);
  process.stdout.write(`wrote fighter.js (${Buffer.byteLength(out)} bytes)\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
