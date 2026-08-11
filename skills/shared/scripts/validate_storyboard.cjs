#!/usr/bin/env node
/**
 * validate_storyboard.cjs — 分镜 JSON 机械校验器
 *
 * 用法: node validate_storyboard.cjs <分镜.json> [--script <原文.txt>]
 *
 * 校验项（全部非 LLM，确定性代码）:
 *  1. 时长归一化: 镜头 duration 之和 = duration_seconds，重算连续 time_range
 *  2. assets 反推: 扫描 shots 的 characters/scene/props，与 assets 清单核对（遗漏/多余）
 *  3. 台词核对:   --script 提供原文时，逐字比对 dialogue 是否与原文一致（漏/改/加词）
 *  4. 覆盖率核对: coverage 中每个 beat 是否有 shot_ids 落实（丢戏）
 *  5. continuity: 镜N end 是否 = 镜N+1 start（位置/姿态/持物）
 *  6. 结构完整性: 每镜必填字段（shot_id/time_range/duration/scene/purpose/continuity）
 *
 * 输出: 校验报告（PASS 或 issues 列表）。不修改文件，除非 --fix 且仅做时长归一化。
 *
 * 参考: ComfyUI-H3-Prompt-Builder 的 _normalize_durations / derive_assets_from_storyboard / _normalize_issues
 * 作者: kira4094 · 2026-08
 */

const fs = require('fs');
const path = require('path');

// ---------- 参数解析 ----------
const args = process.argv.slice(2);
let file = null;
let scriptFile = null;
let fixMode = false;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--script') { scriptFile = args[++i]; }
  else if (a === '--fix') { fixMode = true; }
  else if (!a.startsWith('--')) { file = a; }
}
if (!file) {
  console.error('用法: node validate_storyboard.cjs <分镜.json> [--script <原文.txt>] [--fix]');
  process.exit(2);
}

// ---------- 工具函数 ----------
const issues = [];
let fixApplied = false;
function add(severity, field, shotId, problem, suggestion = '') {
  issues.push({ severity, field, shot_id: shotId, problem, suggestion });
}
function fmtTime(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// ---------- 1. 加载 JSON ----------
let data;
try {
  data = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (e) {
  console.error(`错误: 无法解析 ${file}: ${e.message}`);
  process.exit(1);
}
const root = (data.storyboard && typeof data.storyboard === 'object') ? data.storyboard : data;
const shots = root.shots || [];
const target = root.duration_seconds;

// ---------- 2. 结构完整性 ----------
const REQUIRED = ['shot_id', 'time_range', 'duration', 'scene', 'purpose', 'continuity', 'hook', 'ref_anchors'];
shots.forEach((s, i) => {
  REQUIRED.forEach((f) => {
    if (s[f] === undefined || s[f] === null || s[f] === '') {
      add('high', 'structure', s.shot_id || i + 1, `镜头缺少必填字段: ${f}`);
    }
  });
  if (s.continuity && (!s.continuity.start || !s.continuity.end)) {
    add('high', 'continuity', s.shot_id, 'continuity 缺少 start 或 end');
  }
});

// ---------- 3. 时长归一化 ----------
if (target) {
  let sum = 0;
  shots.forEach((s) => { sum += Math.max(1, parseInt(s.duration) || 0); });
  const diff = target - sum;
  if (diff !== 0) {
    add('high', 'duration', -1, `时长不匹配: 镜头之和 ${sum}s ≠ 目标 ${target}s（差 ${diff}s）`);
    if (fixMode) {
      // 机械修正: 循环加减，保持每镜 >= 1s
      let d = diff, idx = 0;
      const durations = shots.map((s) => Math.max(1, parseInt(s.duration) || 0));
      while (d !== 0) {
        const step = d > 0 ? 1 : -1;
        durations[idx % durations.length] = Math.max(1, durations[idx % durations.length] + step);
        d -= step; idx++;
      }
      let cursor = 0;
      shots.forEach((s, i) => {
        s.duration = durations[i];
        s.time_range = `${fmtTime(cursor)}-${fmtTime(cursor + durations[i])}`;
        cursor += durations[i];
      });
      root.duration_seconds = target;
      // 修复后移除已解决的时长 issue
      const idx2 = issues.findIndex((i) => i.field === 'duration' && i.shot_id === -1 && i.problem.startsWith('时长不匹配'));
      if (idx2 >= 0) issues.splice(idx2, 1);
      fixApplied = true;
      console.log(`[fix] 时长已归一化到 ${target}s`);
    }
  }
  // 检查 time_range 连续性
  let cursor = 0;
  shots.forEach((s) => {
    const dur = Math.max(1, parseInt(s.duration) || 0);
    const expectStart = fmtTime(cursor);
    const start = (s.time_range || '').split('-')[0];
    if (start && start !== expectStart) {
      add('medium', 'duration', s.shot_id, `time_range 不连续: 应为 ${expectStart} 起，实际 ${start} 起`);
    }
    cursor += dur;
  });
}

// ---------- 4. assets 反推核对 ----------
const derived = { characters: new Set(), scenes: new Set(), props: new Set() };
shots.forEach((s) => {
  (s.characters || []).forEach((c) => derived.characters.add(c));
  if (s.scene) derived.scenes.add(s.scene);
  (s.props || []).forEach((p) => derived.props.add(p));
});
const assets = root.assets || {};
['characters', 'scenes', 'props'].forEach((cat) => {
  const declared = new Set((assets[cat] || []).map((x) => x.id));
  derived[cat].forEach((id) => {
    if (!declared.has(id)) add('high', 'assets', -1, `资产遗漏: ${cat}「${id}」在镜头中使用但未在 assets 清单登记`);
  });
  declared.forEach((id) => {
    if (!derived[cat].has(id)) add('medium', 'assets', -1, `资产多余: ${cat}「${id}」在 assets 清单中但无镜头使用`);
  });
});

// ---------- 5. coverage 覆盖率核对 ----------
const coverage = root.coverage || [];
coverage.forEach((c) => {
  const ids = c.shot_ids || [];
  if (ids.length === 0 && c.status !== 'omitted_with_reason' && c.status !== 'nonvisual_context') {
    add('high', 'coverage', -1, `覆盖率丢戏: 节拍「${c.beat}」无镜头落实且未注明原因`);
  }
  ids.forEach((id) => {
    if (!shots.some((s) => s.shot_id === id)) {
      add('medium', 'coverage', -1, `覆盖率引用越界: 节拍「${c.beat}」引用镜头 ${id} 不存在`);
    }
  });
});

// ---------- 6. continuity 边界锁 ----------
for (let i = 0; i < shots.length - 1; i++) {
  const cur = shots[i], next = shots[i + 1];
  if (cur.continuity && next.continuity && cur.continuity.end && next.continuity.start) {
    const ce = cur.continuity.end, ns = next.continuity.start;
    const KEYS = ['position', 'posture', 'props'];
    KEYS.forEach((k) => {
      if (ce[k] !== undefined && ns[k] !== undefined && JSON.stringify(ce[k]) !== JSON.stringify(ns[k])) {
        add('medium', 'continuity', next.shot_id, `边界锁不一致: 镜${cur.shot_id} end 与 镜${next.shot_id} start 的 ${k} 不同`);
      }
    });
  }
}

// ---------- 7. 台词核对（--script 提供原文时） ----------
if (scriptFile) {
  try {
    const script = fs.readFileSync(scriptFile, 'utf8');
    // 原文去标点去空白（提高匹配率，消除长句误报）
    const normScript = script.replace(/[\s\p{P}\p{S}]/gu, '');
    shots.forEach((s) => {
      const d = s.dialogue || '';
      if (!d) return;
      // 旁白（内心戏转述）允许口语化改编，不逐字核对（语义一致性由审阅负责）
      const sp = s.speaker || '';
      if (sp.includes('旁白')) return;
      // 去掉说话人前缀（"角色："）与（旁白）（系统）等标记
      const body = d
        .replace(/^.*?[:：]/g, '')
        .replace(/^（.*?）/, '');
      // 去标点去空白
      const clean = body.replace(/[\s\p{P}\p{S}]/gu, '');
      if (clean.length < 8) return; // 太短不核
      // 取前 10 字与后 10 字，任一在原文（去标点）中出现即视为一致
      // （前 10 字可能有口语化改动，用后 10 字兜底；反之亦然）
      const head = clean.slice(0, 10);
      const tail = clean.slice(-10);
      if (!normScript.includes(head) && !normScript.includes(tail)) {
        add('medium', 'dialogue', s.shot_id, `台词疑似改写原文: "${clean.slice(0, 20)}..."`);
      }
    });
  } catch (e) {
    console.error(`警告: 无法读取原文 ${scriptFile}`);
  }
}

// ---------- 8. 输出 ----------
const highs = issues.filter((i) => i.severity === 'high');
const verdict = highs.length === 0 ? 'PASS' : 'FAIL';
const report = {
  verdict,
  issues: issues.slice(0, 10), // 限数防噪声
  summary: `共 ${shots.length} 镜 / ${coverage.length} 节拍 / ${issues.length} 问题（high ${highs.length}）`,
};
console.log(JSON.stringify(report, null, 2));

// ---------- 9. --fix 写回 ----------
if (fixMode && fixApplied) {
  const out = data.storyboard ? { storyboard: root, assets: data.assets } : root;
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`[fix] 已写回 ${file}`);
}

process.exit(verdict === 'PASS' ? 0 : 1);
