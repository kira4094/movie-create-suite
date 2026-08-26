const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '../..');
const collectMarkdown = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const full = path.join(directory, entry.name);
  if (entry.isDirectory()) return collectMarkdown(full);
  return entry.isFile() && entry.name.endsWith('.md') ? [path.relative(root, full)] : [];
});
const sources = collectMarkdown(path.join(root, 'skills'));

const ignored = raw => /^(?:https?:|file:|D:[\\/]|[A-Za-z]:[\\/])/.test(raw)
  || raw.includes('.movie-create')
  || raw.includes('01-角色提示词') || raw.includes('02-场景提示词')
  || raw.includes('03-分镜提示词') || raw.includes('04-视频提示词');
const clean = raw => raw.replace(/[`<>()\[\]，。；：！？（）【】》“”‘’「」]+$/g, '').replace(/^['"]|['"]$/g, '');
const pattern = /(?:\.\.?\/|shared\/|references\/)[^\s`<>()[\]"'、，。；：！？（）【】《》“”‘’「」]+/g;
const failures = [];
let references = 0;
const resolveAndCheck = (relative, raw, line, record = true) => {
  const source = path.join(root, relative);
  const dynamic = raw.indexOf('{');
  const pathForCheck = dynamic >= 0 ? raw.slice(0, dynamic) : raw;
  const resolved = path.resolve(path.dirname(source), pathForCheck);
  const ok = fs.existsSync(resolved);
  console.log(`${relative}:${line} raw=${raw} resolved=${path.relative(root, resolved)} ${ok ? 'PASS' : (record ? 'FAIL' : 'EXPECTED_FAIL')}`);
  if (!ok && record) failures.push(`${relative}:${line}: ${raw} -> ${resolved}`);
  return ok;
};
// Synthetic regression proof: the same resolver must reject a legacy/broken local reference.
const syntheticRaw = 'shared/__missing_legacy_resource__.md';
const syntheticResolved = path.resolve(path.dirname(path.join(root, sources[0])), syntheticRaw);
assert(!fs.existsSync(syntheticResolved), 'synthetic broken-path target must be absent');
const beforeSyntheticFailures = failures.length;
assert(!resolveAndCheck(sources[0], syntheticRaw, 0, false), 'synthetic broken path is captured as a failure');
assert(failures.length === beforeSyntheticFailures, 'synthetic self-check is not counted as a formal failure');
console.log(`synthetic self-check PASS：旧坏路径会被捕获（raw=${syntheticRaw}）`);
const sampleStyle = path.join(root, 'skills/shared/风格定义库/001_cyberpunk.md');
assert(fs.existsSync(sampleStyle), 'dynamic style path family reaches real sample 001_cyberpunk.md');
console.log('dynamic style path family PASS：skills/shared/风格定义库/001_cyberpunk.md');
for (const relative of sources) {
  const source = path.join(root, relative);
  const lines = fs.readFileSync(source, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const match of line.matchAll(pattern)) {
      const raw = clean(match[0]);
      if (ignored(raw)) continue;
      references += 1;
      resolveAndCheck(relative, raw, index + 1);
    }
  });
}
if (references === 0) failures.push('未发现可解析的本地资源引用');
if (failures.length) {
  console.error(`本地资源路径检查 FAIL（${failures.length}）`);
  failures.forEach(item => console.error(item));
  process.exit(1);
}
console.log(`本地资源路径检查 PASS：${references} 个引用；运行时产物、公开输出目录、URL 和含 {} 外部模板已忽略`);
