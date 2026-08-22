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
if (registry.schema_version !== 1) errors.push(`registry schema_version 必须为 1，实际为 ${registry.schema_version}`);
const entries = Array.isArray(registry.skills) ? registry.skills : [];
if (entries.length !== 13) errors.push(`registry 必须恰好包含 13 个条目，实际为 ${entries.length}`);
const ids = entries.map(item => item && item.id).filter(Boolean);
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
  const dir = path.join(skillsRoot, item.id || '');
  const skillFile = path.join(dir, 'SKILL.md');
  if (!fs.existsSync(skillFile)) continue;
  const match = read(skillFile).match(/^name:\s*([^\r\n]+)/m);
  const frontmatterName = match && match[1].trim();
  if (path.basename(dir) !== item.id || frontmatterName !== item.id) {
    errors.push(`名称错配: registry=${item.id}, directory=${path.basename(dir)}, frontmatter=${frontmatterName || '(missing)'}`);
  }
  for (const dep of item.depends_on || []) if (!fs.existsSync(path.join(root, dep))) errors.push(`依赖不存在: ${item.id} -> ${dep}`);
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
for (const file of markdownFiles) {
  const content = read(file);
  for (const match of content.matchAll(/调用[^`\r\n]{0,80}`(movie-create-[a-z0-9-]+)`/g)) callTargets.push(match[1]);
}
for (const id of callTargets) if (!ids.includes(id)) errors.push(`调用目标未注册: ${id}`);
console.log(`注册表：${entries.length} 个条目；实际技能：${actual.length} 个`);
if (errors.length) { console.error(errors.map(error => `- ${error}`).join('\n')); process.exit(1); }
console.log('通过：名称、注册表覆盖、依赖和风格路由一致。');
