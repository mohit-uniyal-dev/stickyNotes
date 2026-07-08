#!/usr/bin/env node
/**
 * Stick it - web notes — build a Chrome Web Store upload zip.
 *
 * - Runs `tools/check.mjs` first; aborts if checks fail.
 * - Includes only runtime files (manifest at the zip root); excludes dev-only
 *   files (tools/, docs/, package.json, readme, dotfiles, dist/).
 * - Writes the ZIP with Node's built-in zlib (no external tools / deps), so the
 *   archive is spec-compliant: forward-slash paths + deflate compression, which
 *   Chrome / the Web Store require. (PowerShell's Compress-Archive writes
 *   backslash paths, and bsdtar's `-a` doesn't select the zip format.)
 * - Output: dist/sticky-notes-v<version>-<YYYYMMDD-HHmmss>.zip
 *
 * Usage:  node tools/zip.mjs      (or)  npm run zip
 */
import { execFileSync } from "node:child_process";
import {
    readdirSync,
    readFileSync,
    writeFileSync,
    mkdirSync,
    existsSync,
    statSync,
} from "node:fs";
import { deflateRawSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

// Top-level entries that must NEVER be shipped to the store.
const EXCLUDE = new Set([
    "tools",
    "docs",
    "node_modules",
    "dist",
    "package.json",
    "package-lock.json",
    "README.md",
    "PRIVACY.md",
    "RELEASE.md",
]);

/* 1) Never zip broken/unvalidated code --------------------------------- */
console.log("Running pre-flight checks...\n");
try {
    execFileSync(process.execPath, [join(HERE, "check.mjs")], {
        stdio: "inherit",
    });
} catch {
    console.error("\nChecks failed — aborting zip. Fix the issues above first.");
    process.exit(1);
}

/* 2) Decide what goes in ----------------------------------------------- */
const include = readdirSync(ROOT)
    .filter((name) => !name.startsWith(".")) // dotfiles (.git, .editorconfig, …)
    .filter((name) => !EXCLUDE.has(name))
    .filter((name) => !name.endsWith(".zip"))
    .sort();

if (!include.includes("manifest.json")) {
    console.error("manifest.json not found at project root — aborting.");
    process.exit(1);
}

// Expand include roots into a flat list of files with forward-slash names.
function collectFiles(entry, out = []) {
    const full = join(ROOT, entry);
    if (statSync(full).isDirectory()) {
        for (const name of readdirSync(full)) collectFiles(entry + "/" + name, out);
    } else {
        out.push(entry.split(/[\\/]/).join("/")); // normalize to forward slashes
    }
    return out;
}
const files = [];
for (const entry of include) collectFiles(entry, files);
files.sort();

/* 3) Timestamped output path ------------------------------------------- */
const manifest = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8"));
const version = manifest.version || "0.0.0";

const now = new Date();
const p = (n) => String(n).padStart(2, "0");
const stamp =
    `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}` +
    `-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;

const distDir = join(ROOT, "dist");
if (!existsSync(distDir)) mkdirSync(distDir);
const zipName = `sticky-notes-v${version}-${stamp}.zip`;
const zipPath = join(distDir, zipName);

/* 4) Minimal, spec-compliant ZIP writer (store/deflate) ---------------- */
const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
    }
    return t;
})();
function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}
function dosDateTime(d) {
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    return { time: time & 0xffff, date: date & 0xffff };
}

const { time: dosTime, date: dosDate } = dosDateTime(now);
const localParts = [];
const centralParts = [];
let offset = 0;

console.log("\nPackaging:");
for (const name of files) {
    const raw = readFileSync(join(ROOT, name));
    const nameBuf = Buffer.from(name, "utf8");
    const crc = crc32(raw);

    let method = 8;
    let data = deflateRawSync(raw);
    if (data.length >= raw.length) {
        method = 0; // store when deflate doesn't help (already-compressed files)
        data = raw;
    }

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, nameBuf, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuf);

    offset += local.length + nameBuf.length + data.length;
}

const centralDir = Buffer.concat(centralParts);
const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
eocd.writeUInt16LE(0, 4);
eocd.writeUInt16LE(0, 6);
eocd.writeUInt16LE(files.length, 8);
eocd.writeUInt16LE(files.length, 10);
eocd.writeUInt32LE(centralDir.length, 12);
eocd.writeUInt32LE(offset, 16);
eocd.writeUInt16LE(0, 20);

writeFileSync(zipPath, Buffer.concat([...localParts, centralDir, eocd]));

for (const name of include) console.log("  + " + name);
const sizeKb = (statSync(zipPath).size / 1024).toFixed(0);
console.log(
    `\nCreated ${relative(ROOT, zipPath).replace(/\\/g, "/")} ` +
        `(${files.length} files, ${sizeKb} KB)`
);
