#!/usr/bin/env node
/**
 * Semantic versioning from git commits + tags.
 *
 * Walks every commit from oldest to newest:
 *   - Encounter vX.Y.Z tag → version resets to that tag
 *   - Otherwise parse label (冒号前) → cumulative bump
 *
 * 优先级: breaking > feat/add > fix/other
 *   breaking: → major +1
 *   feat/add: → minor +1
 *   fix / 其他 → patch +1
 *   docs:/chore:/cleanup:/refactor:/style:/test:/perf: → 跳过
 *
 * git tag 作为真相锚点，version.json 只消费不参与计算。
 *
 * 用法:
 *   node update-version.cjs                   # 当前目录
 *   node update-version.cjs ../path           # 指定项目
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(process.argv[2] || ".");
const VERSION_FILE = path.join(ROOT, "version.json");

const SKIP_LABELS = new Set(["docs", "chore", "cleanup", "refactor", "style", "test", "perf", "build", "ci"]);

function exec(cmd) {
  try { return execSync(cmd, { cwd: ROOT, encoding: "utf8", timeout: 10000 }).trim(); } catch { return ""; }
}

// 1. 确保 tag 最新 — 所有 agent 看到同一棵树。
// 不使用 2>/dev/null，避免 Windows 将 /dev/null 解释为无效路径。
try {
  execSync("git fetch --tags --force", {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 10000,
    stdio: "ignore",
  });
} catch { /* 离线时继续使用本地 tag */ }

// 2. 行走全部 commit，从最老到最新
let major = 0, minor = 0, patch = 0;
const log = exec('git log --reverse --format="%H %D|%s"');
const currentSha = exec("git rev-parse HEAD");

if (log) {
  for (const line of log.split("\n").filter(Boolean)) {
    const barIdx = line.indexOf("|");
    const meta = line.slice(0, barIdx);
    const msg = line.slice(barIdx + 1);
    const hash = meta.split(/\s+/)[0];
    const refs = meta.slice(hash.length).trim();

    // 命中 tag → 重置版本号
    const tagMatch = refs.match(/tag:\s*(v?\d+\.\d+\.\d+)/);
    if (tagMatch) {
      const [tm, tn, tp] = tagMatch[1].replace(/^v/, "").split(".").map(Number);
      major = tm; minor = tn; patch = tp;
      continue;
    }

    // 标签解析 → 累积 bump
    const colonIdx = msg.indexOf(":");
    const label = colonIdx === -1 ? "" : msg.slice(0, colonIdx).toLowerCase().trim();
    if (SKIP_LABELS.has(label)) continue;

    if (label === "breaking") { major++; minor = 0; patch = 0; }
    else if (label === "feat" || label === "add") { minor++; patch = 0; }
    else { patch++; }
  }
}

// 3. 输出
const build = exec("git log -1 --format=%cd --date=format:%Y%m%d.%H%M") || "00000000.0000";
const ver = `${major}.${minor}.${patch}`;
const full = `v${ver}(${build})`;
// Codex 要求严格 SemVer；用 build metadata 继承同一份提交时间戳。
const codexFull = `${ver}+${build}`;

const data = { version: ver, build, full, sha: currentSha };
fs.writeFileSync(VERSION_FILE, JSON.stringify(data, null, 2) + "\n");

// 4. 同步 plugin.json / version.json（如果有）
const syncPaths = [
  { path: path.join(ROOT, ".claude-plugin", "plugin.json"), pluginVersion: full },
  { path: path.join(ROOT, "plugin", ".claude-plugin", "plugin.json"), pluginVersion: full },
  { path: path.join(ROOT, ".codex-plugin", "plugin.json"), pluginVersion: codexFull },
  { path: path.join(ROOT, "plugin", ".codex-plugin", "plugin.json"), pluginVersion: codexFull },
  { path: path.join(ROOT, "plugin", "version.json"), pluginVersion: ver },
];
for (const { path: p, pluginVersion } of syncPaths) {
  try {
    const raw = fs.readFileSync(p, "utf8");
    const obj = JSON.parse(raw);
    if (obj.version) {
      // version.json 格式（有 full/build/sha）→ 全字段更新
      if ("full" in obj) {
        obj.version = ver;
        obj.build = build;
        obj.full = full;
        obj.sha = currentSha;
      } else {
        // plugin.json 格式 → 只有 version 字段
        obj.version = pluginVersion;
      }
      fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
      console.log(`[sync] ${path.relative(ROOT, p)} → ${obj.version}`);
    }
  } catch { /* file not found or invalid JSON — skip silently */ }
}

console.log(`[version] ${full}`);
console.log(`[codex-version] ${codexFull}`);
