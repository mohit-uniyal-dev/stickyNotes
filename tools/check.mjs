#!/usr/bin/env node
/**
 * Stick it - web notes — lightweight pre-flight checks (no build system required).
 *
 * Runs three checks and exits non-zero if any fail:
 *   1. `node --check` syntax check over every first-party script.
 *   2. manifest.json parses AND every file it references exists on disk.
 *   3. Static scan for stale strings left over from past fixes/moves.
 *
 * Usage:  node tools/check.mjs      (or)  npm run check
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Vendor/asset/doc dirs we never want to syntax-check or scan.
const SKIP_DIRS = new Set([
    "lib",
    "node_modules",
    ".git",
    "dist", // build output (zips + any extracted copies)
    "assets",
    "styles",
    "docs",
]);

let failures = 0;
const fail = (msg) => {
    console.error("  [FAIL] " + msg);
    failures++;
};
const pass = (msg) => console.log("  [ok]   " + msg);

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        const rel = relative(ROOT, full);
        const top = rel.split(/[\\/]/)[0];
        if (SKIP_DIRS.has(top)) continue;
        const st = statSync(full);
        if (st.isDirectory()) walk(full, out);
        else out.push(full);
    }
    return out;
}

const allFiles = walk(ROOT);
const rel = (f) => relative(ROOT, f).replace(/\\/g, "/");

/* 1) Syntax check ------------------------------------------------------- */
console.log("\n[1/3] Syntax check (node --check)");
const jsFiles = allFiles.filter(
    (f) => /\.(js|mjs)$/.test(f) && !/\.min\.js$/.test(f)
);
for (const f of jsFiles) {
    try {
        execFileSync(process.execPath, ["--check", f], { stdio: "pipe" });
        pass(rel(f));
    } catch (e) {
        fail(rel(f) + "\n" + (e.stderr?.toString().trim() || e.message));
    }
}

/* 2) Manifest parse + referenced-file existence ------------------------- */
console.log("\n[2/3] Manifest check");
let manifest = null;
try {
    manifest = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8"));
    pass("manifest.json parses");
} catch (e) {
    fail("manifest.json invalid JSON: " + e.message);
}

if (manifest) {
    const refs = [];
    if (manifest.background?.service_worker)
        refs.push(manifest.background.service_worker);
    for (const cs of manifest.content_scripts || [])
        refs.push(...(cs.js || []), ...(cs.css || []));
    if (manifest.action?.default_popup) refs.push(manifest.action.default_popup);
    if (manifest.action?.default_icon) refs.push(manifest.action.default_icon);
    for (const size of Object.keys(manifest.icons || {}))
        refs.push(manifest.icons[size]);
    for (const war of manifest.web_accessible_resources || [])
        for (const r of war.resources || [])
            if (!r.includes("*")) refs.push(r); // skip glob entries

    for (const r of [...new Set(refs)]) {
        const p = join(ROOT, r.replace(/^\//, ""));
        if (existsSync(p)) pass("exists: " + r);
        else fail("missing file referenced in manifest: " + r);
    }
}

/* 3) Stale-string scan -------------------------------------------------- */
console.log("\n[3/3] Stale-string scan");
const STALE = [
    { re: /\bretriveNoteData\b|\bretriveData\b/, msg: "retrive* misspelling — should be retrieveNoteData/retrieveData" },
    { re: /\bisSideBarVisiable\b/, msg: "isSideBarVisiable — should be isSideBarVisible" },
    { re: /\bloaclstorage\b/, msg: "loaclstorage typo — should be localstorage" },
    { re: /\btabListner\b|\bremoveTabListner\b/, msg: "tabListner/removeTabListner — files were renamed to tabListener/removeTabListener" },
    { re: /\bmessageActiveTab\b/, msg: "messageActiveTab — replaced by the shared sendMessageToTab helper" },
    { re: /id=["']pin["']/, msg: 'duplicate id="pin" — the popup pin control uses the .pin-btn class' },
];
// Exclude this tool from the scan (it contains the patterns as literals).
const scanFiles = allFiles.filter(
    (f) =>
        /\.(js|mjs|html)$/.test(f) &&
        !/\.min\.js$/.test(f) &&
        rel(f).split("/")[0] !== "tools"
);
let staleHits = 0;
for (const f of scanFiles) {
    const text = readFileSync(f, "utf8");
    for (const s of STALE) {
        if (s.re.test(text)) {
            fail(`${rel(f)}: ${s.msg}`);
            staleHits++;
        }
    }
}
if (staleHits === 0) pass("no stale strings found");

/* Summary --------------------------------------------------------------- */
console.log(
    `\n${failures ? "FAILED" : "PASSED"} — ${failures} problem(s), ${jsFiles.length} scripts checked\n`
);
process.exit(failures ? 1 : 0);
