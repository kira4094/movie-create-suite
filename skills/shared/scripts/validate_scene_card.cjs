#!/usr/bin/env node
// validate_scene_card.cjs — 场景卡铁律机械校验
// 校验：硬性4段 / 风格内联(不写编号) / 二选一(精简6段或完整) / 本体状态分离 / 景别机位
// 用法：node validate_scene_card.cjs <场景卡.md> [1|2]
const fs = require('fs');
const file = process.argv[2];
const expectedMode = process.argv[3] || '2';
if (!file) { console.error('用法: node validate_scene_card.cjs <场景卡.md>'); process.exit(2); }
if (!/^[12]$/.test(expectedMode)) { console.error('FAIL 正文模式：expected mode 必须为 1 或 2'); process.exit(2); }
let s;
try { s = fs.readFileSync(file, 'utf8'); } catch (e) { console.error('无法读取:', e.message); process.exit(1); }

const issues = [];
const labels = ['参考图映射','一致性铁律','图片对齐','生成规格'];
const escaped = label => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const section = label => {
  const lines = s.split(/\r?\n/);
  const re = new RegExp(`^\\s*(?:#{1,6}\\s*)?(?:[①②③④⑤⑥⑦⑧⑨⑩]\\s*|\\d+[.)、]?\\s+)?${escaped(label)}(?:（强制）)?(?:\\s*[：:]\\s*(.*))?\\s*$`, 'i');
  const known = new RegExp(`^\\s*(?:#{1,6}\\s*)?(?:[①②③④⑤⑥⑦⑧⑨⑩]\\s*|\\d+[.)、]?\\s+)?(?:${labels.map(escaped).join('|')}|风格与美学设定|构图与空间关系|光影与曝光|材质细节|色彩系统|负面提示词|变化线|场景变化线|正文模式)(?:（强制）)?\\s*(?:[：:]|$)`, 'i');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (!m) continue;
    const body = [m[1] || ''];
    if (!m[1]) for (let j = i + 1; j < lines.length; j++) {
      if (/^\s*#{1,6}\s+/.test(lines[j]) || known.test(lines[j])) break;
      if (lines[j].trim()) body.push(lines[j].trim());
    }
    return body.join('\n').trim();
  }
  return '';
};
const rawBlock = label => {
  const lines = s.split(/\r?\n/);
  const re = new RegExp(`^\\s*(?:#{1,6}\\s*)?(?:[①②③④⑤⑥⑦⑧⑨⑩]\\s*|\\d+[.)、]?\\s+)?${escaped(label)}(?:（强制）)?(?:\\s*[：:]\\s*(.*))?\\s*$`, 'i');
  const start = lines.findIndex(line => re.test(line));
  if (start < 0) return '';
  const first = lines[start].match(re);
  if (first && first[1]) return lines[start];
  const out = [];
  for (let i = start; i < lines.length; i++) {
    if (i > start && /^\s*#{1,6}\s+/.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out.join('\n');
};
for (const label of labels) if (!section(label)) issues.push(`FAIL 硬四段：${label} 缺失或为空`);
const spec = section('生成规格');
if (!/(?:默认)?\s*4:3/.test(spec) && !/(?:(?:明确|目标比例|变体|竖屏|竖版|横屏|横版)[^\n]*(?:9:16|16:9)|(?:9:16|16:9)[^\n]*(?:明确|目标比例|变体|竖屏|竖版|横屏|横版))/.test(spec)) issues.push('FAIL 生成规格：默认需 4:3，其他比例须明确声明目标比例/变体');
const mapping = section('参考图映射');
const alignment = section('图片对齐');
const hardFour = [mapping, section('一致性铁律'), alignment, spec].join('\n');
const pictureTag = /<\s*Picture\s*\d+\s*>/i;
if (pictureTag.test(hardFour) || pictureTag.test(s)) issues.push('FAIL 参考图：Canonical 场景卡不得持久化 <Picture N>，请由平台适配层生成');
if (/(?:布局同上|继承内部空间蓝图|参考图中的空间|按照图片布局|参考内部(?:空间)?蓝图)/.test(s)) issues.push('FAIL 参考图：存在悬空空间依赖，必须把空间骨架写入构图与空间关系');
if (/\[@[^\]]*(?:布局蓝图|空间蓝图|scene-layout)[^\]]*\]/i.test(s)) issues.push('FAIL 参考图：Markdown 空间蓝图不是图片资产，禁止写成 [@资产]');
if (/\[@[^\]]+\]/.test(mapping) && !/(?:真实|图片|图像|\.png\b|\.jpe?g\b|\.webp\b|\.gif\b|\.avif\b)/i.test(mapping)) issues.push('FAIL 参考图：资产映射缺少真实图片文件名/可定位图片资产声明');
if (/\.(?:md|markdown)\b/i.test(mapping)) issues.push('FAIL 参考图：Markdown 文件不能作为图片资产引用');
const style = section('风格与美学设定') || section('风格');
if (style && !/(色彩|材质|光影|明度|质感)/.test(style)) issues.push('FAIL 风格：缺少内联色彩/材质/光影信息');
if (/正文模式\s*[:：]?\s*模式[12]|##\s*正文模式|【硬性|【正文\s*[·.]?\s*二选一】|〔模式\s*[12]/.test(s)) issues.push('FAIL 正文：最终场景卡不得包含模式或管线控制标签');
if (expectedMode === '2' && !section('光影与曝光')) issues.push('FAIL 正文：模式2缺少光影与曝光段');
if (expectedMode === '1' && (!section('构图与空间关系') || !section('光影与曝光'))) issues.push('FAIL 正文：模式1缺少构图或光影段');
if (labels.some(label => rawBlock(label).includes('光影与曝光')) || rawBlock('负面提示词').includes('光影与曝光')) issues.push('FAIL 正文：光影关键词位于错误区块');
const variationSection = section('变化线') || section('场景变化线');
if (variationSection) {
  const variation = variationSection;
  if (!variation.includes('本体保持')) issues.push('FAIL 变化线：必须直接声明本体保持');
  if (/继承基线|使用本卡正文|硬性\s*4\s*段|五段式正文/.test(variation)) issues.push('FAIL 变化线：不得包含过程引用或悬空依赖');
}
for (const line of s.split(/\r?\n/)) {
  if (/生成规格/.test(line) && !/^\s*(?:#{1,6}\s*)?生成规格(?:\s*[：:]|\s*$)/i.test(line)) issues.push('FAIL 字段位置：生成规格关键词位于错误区块');
}

if (issues.length === 0) console.log(`PASS: ${file}（硬性4段/风格内联/精简六段 全合格）`);
else { console.log(`FAIL: ${file}\n` + issues.join('\n')); process.exit(1); }
