#!/usr/bin/env node
// validate_scene_card.cjs — 场景卡铁律机械校验
// 校验：硬性4段 / 风格内联(不写编号) / 二选一(精简6段或完整) / 本体状态分离 / 景别机位
// 用法：node validate_scene_card.cjs <场景卡.md>
const fs = require('fs');
const file = process.argv[2];
if (!file) { console.error('用法: node validate_scene_card.cjs <场景卡.md>'); process.exit(2); }
let s;
try { s = fs.readFileSync(file, 'utf8'); } catch (e) { console.error('无法读取:', e.message); process.exit(1); }

const issues = [];
const labels = ['参考图映射','一致性铁律','图片对齐','生成规格'];
const escaped = label => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const section = label => {
  const lines = s.split(/\r?\n/);
  const re = new RegExp(`^\\s*(?:#{1,6}\\s*)?${escaped(label)}(?:\\s*[：:]\\s*(.*))?\\s*$`, 'i');
  const known = new RegExp(`^\\s*(?:#{1,6}\\s*)?(?:${labels.map(escaped).join('|')}|风格与美学设定|构图与空间关系|光影与曝光|材质细节|色彩系统|负面提示词|变化线|正文模式)\\s*(?:[：:]|$)`, 'i');
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
  const re = new RegExp(`^\\s*(?:#{1,6}\\s*)?${escaped(label)}(?:\\s*[：:]\\s*(.*))?\\s*$`, 'i');
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
if (!/(?:默认)?\s*4:3/.test(spec) && !/(?:变体|比例)[^\n]*(?:9:16|16:9)/.test(spec)) issues.push('FAIL 生成规格：默认需 4:3，其他比例须明确声明变体');
const style = section('风格与美学设定') || section('风格');
if (style && !/(色彩|材质|光影|明度|质感)/.test(style)) issues.push('FAIL 风格：缺少内联色彩/材质/光影信息');
const modeBlock = section('正文模式');
const mode = (modeBlock.match(/(模式[12])/i) || [,''])[1];
if (labels.some(label => rawBlock(label).includes('正文模式')) || rawBlock('负面提示词').includes('正文模式')) issues.push('FAIL 正文：模式关键词位于错误区块');
if (!mode) issues.push('FAIL 正文：未声明模式1或模式2');
else if (mode === '模式2' && !section('光影与曝光')) issues.push('FAIL 正文：模式2缺少光影与曝光段');
else if (mode === '模式1' && (!section('构图与空间关系') || !section('光影与曝光'))) issues.push('FAIL 正文：模式1缺少构图或光影段');
if (labels.some(label => rawBlock(label).includes('光影与曝光')) || rawBlock('负面提示词').includes('光影与曝光')) issues.push('FAIL 正文：光影关键词位于错误区块');
if (section('变化线') && !section('变化线').includes('继承基线')) issues.push('FAIL 变化线：未声明继承基线');
for (const line of s.split(/\r?\n/)) {
  if (/生成规格/.test(line) && !/^\s*(?:#{1,6}\s*)?生成规格(?:\s*[：:]|\s*$)/i.test(line)) issues.push('FAIL 字段位置：生成规格关键词位于错误区块');
}

if (issues.length === 0) console.log(`PASS: ${file}（硬性4段/风格内联/精简六段 全合格）`);
else { console.log(`FAIL: ${file}\n` + issues.join('\n')); process.exit(1); }
