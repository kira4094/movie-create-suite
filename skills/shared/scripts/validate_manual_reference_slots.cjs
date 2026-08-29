#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const file = process.argv[2];
const storyboardFile = process.argv[3];
if (!file) { console.error('用法: node validate_manual_reference_slots.cjs <03-or-04-file> [storyboard.json]'); process.exit(2); }
let text;
try { text = fs.readFileSync(file, 'utf8'); } catch (e) { console.error(`手动槽位 FAIL：文件无法读取：${e.message}`); process.exit(1); }
const errors = [];
if (/(?<![A-Za-z0-9_])(?:prompt_only|verified|bound)(?![A-Za-z0-9_])|\.movie-create|reference-assets\.json|video-config\.json|<Picture\s*\d+>|<图片\s*\d+>|<Video\s*\d+>|<视频\s*\d+>|<Audio\s*\d+>|<音频\s*\d+>/.test(text)) errors.push('手动槽位文档不得泄漏内部状态、账本/config 文件或平台标签');
const headingRe = /^#{1,6}\s*参考资产映射\s*$/gm;
const headings = [...text.matchAll(headingRe)];
if (headings.length !== 1) errors.push('参考资产映射标题必须恰好出现一次');
const lines = text.split(/\r?\n/);
const mappings = [];
const mappingRe = /^-\s+([^=\r\n]+?)\s*=\s*\[([^\]\r\n]+)\]\s*$/;
let blockStart = -1, blockEnd = lines.length;
if (headings.length === 1) {
  blockStart = text.slice(0, headings[0].index).split(/\r?\n/).length - 1;
  for (let i = blockStart + 1; i < lines.length; i++) {
    if (/^#{1,6}\s+/.test(lines[i])) { blockEnd = i; break; }
  }
}
for (let i = blockStart + 1; i < blockEnd; i++) {
  const line = lines[i];
  if (line.trimStart().startsWith('-')) {
    const m = line.match(mappingRe);
    if (!m) errors.push(`映射块内项目格式非法：${line.trim()}`);
    else mappings.push({name:m[1].trim(), slot:m[2].trim()});
  }
}
if (!mappings.length) errors.push('必须至少有一行严格格式的映射：- 语义名称 = [图片槽位]');
const names = new Set(), slots = new Set();
for (const m of mappings) {
  if (names.has(m.name)) errors.push(`语义名称重复：${m.name}`); names.add(m.name);
  if (slots.has(m.slot)) errors.push(`图片槽位重复：${m.slot}`); slots.add(m.slot);
  if (/\.md|scene-layout|空间蓝图|ASCII|提示词|<Picture|<图片|<视频|<音频/.test(m.slot)) errors.push(`槽位不得包含 Markdown、蓝图、ASCII、提示词或平台标签：${m.slot}`);
  const occurrences = (text.match(new RegExp(`\\[${escapeRegExp(m.slot)}\\]`, 'g')) || []).length;
  if (occurrences !== 1) errors.push(`图片槽位必须只在映射块出现一次：${m.slot}`);
}
if (storyboardFile) {
  let sb;
  try { sb = JSON.parse(fs.readFileSync(storyboardFile, 'utf8')); } catch (e) { errors.push(`storyboard.json 无法读取：${e.message}`); sb = null; }
  const covered = names;
  const shots = sb && Array.isArray(sb.shots) ? sb.shots : sb && sb.storyboard && Array.isArray(sb.storyboard.shots) ? sb.storyboard.shots : null;
  if (!shots) errors.push('storyboard.json 必须包含根级 shots 数组或 storyboard.shots 数组');
  for (const shot of (shots || [])) {
    for (const name of (Array.isArray(shot.characters) ? shot.characters : [])) if (name && !covered.has(name)) errors.push(`缺少角色映射：${name}`);
    const scene = Array.isArray(shot.scene) ? shot.scene : [shot.scene];
    for (const name of scene) if (name && !covered.has(name)) errors.push(`缺少场景映射：${name}`);
  }
  if (shots) validateProjectCards(path.dirname(file), shots, names);
}
function normalize(value) { return String(value).normalize('NFKC').trim().toLocaleLowerCase(); }
function validateProjectCards(projectRoot, shots, mappedNames) {
  const roleDir = path.join(projectRoot, '01-角色提示词');
  const sceneDir = path.join(projectRoot, '02-场景提示词');
  // 纯合同 fixture 可不携带项目卡目录；存在任一目录时才启用精确卡解析。
  if (!fs.existsSync(roleDir) && !fs.existsSync(sceneDir)) return;
  const expected = [], seen = new Set();
  for (const shot of shots) {
    for (const name of (Array.isArray(shot.characters) ? shot.characters : [])) add(name, '角色');
    const scene = Array.isArray(shot.scene) ? shot.scene : [shot.scene];
    for (const name of scene) add(name, '场景');
  }
  function add(name, type) {
    if (!name) return;
    const key = `${type}:${normalize(name)}`;
    if (!seen.has(key)) { seen.add(key); expected.push({ name: String(name), type }); }
  }
  const byName = new Map();
  for (const item of expected) {
    const key = normalize(item.name);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(item.type);
  }
  for (const [name, types] of byName) if (new Set(types).size > 1) errors.push(`角色/场景同名冲突：${name}`);
  const actual = [...mappings].map(m => normalize(m.name));
  const want = expected.map(x => normalize(x.name));
  if (actual.length !== want.length || actual.some((v, i) => v !== want[i])) errors.push(`映射顺序或集合不符合 storyboard：应为 ${expected.map(x => x.name).join(' → ') || '空'}`);
  for (const name of mappedNames) if (!want.includes(normalize(name))) errors.push(`存在 storyboard 未要求的孤儿映射：${name}`);
  for (const item of expected) {
    const dir = item.type === '角色' ? roleDir : sceneDir;
    let files = [];
    try { files = fs.readdirSync(dir).filter(n => path.extname(n).toLowerCase() === '.md'); } catch { files = []; }
    const candidates = files.filter(n => normalize(path.basename(n, '.md')) === normalize(item.name));
    if (candidates.length === 0) errors.push(`缺少${item.type}卡：${item.name}`);
    if (candidates.length > 1) errors.push(`${item.type}卡规范化后存在多个候选：${item.name}`);
    if (candidates.length === 1 && path.basename(candidates[0], '.md') !== item.name) errors.push(`${item.type}卡文件名必须与 storyboard 名称精确一致：${item.name}`);
  }
}
function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
if (errors.length) { console.error(`手动槽位 FAIL\n${errors.map(e => `- ${e}`).join('\n')}`); process.exit(1); }
console.log(`手动槽位 PASS：${mappings.length} 个映射，槽位各出现一次`);
