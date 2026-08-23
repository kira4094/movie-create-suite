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
const has = re => new RegExp(re, 'm').test(s);
const count = re => (s.match(new RegExp(re, 'g')) || []).length;

// 铁律一：硬性 4 段
const hard4 = ['参考图映射','一致性铁律','图片对齐','生成规格'];
for (const h of hard4) if (!has(h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))) issues.push(`FAIL 铁律一: 缺「${h}」硬性段`);
if (!has('4:3') && !has('16:9') && !has('9:16')) issues.push('FAIL 铁律一: 生成规格缺比例（默认 4:3 横版，变体 16:9/9:16）');

// 铁律二：风格内联（不写编号）
// 风格段不应只写"B 风格库·XXX(编号)"，应内联母提示词（含色彩/材质）
if (has('风格：B 风格库') && !has('底色|色彩|材质')) issues.push('FAIL 铁律二: 风格段只写库编号，未内联母提示词（核心哲学+色彩+材质）');
if (has('风格库·') && !has('底色|色彩|材质')) issues.push('FAIL 铁律二: 风格段缺内联（应含色彩/材质描述）');

// 铁律三：二选一（精简6段含风格/景别/场景/氛围/光线/负面）
const hasStyle = has('风格');
const hasShot = has('景别|视角');
const hasScene = has('具体场景|场景');
const hasMood = has('氛围');
const hasLight = has('光线|光');
const hasNeg = has('负面');
const six = [hasStyle, hasShot, hasScene, hasMood, hasLight, hasNeg].filter(Boolean).length;
if (six < 6) issues.push(`FAIL 铁律三: 精简段不完整（含 ${six}/6：风格/景别视角/具体场景/氛围/光线/负面）`);

// 铁律四：本体状态分离（变化线未变段落写继承基线）
if (has('变化线') && !has('继承基线')) issues.push('FAIL 铁律四: 变化线未变段落应写「继承基线场景」');

// 铁律五：景别机位（相对语言，禁精确距离角度/米）
if (has('\\d+m|\\d+米|\\d+°|\\d+度')) issues.push('FAIL 铁律五: 机位用了精确距离角度（应平视/仰角/俯角相对语言）');

if (issues.length === 0) console.log(`PASS: ${file}（硬性4段/风格内联/精简六段 全合格）`);
else { console.log(`FAIL: ${file}\n` + issues.join('\n')); process.exit(1); }
