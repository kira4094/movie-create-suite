#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const file = process.argv[2];
if (!file) { console.error('用法: node validate_reference_assets.cjs <reference-assets.json>'); process.exit(2); }
let doc;
try { doc = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error(`JSON 无法读取: ${e.message}`); process.exit(1); }
if (!doc || typeof doc !== 'object' || Array.isArray(doc)) { console.error('参考资产账本 FAIL：顶层必须为非 null 普通对象'); process.exit(1); }
const kinds = new Set(['character_identity','scene_reference','storyboard_frame','prop_reference','action_reference','audio_reference']);
const states = new Set(['prompt_only','generated','verified','missing','ambiguous']);
const errors = [];
if (doc.schema_version !== 1) errors.push('schema_version 必须为 1');
if (!Array.isArray(doc.assets)) errors.push('assets 必须为数组');
const ids = new Set();
if ((doc.assets || []).some(a => !a || typeof a !== 'object' || Array.isArray(a))) errors.push('assets 每项必须为对象');
// 账本位于项目根/.movie-create，因此退两级得到项目根。
const projectRoot = path.dirname(path.dirname(path.resolve(file)));
const mediaExt = new Set(['.png','.jpg','.jpeg','.webp','.gif','.bmp','.tif','.tiff','.mp4','.mov','.webm','.mkv','.avi','.mp3','.wav','.m4a','.aac','.flac','.ogg']);
for (const [i, a] of (doc.assets || []).entries()) {
  if (!a || typeof a !== 'object' || Array.isArray(a)) continue;
  const p = `assets[${i}]`;
  for (const k of ['semantic_id','kind','source_prompt','availability_status']) if (typeof a[k] !== 'string' || !a[k]) errors.push(`${p}.${k} 必须为非空字符串`);
  if (ids.has(a.semantic_id)) errors.push(`${p}.semantic_id 重复: ${a.semantic_id}`); ids.add(a.semantic_id);
  if (!kinds.has(a.kind)) errors.push(`${p}.kind 非法`);
  if (!states.has(a.availability_status)) errors.push(`${p}.availability_status 非法`);
  if (a.file !== null && (typeof a.file !== 'string' || !a.file.trim())) errors.push(`${p}.file 必须为非空字符串或 null`);
  if (a.platform_asset_id !== null && (typeof a.platform_asset_id !== 'string' || !a.platform_asset_id.trim())) errors.push(`${p}.platform_asset_id 必须为非空字符串或 null`);
  if (!Array.isArray(a.uses) || !Array.isArray(a.shot_ids)) errors.push(`${p}.uses/shot_ids 必须为数组`);
  if (a.availability_status === 'verified') {
    const ext = typeof a.file === 'string' ? path.extname(a.file).toLowerCase() : '';
    if (a.file !== null && (path.isAbsolute(a.file) || !mediaExt.has(ext))) errors.push(`${p}.file 必须是项目根相对的媒体文件（图片/视频/音频白名单扩展名）`);
    if (a.file !== null && !path.isAbsolute(a.file)) {
      const resolved = path.resolve(projectRoot, a.file);
      const relative = path.relative(projectRoot, resolved);
      if (relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) errors.push(`${p}.file 必须位于项目根目录内: ${a.file}`);
      else if (!fs.existsSync(resolved)) errors.push(`${p}.file 不存在: ${a.file}`);
    }
    if (a.file === null && a.platform_asset_id === null) errors.push(`${p} verified 必须有真实 file 或 platform_asset_id`);
  }
}
if (errors.length) { console.error(`参考资产账本 FAIL\n${errors.map(x => `- ${x}`).join('\n')}`); process.exit(1); }
console.log(`参考资产账本 PASS：${doc.assets.length} 项`);
