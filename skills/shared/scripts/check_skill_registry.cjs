#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..');
const skillsRoot = path.join(root, 'skills');
const registryPath = path.join(skillsRoot, 'shared', 'skill-registry.json');
const entryPath = path.join(skillsRoot, 'movie-create-entry', 'SKILL.md');
const errors = [];
const read = file => fs.readFileSync(file, 'utf8');

let registry;
try { registry = JSON.parse(read(registryPath)); } catch (error) {
  console.error(`无法读取 registry: ${error.message}`); process.exit(1);
}
const registryObject = registry && typeof registry === 'object' && !Array.isArray(registry);
if (!registryObject) errors.push('registry 顶层必须是对象');
if (registryObject && registry.schema_version !== 1) errors.push(`registry schema_version 必须为 1，实际为 ${registry.schema_version}`);
const entries = registryObject && Array.isArray(registry.skills) ? registry.skills : [];
if (entries.length !== 13) errors.push(`registry 必须恰好包含 13 个条目，实际为 ${entries.length}`);
const isStringArray = value => Array.isArray(value) && value.every(item => typeof item === 'string');
const ids = [];
for (const [index, item] of entries.entries()) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    errors.push(`registry 条目 ${index + 1} 必须是对象`);
    continue;
  }
  for (const field of ['id', 'layer', 'purpose']) {
    if (typeof item[field] !== 'string' || item[field].trim() === '') errors.push(`registry 条目 ${index + 1} 的 ${field} 必须是非空字符串`);
  }
  for (const field of ['inputs', 'outputs', 'depends_on', 'planned_dependencies']) {
    if (!isStringArray(item[field])) errors.push(`registry 条目 ${index + 1} 的 ${field} 必须是字符串数组`);
  }
  if (typeof item.id === 'string' && item.id.trim()) ids.push(item.id);
}
const actual = fs.readdirSync(skillsRoot, { withFileTypes: true })
  .filter(item => item.isDirectory() && item.name !== 'shared' && fs.existsSync(path.join(skillsRoot, item.name, 'SKILL.md')))
  .map(item => item.name).sort();
const registered = [...ids].sort();
const missing = actual.filter(id => !ids.includes(id));
const extra = ids.filter(id => !actual.includes(id));
if (missing.length) errors.push(`缺少 registry 条目: ${missing.join(', ')}`);
if (extra.length) errors.push(`registry 多余条目: ${extra.join(', ')}`);
if (new Set(ids).size !== ids.length) errors.push('registry 存在重复 ID');
for (const item of entries) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
  const dir = path.join(skillsRoot, item.id || '');
  const skillFile = path.join(dir, 'SKILL.md');
  if (!fs.existsSync(skillFile)) continue;
  const match = read(skillFile).match(/^name:\s*([^\r\n]+)/m);
  const frontmatterName = match && match[1].trim();
  if (path.basename(dir) !== item.id || frontmatterName !== item.id) {
    errors.push(`名称错配: registry=${item.id}, directory=${path.basename(dir)}, frontmatter=${frontmatterName || '(missing)'}`);
  }
  for (const dep of item.depends_on || []) if (!fs.existsSync(path.join(root, dep))) errors.push(`依赖不存在: ${item.id} -> ${dep}`);
  for (const dep of item.planned_dependencies || []) if (fs.existsSync(path.join(root, dep))) errors.push(`计划依赖已存在，必须移入 depends_on: ${item.id} -> ${dep}`);
}
const entry = read(entryPath);
const routeLines = route => entry.split(/\r?\n/).filter(line => line.includes(route));
const routeA = routeLines('路径A');
const routeB = routeLines('路径B');
if (!routeA.some(line => line.includes('movie-create-design-style'))) errors.push('入口路径 A 必须调用 movie-create-design-style');
if (routeA.some(line => line.includes('movie-create-design-preset'))) errors.push('入口路径 A 不得调用 movie-create-design-preset');
if (!routeB.some(line => line.includes('movie-create-design-preset'))) errors.push('入口路径 B 必须调用 movie-create-design-preset');
if (routeB.some(line => line.includes('movie-create-design-style'))) errors.push('入口路径 B 不得调用 movie-create-design-style');
if (/路径C[\s\S]{0,180}调用\s+`?movie-create-(design-style|design-preset)/.test(entry)) errors.push('入口路径 C 不得伪装成 A/B 调用');
const markdownFiles = [];
const collectMarkdown = dir => {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) collectMarkdown(file);
    else if (item.isFile() && item.name.endsWith('.md')) markdownFiles.push(file);
  }
};
collectMarkdown(skillsRoot);
const callTargets = [];
const historicalNames = ['movie-style', 'movie-script-review', 'movie-script', 'movie-character-card', 'movie-scene-card', 'movie-emotion-timeline', 'movie-dialogue-table', 'movie-emotional-director'];
for (const file of markdownFiles) {
  const content = read(file);
  for (const line of content.split(/\r?\n/)) {
    for (const match of line.matchAll(/(?:调用|调|运行|先跑|交给)[^`\r\n]{0,100}(?:`(movie-create-[a-z0-9-]+)`|\*\*(movie-create-[a-z0-9-]+)\*\*|(movie-create-[a-z0-9-]+))/g)) {
      callTargets.push(match[1] || match[2] || match[3]);
    }
    for (const legacy of historicalNames) {
      if (line.includes(legacy) && !line.includes('历史概念名（非可调用 Skill）')) errors.push(`发现未标注历史名称: ${legacy}`);
    }
  }
}
for (const id of callTargets) if (!ids.includes(id)) errors.push(`调用目标未注册: ${id}`);

// 产出型质量校验（2026-08-23）：角色卡/场景卡铁律机械校验
// 扫描 character/scene skill 目录下的实际产出卡（若存在），用 validate_* 脚本校验
// 即使无产出卡，只要 skill 存在即校验脚本应存在
const { execSync } = require('child_process');
const validatorScripts = {
  'movie-create-design-character': 'validate_character_card.cjs',
  'movie-create-design-scene': 'validate_scene_card.cjs',
};
for (const [skillDir, validator] of Object.entries(validatorScripts)) {
  const scriptPath = path.join(skillsRoot, 'shared', 'scripts', validator);
  if (!fs.existsSync(scriptPath)) { errors.push(`缺校验脚本: ${validator}`); continue; }
  const cardDir = path.join(skillsRoot, skillDir);
  // 场景卡在 references/ 下的示例不算产出；产出卡在项目测试目录，这里仅验证校验脚本可运行
  try { execSync('node --check ' + JSON.stringify(scriptPath), { stdio: 'pipe' }); }
  catch (syntaxError) { errors.push(`${validator} 语法错误：${syntaxError.stderr || syntaxError.message}`); }
}

console.log(`注册表：${entries.length} 个条目；实际技能：${actual.length} 个`);
if (errors.length) { console.error(errors.map(error => `- ${error}`).join('\n')); process.exit(1); }
console.log('通过：名称、注册表覆盖、依赖、风格路由和产出型校验脚本一致。');
