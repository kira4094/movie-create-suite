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
const has = re => new RegExp(re, 'm').test(s);
const count = re => (s.match(new RegExp(re, 'g')) || []).length;

// 铁律一：四 Part 全量 + 顺序
const parts = [...s.matchAll(/^## Part (\d)/gm)].map(m => parseInt(m[1]));
const expectedOrder = [1,2,3,4];
if (parts.length !== 4) issues.push(`FAIL 铁律一: Part 数=${parts.length}，应为 4（当前 ${parts.join(',')}）`);
else if (parts.join(',') !== expectedOrder.join(',')) issues.push(`FAIL 铁律一: Part 顺序=${parts.join('→')}，应为 1→2→3→4`);

// 铁律二：技能0 强制首段（每个 Part 应有）
const skill0 = count('技能0');
if (skill0 < 4) issues.push(`FAIL 铁律二: 技能0 仅 ${skill0} 处，应每 Part 至少 1 处（共≥4）`);
// 下区裁切（Part2）
if (!has('下区裁切')) issues.push('FAIL 铁律二: Part2 缺「下区裁切」铁律（需从颈部横切禁头部）');

// 铁律三：背景纯色黑名单（禁场景/山水）
const bgBlacklist = ['青绿山水','花果山','森林','山水','背景虚化','场景背景','城市','庭院','宫殿'];
for (const w of bgBlacklist) {
  const n = count(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (n > 0) issues.push(`FAIL 铁律三: 背景含场景词「${w}」×${n}（背景必须纯色哑光灰/白）`);
}
if (!has('纯色瞎光|纯色哑光|纯色背景')) {
  // 宽松：至少有纯色
  if (!has('纯色')) issues.push('FAIL 铁律三: 未找到「纯色」背景约束');
}

// Part3 六格
if (!has('6 格') && !has('六格') && !has('2行×3列')) issues.push('FAIL Part3: 缺「6 格/2行×3列」布局');

// 一致性铁律
if (!has('一致性铁律')) issues.push('FAIL 铁律四: 缺「一致性铁律（强制）」');

if (issues.length === 0) console.log(`PASS: ${file}（四Part/背景纯色/Part3六格/技能0 全合格）`);
else { console.log(`FAIL: ${file}\n` + issues.join('\n')); process.exit(1); }
