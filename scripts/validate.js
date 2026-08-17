"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

if (manifest.manifest_version !== 3) {
  throw new Error("manifest.json must use Manifest V3.");
}

const scriptFiles = [
  "src/guard-logic.js",
  "src/content.js",
  "options/options.js",
  "tests/guard-logic.test.js",
  "scripts/validate.js"
];

for (const relativePath of scriptFiles) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  new vm.Script(source, { filename: relativePath });
}

const referencedFiles = [
  manifest.options_ui.page,
  ...manifest.content_scripts.flatMap((entry) => entry.js),
  ...Object.values(manifest.icons)
];

for (const relativePath of referencedFiles) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    throw new Error(`Manifest references missing file: ${relativePath}`);
  }
}

console.log(`Validated Manifest V${manifest.manifest_version}, ${scriptFiles.length} JavaScript files, and ${referencedFiles.length} referenced files.`);
