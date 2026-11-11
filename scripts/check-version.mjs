#!/usr/bin/env node
// Checks that every file carrying the app version agrees with package.json,
// the single source of truth (src-tauri/tauri.conf.json reads it directly).
//
// Usage:
//   node scripts/check-version.mjs               check the files below
//   node scripts/check-version.mjs --tag v1.2.3  also check a release tag
//
// Checked: package.json, package-lock.json, src-tauri/Cargo.toml,
// src-tauri/Cargo.lock and the "version" field of src-tauri/tauri.conf.json.
// Prints every mismatch and exits with status 1 if anything is out of sync.
// No dependencies, so CI can run it without `npm ci`.

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

// Releases use plain X.Y.Z: the Windows MSI bundler rejects pre-release suffixes.
const PLAIN_SEMVER = /^\d+\.\d+\.\d+$/;

const repoRoot = new URL("../", import.meta.url);
const readText = (path) => readFileSync(new URL(path, repoRoot), "utf8");
const readJson = (path) => JSON.parse(readText(path));

const { values: options } = parseArgs({ options: { tag: { type: "string" } } });

const version = readJson("package.json").version;
const errors = [];

if (!PLAIN_SEMVER.test(version)) {
  errors.push(`package.json version "${version}" must be plain X.Y.Z, for example 1.2.3.`);
}

const npmLock = readJson("package-lock.json");
expectVersion(
  "package-lock.json",
  npmLock.packages?.[""]?.version ?? npmLock.version,
  "run `npm install --package-lock-only`",
);

const cargoToml = parseCargoPackage(readText("src-tauri/Cargo.toml"));
expectVersion("src-tauri/Cargo.toml", cargoToml.version, "edit [package] version");

const cargoLockVersion = findCargoLockVersion(readText("src-tauri/Cargo.lock"), cargoToml.name);
expectVersion(
  "src-tauri/Cargo.lock",
  cargoLockVersion,
  "run `cargo update --workspace` in src-tauri",
);

const tauriVersion = readJson("src-tauri/tauri.conf.json").version;
if (tauriVersion !== "../package.json" && tauriVersion !== version) {
  errors.push(
    `src-tauri/tauri.conf.json has version "${tauriVersion}": set it to "../package.json".`,
  );
}

if (options.tag !== undefined && options.tag !== `v${version}`) {
  errors.push(
    `Tag "${options.tag}" does not match package.json version ${version}: expected tag "v${version}".`,
  );
}

if (errors.length > 0) {
  // The ::error:: prefix turns each line into an annotation on GitHub Actions.
  const prefix = process.env.GITHUB_ACTIONS === "true" ? "::error::" : "error: ";
  for (const message of errors) console.error(prefix + message);
  process.exit(1);
}

const tagNote = options.tag === undefined ? "" : ` and tag ${options.tag}`;
console.log(`Version ${version} is consistent across all files${tagNote}.`);

function expectVersion(file, actual, fix) {
  if (actual !== version) {
    errors.push(`${file} has version ${actual ?? "(missing)"}, expected ${version}: ${fix}.`);
  }
}

// Reads `name` and `version` from the [package] table of a Cargo.toml.
function parseCargoPackage(toml) {
  const result = {};
  let table = "";
  for (const line of toml.split(/\r?\n/)) {
    const header = /^\s*\[([^\]]+)\]/.exec(line);
    if (header) {
      table = header[1].trim();
      continue;
    }
    const field = /^\s*(name|version)\s*=\s*"([^"]*)"/.exec(line);
    if (table === "package" && field) result[field[1]] = field[2];
  }
  return result;
}

// Finds the version recorded for one package in Cargo.lock.
function findCargoLockVersion(lock, packageName) {
  for (const entry of lock.split("[[package]]")) {
    const name = /^name = "([^"]+)"/m.exec(entry)?.[1];
    if (name === packageName) return /^version = "([^"]+)"/m.exec(entry)?.[1];
  }
  return undefined;
}
