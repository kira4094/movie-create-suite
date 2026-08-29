#!/usr/bin/env node
const fs = require('fs');
const file = process.argv[2];
const ledgerFile = process.argv[3];
if (!file) { console.error('用法: node validate_video_config.cjs <video-config.json> [reference-assets.json]'); process.exit(2); }
let doc;
try { doc = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error(`JSON 无法读取: ${e.message}`); process.exit(1); }
if (!doc || typeof doc !== 'object' || Array.isArray(doc)) { console.error('视频配置 FAIL：顶层必须为非 null 普通对象'); process.exit(1); }
let ledger = null;
if (ledgerFile) { try { ledger = JSON.parse(fs.readFileSync(ledgerFile, 'utf8')); } catch (e) { console.error(`资产账本无法读取: ${e.message}`); process.exit(1); } }
if (ledger && (typeof ledger !== 'object' || Array.isArray(ledger))) { console.error('资产账本 FAIL：顶层必须为非 null 普通对象'); process.exit(1); }
const errors = [];
if (![1,2].includes(doc.schema_version)) errors.push('schema_version 必须为 1 或 2');
const referenceMode = doc.schema_version === 1 ? 'automatic_platform' : doc.reference_mode;
if (doc.schema_version === 2 && !['manual_slots','automatic_platform'].includes(referenceMode)) errors.push('reference_mode 必须为 manual_slots 或 automatic_platform');
if (!['seedance','h3',null].includes(doc.target_model)) errors.push('target_model 非法');
if (!['user_explicit','user_explicit_default',null].includes(doc.selection_source)) errors.push('selection_source 非法');
if (!['single','dual'].includes(doc.output_variant)) errors.push('output_variant 非法');
if (!['locked','needs_confirmation'].includes(doc.state)) errors.push('state 非法');
if (!Array.isArray(doc.bindings)) errors.push('bindings 必须为数组');
if (referenceMode === 'manual_slots' && ledgerFile) errors.push('manual_slots 不得提供 reference-assets.json');
if (referenceMode === 'manual_slots' && Array.isArray(doc.bindings) && doc.bindings.length) errors.push('manual_slots 的 bindings 必须为空数组');
for (const [i, b] of (doc.bindings || []).entries()) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) { errors.push(`bindings[${i}] 必须为非 null 对象`); continue; }
  for (const k of ['semantic_id','use','status']) if (typeof b[k] !== 'string' || !b[k].trim()) errors.push(`bindings[${i}].${k} 必须为非空字符串`);
  if (b.shot_id !== null && (typeof b.shot_id !== 'string' || !b.shot_id.trim())) errors.push(`bindings[${i}].shot_id 必须为字符串或 null`);
  if (!['bound','missing','ambiguous'].includes(b.status)) errors.push(`bindings[${i}].status 非法`);
  if (b.status === 'bound' && (typeof b.source !== 'string' || !b.source.trim())) errors.push(`bindings[${i}].bound 必须有 source`);
  if (b.status === 'bound' && (typeof b.platform_tag !== 'string' || !b.platform_tag.trim())) errors.push(`bindings[${i}].bound 必须有 platform_tag`);
  if (b.status === 'bound' && (!Number.isInteger(b.upload_order) || b.upload_order < 1)) errors.push(`bindings[${i}].upload_order 必须为正整数`);
}
const bound = (doc.bindings || []).filter(b => b && b.status === 'bound');
if (doc.target_model === null && bound.length) errors.push('target_model=null 时不得存在 bound binding');
if (new Set(bound.map(b => b.upload_order)).size !== bound.length) errors.push('bound 的 upload_order 必须唯一');
if (doc.state === 'locked' && (doc.target_model === null || doc.selection_source === null)) errors.push('locked 必须有 target_model 和 selection_source');
if (doc.state === 'locked' && (doc.bindings || []).some(b => b && b.status === 'missing' || b && b.status === 'ambiguous')) errors.push('locked 不得有 missing/ambiguous binding');
if (doc.selection_source === 'user_explicit_default' && doc.target_model !== 'seedance') errors.push('user_explicit_default 只能锁定 seedance');
for (const b of bound) {
  const expected = doc.target_model === 'h3' ? /^<Picture\s+\d+>$/ : doc.target_model === 'seedance' ? /^<图片\s*\d+>$/ : null;
  if (!expected) continue;
  if (!expected.test(b.platform_tag)) errors.push(`bindings.${b.semantic_id} 的标签与模型不匹配`);
  const n = Number((b.platform_tag.match(/(\d+)/) || [])[1]);
  if (n !== b.upload_order) errors.push(`bindings.${b.semantic_id} 标签编号必须等于 upload_order`);
  if (doc.target_model === 'seedance' && /<Picture\s*\d+>/.test(b.platform_tag)) errors.push('Seedance 禁止 H3 标签');
  if (doc.target_model === 'h3' && /<图片\s*\d+>/.test(b.platform_tag)) errors.push('H3 禁止 Seedance 标签');
}
if (referenceMode === 'automatic_platform' && bound.length && !ledger) errors.push('存在 bound binding 时必须提供 reference-assets.json 进行联合校验');
if (referenceMode === 'automatic_platform' && bound.length && ledger) {
  const assets = Array.isArray(ledger.assets) ? ledger.assets : [];
  for (const b of bound) {
    const a = assets.find(x => x && x.semantic_id === b.semantic_id);
    if (!a) { errors.push(`binding ${b.semantic_id} 在资产账本中不存在`); continue; }
    if (a.availability_status !== 'verified') errors.push(`binding ${b.semantic_id} 的账本资产必须为 verified`);
    if (b.source !== a.file && b.source !== a.platform_asset_id) errors.push(`binding ${b.semantic_id} 的 source 与账本不一致`);
    if (!Array.isArray(a.uses) || !a.uses.includes(b.use)) errors.push(`binding ${b.semantic_id} 的 use 与账本不兼容`);
    if (a.kind === 'storyboard_frame' && (typeof b.shot_id !== 'string' || !b.shot_id || !Array.isArray(a.shot_ids) || !a.shot_ids.includes(b.shot_id))) errors.push(`storyboard_frame ${b.semantic_id} 必须绑定账本中的 shot_id`);
  }
}
if (errors.length) { console.error(`视频配置 FAIL\n${errors.map(x => `- ${x}`).join('\n')}`); process.exit(1); }
console.log(`视频配置 PASS：${doc.state}，模型=${doc.target_model || '未确认'}`);
