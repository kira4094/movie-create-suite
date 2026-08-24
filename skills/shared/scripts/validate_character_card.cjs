#!/usr/bin/env node
// validate_character_card.cjs — 角色卡铁律机械校验
// 校验：四Part全量+顺序 / 背景纯色黑名单 / Part3六格 / 技能0 / 下区裁切
// 用法：node validate_character_card.cjs <角色卡.md> [--fix-print]
const fs = require('fs');
const file = process.argv[2];
if (!file) { console.error('用法: node validate_character_card.cjs <角色卡.md>'); process.exit(2); }
let s;
try { s = fs.readFileSync(file, 'utf8'); } catch (e) { console.error('无法读取:', e.message); process.exit(1); }

const issues = [];
const quickRequested = /执行档位：快速(?:（用户已确认）)?/.test(s);
const quick = /执行档位：快速（用户已确认）/.test(s);
const hasMode = /执行档位：(?:快速(?:（用户已确认）)?|标准|制作)/.test(s);
if (quickRequested && !quick) issues.push('FAIL 快速档位：缺少用户明确确认');
if (quickRequested && !/模式豁免：Part2、Part4/.test(s)) issues.push('FAIL 快速档位：缺少精确模式豁免标记');
const qualification = s.match(/^快速资格：(.+)$/m);
if (quickRequested && !qualification) issues.push('FAIL 快速档位：缺少快速资格明细');
if (quickRequested && qualification) {
  const q = qualification[1];
  const num = (label, max) => { const m = q.match(new RegExp(`${label}=(\\d+)秒?`)); if (!m || Number(m[1]) > max) issues.push(`FAIL 快速资格：${label}超限或缺失`); };
  num('时长', 30); num('主角', 2); num('场景', 2);
  if (!/(?:模型)=(?:Seedance|MiniMax H3)(?:；|$)/.test(q)) issues.push('FAIL 快速资格：模型未明确');
  if (!/(?:比例)=(?:4:3|9:16|16:9)(?:；|$)/.test(q)) issues.push('FAIL 快速资格：比例未明确');
  for (const label of ['素材绑定歧义','镜组歧义','忠实度未决','人性化未决','角色归属未决']) if (!new RegExp(`${label}=无(?:；|$)`).test(q)) issues.push(`FAIL 快速资格：${label}必须为无`);
}
if (!hasMode) issues.push('FAIL 执行档位：缺少标准/制作/快速标记');
const matches = [...s.matchAll(/^##\s+Part\s+(\d)\b[^\n]*\n([\s\S]*?)(?=^##\s+Part\s+\d\b|(?![\s\S]))/gmi)];
const parts = new Map(matches.map(m => [Number(m[1]), m[2]]));
const exempt = /已省略：Part\s*4（用户明确豁免）/.test(s);
const expected = quickRequested ? [1,3] : (exempt ? [1,2,3] : [1,2,3,4]);
if (matches.map(m => Number(m[1])).join(',') !== expected.join(',')) issues.push(`FAIL Part 顺序或数量：应为 ${expected.join('→')}`);
for (const n of expected) {
  const body = parts.get(n) || '';
  if (!body) { issues.push(`FAIL Part${n}：缺失`); continue; }
  if (!/技能0/.test(body)) issues.push(`FAIL Part${n}：缺少本 Part 的技能0`);
  if (!/一致性铁律/.test(body)) issues.push(`FAIL Part${n}：缺少本 Part 的一致性铁律`);
}
if (parts.has(2) && !/下区裁切/.test(parts.get(2))) issues.push('FAIL Part2：缺少下区裁切铁律');
if (parts.has(3) && !/(6\s*格|六格|2行\s*[×x*]\s*3列)/i.test(parts.get(3))) issues.push('FAIL Part3：缺少六格峰值表情布局');
const positive = s.split(/\r?\n/).filter(line => /背景/.test(line) && !/负面|禁止|反向|不要|不得/.test(line)).join('\n');
for (const word of ['森林','山水','城市','庭院','宫殿','场景背景']) if (positive.includes(word)) issues.push(`FAIL 背景正向段含场景词「${word}」`);
if (!/纯色/.test(positive)) issues.push('FAIL 背景正向段缺少纯色约束');

if (issues.length === 0) console.log(`PASS: ${file}（四Part/背景纯色/Part3六格/技能0 全合格）`);
else { console.log(`FAIL: ${file}\n` + issues.join('\n')); process.exit(1); }
