const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');
const os = require('os');
const root = path.resolve(__dirname, '../..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const script = read('skills/movie-create-drama-script/SKILL.md');
const spec = read('skills/movie-create-drama-script/references/script-spec.md');
const out = read('skills/movie-create-out-video-director/SKILL.md');
const plan = read('skills/movie-create-out-video-director/references/pre-prompt-planning.md');
const entry = read('skills/movie-create-entry/SKILL.md');
for (const text of [script, spec]) assert(!/ref_anchors[^\n]*供视频生成的 `<Picture N>`/.test(text), 'semantic anchors must not promise model tags');
assert(script.includes('文档级一次性手动参考图槽位') && script.includes('角色名 = [角色名设定图]'), '03 declares document-level manual slots');
assert(script.includes('不展示 `reference-assets.json`') && script.includes('不生成 `<Picture N>`/`<图片N>`'), '03 hides internal asset state in manual mode');
assert(out.includes('自动平台适配模式') && out.includes('verified') && out.includes('bound'), '04 resolves ledger and request binding only in automatic mode');
assert(out.includes('target_model=null') && out.includes('不生成 04'), 'missing model blocks 04');
assert(plan.includes('用户只说“继续”') && plan.includes('自动模式无真实绑定图片时使用无图 T2V'), 'confirmation and no-image fallback are explicit');
assert(entry.includes('reference-assets.json') && entry.includes('video-config.json'), 'entry hands off internal state');
assert(entry.includes('两种模式都使用 `video-config.json`') && entry.includes('手动模式保持 `bindings=[]`') && entry.includes('只有自动平台适配模式才启用 `reference-assets.json`'), 'entry keeps config in both modes and ledger only for automatic bindings');
assert(!/ref_anchors[^\n]*(?:→|映射为)[^\n]*(?:<Picture N>|<图片N>)/.test(script), '03 must not compile anchors into model tags');
const run = (name, arg) => { const r = spawnSync(process.execPath, [path.join(root, 'skills/shared/scripts', name), path.join(__dirname, 'fixtures', arg)], { encoding:'utf8' }); assert.strictEqual(r.status, 0, `${name} failed:\n${r.stdout}\n${r.stderr}`); };
run('validate_reference_assets.cjs', 'reference-assets-valid.json');
run('validate_video_config.cjs', 'video-config-needs-confirmation.json');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'movie-ref-chain-'));
const invoke = (scriptName, value, expectPass, ledgerValue = null, expectedError = null) => {
  const f = path.join(temp, `${scriptName}-${Math.random().toString(16).slice(2)}.json`);
  fs.writeFileSync(f, JSON.stringify(value));
  const args = [path.join(root, 'skills/shared/scripts', scriptName), f];
  if (ledgerValue) { const lf = `${f}.ledger.json`; fs.writeFileSync(lf, JSON.stringify(ledgerValue)); args.push(lf); }
  const r = spawnSync(process.execPath, args, {encoding:'utf8'});
  assert.strictEqual(r.status === 0, expectPass, `${scriptName} ${expectPass ? '应通过' : '应失败'}:\n${r.stdout}\n${r.stderr}`);
  if (!expectPass && expectedError) assert(`${r.stdout}\n${r.stderr}`.includes(expectedError), `应包含错误: ${expectedError}`);
};
const invokeAt = (scriptName, value, file) => {
  fs.writeFileSync(file, JSON.stringify(value));
  const r = spawnSync(process.execPath, [path.join(root, 'skills/shared/scripts', scriptName), file], {encoding:'utf8'});
  return r;
};
const invokeManual = (file, storyboardFile = null) => {
  const args = [path.join(root, 'skills/shared/scripts/validate_manual_reference_slots.cjs'), file];
  if (storyboardFile) args.push(storyboardFile);
  return spawnSync(process.execPath, args, {encoding:'utf8'});
};
// A: confirmed model with no images is valid T2V and carries no bindings/tags.
invoke('validate_video_config.cjs', {schema_version:1,target_model:'seedance',selection_source:'user_explicit',output_variant:'single',state:'locked',bindings:[]}, true);
// B: semantic anchors remain names, never model tags.
assert(script.includes('最终 03 映射块只能渲染标题和严格映射行') && !/ref_anchors[^\n]*(?:→|映射为)[^\n]*(?:<Picture N>|<图片N>)/.test(script), 'manual slots are not model tags');
assert(out.includes('默认手动槽位模式') && plan.includes('语义名称 = [图片槽位]'), '04 supports one-time manual mapping');
// C/D: verified character/scene and storyboard frame can be bound through neutral IDs.
const verified = {schema_version:1,assets:[
  {semantic_id:'角色A',kind:'character_identity',source_prompt:'角色卡',file:null,platform_asset_id:'asset-character-a',availability_status:'verified',uses:['identity'],shot_ids:['S01-01']},
  {semantic_id:'场景A',kind:'scene_reference',source_prompt:'场景卡',file:null,platform_asset_id:'asset-scene-a',availability_status:'verified',uses:['scene'],shot_ids:['S01-01']},
  {semantic_id:'帧S01-01',kind:'storyboard_frame',source_prompt:'分镜图',file:null,platform_asset_id:'asset-frame-1',availability_status:'verified',uses:['i2v'],shot_ids:['S01-01']}
]};
invoke('validate_reference_assets.cjs', verified, true);
// Asset paths are resolved from the temporary project's .movie-create directory.
const tempProject = path.join(temp, 'project');
fs.mkdirSync(path.join(tempProject, '.movie-create'), {recursive:true});
fs.mkdirSync(path.join(tempProject, 'assets'), {recursive:true});
fs.writeFileSync(path.join(tempProject, 'assets', 'frame.png'), 'PNG');
fs.writeFileSync(path.join(temp, 'outside.png'), 'PNG');
const ledgerFile = path.join(tempProject, '.movie-create', 'reference-assets.json');
const mediaLedger = {schema_version:1,assets:[{semantic_id:'真实帧',kind:'storyboard_frame',source_prompt:'frame',file:'assets/frame.png',platform_asset_id:null,availability_status:'verified',uses:['i2v'],shot_ids:['S01-01']}]};
assert.strictEqual(invokeAt('validate_reference_assets.cjs', mediaLedger, ledgerFile).status, 0, '项目根相对真实媒体文件应通过');
for (const badFile of ['assets/missing.png', path.join(tempProject, 'assets', 'frame.png'), 'assets/notes.md', 'assets/frame.exe']) {
  const bad = {...mediaLedger, assets:[{...mediaLedger.assets[0], file:badFile, platform_asset_id:null}]};
  assert.notStrictEqual(invokeAt('validate_reference_assets.cjs', bad, ledgerFile).status, 0, `非法媒体路径应失败: ${badFile}`);
}
const traversal = {...mediaLedger, assets:[{...mediaLedger.assets[0], file:'../outside.png'}]};
const traversalResult = invokeAt('validate_reference_assets.cjs', traversal, ledgerFile);
assert.notStrictEqual(traversalResult.status, 0, '项目外真实媒体必须失败');
assert(`${traversalResult.stdout}\n${traversalResult.stderr}`.includes('必须位于项目根目录内'), '越界路径必须报告边界错误');
invoke('validate_video_config.cjs', {schema_version:1,target_model:'h3',selection_source:'user_explicit',output_variant:'single',state:'locked',bindings:[
  {semantic_id:'角色A',shot_id:null,use:'identity',source:'asset-character-a',platform_tag:'<Picture 1>',upload_order:1,status:'bound'},
  {semantic_id:'帧S01-01',shot_id:'S01-01',use:'i2v',source:'asset-frame-1',platform_tag:'<Picture 2>',upload_order:2,status:'bound'}
]}, true, verified);
assert(out.includes('无图降级') && out.includes('storyboard_frame') && out.includes('I2V'), 'T2V/I2V 路由已写入 OUT 合同');
assert(out.includes('FL2V') && out.includes('两个') && out.includes('目标模型'), 'FL2V 受双帧和模型能力约束');
// E/F/G: invalid locked states, absent model and mixed model tags fail.
invoke('validate_video_config.cjs', {schema_version:1,target_model:'seedance',selection_source:'user_explicit',output_variant:'single',state:'locked',bindings:[{semantic_id:'x',use:'identity',source:'x',platform_tag:'<图片1>',upload_order:1,status:'missing'}]}, false);
invoke('validate_video_config.cjs', {schema_version:1,target_model:null,selection_source:null,output_variant:'single',state:'locked',bindings:[]}, false);
invoke('validate_video_config.cjs', {schema_version:1,target_model:'seedance',selection_source:'user_explicit',output_variant:'single',state:'locked',bindings:[{semantic_id:'x',use:'identity',source:'x',platform_tag:'<Picture 1>',upload_order:1,status:'bound'}]}, false);
for (const bad of [
  [{...verified, assets:[{...verified.assets[2], availability_status:'prompt_only'}]}, '必须为 verified'],
  [{...verified, assets:[{...verified.assets[2], platform_asset_id:'other'}]}, 'source 与账本不一致'],
  [{...verified, assets:[{...verified.assets[2], semantic_id:'其他'}]}, '在资产账本中不存在'],
  [{...verified, assets:[{...verified.assets[2], shot_ids:['S99-99']}]}, '必须绑定账本中的 shot_id']
]) {
  invoke('validate_video_config.cjs', {schema_version:1,target_model:'h3',selection_source:'user_explicit',output_variant:'single',state:'locked',bindings:[{semantic_id:'帧S01-01',shot_id:'S01-01',use:'i2v',source:'asset-frame-1',platform_tag:'<Picture 1>',upload_order:1,status:'bound'}]}, false, bad[0], bad[1]);
}
invoke('validate_video_config.cjs', {schema_version:1,target_model:null,selection_source:null,output_variant:'single',state:'needs_confirmation',bindings:[{semantic_id:'帧S01-01',shot_id:'S01-01',use:'i2v',source:'asset-frame-1',platform_tag:'<Picture 1>',upload_order:1,status:'bound'}]}, false, verified, 'target_model=null');
invoke('validate_video_config.cjs', {schema_version:1,target_model:'h3',selection_source:'user_explicit',output_variant:'single',state:'locked',bindings:[{semantic_id:'帧S01-01',shot_id:'S01-01',use:'i2v',source:'asset-frame-1',platform_tag:'<Picture 1>',upload_order:1,status:'bound'},{semantic_id:'角色A',shot_id:null,use:'identity',source:'asset-character-a',platform_tag:'<Picture 1>',upload_order:1,status:'bound'}]}, false, verified, 'upload_order 必须唯一');
invoke('validate_video_config.cjs', {schema_version:1,target_model:'h3',selection_source:'user_explicit',output_variant:'single',state:'locked',bindings:[{semantic_id:'帧S01-01',shot_id:'S01-01',use:'i2v',source:'asset-frame-1',platform_tag:'<Picture 1>',upload_order:1,status:'bound'},{semantic_id:'角色A',shot_id:null,use:'identity',source:'asset-character-a',platform_tag:'<Picture 2>',upload_order:1,status:'bound'}]}, false, verified, 'upload_order 必须唯一');
invoke('validate_video_config.cjs', {schema_version:1,target_model:'h3',selection_source:'user_explicit',output_variant:'single',state:'locked',bindings:[{semantic_id:'帧S01-01',shot_id:'S01-01',use:'i2v',source:'asset-frame-1',platform_tag:'<Picture 2>',upload_order:1,status:'bound'}]}, false, verified, '标签编号必须等于 upload_order');
// locked 状态下，仅将合法绑定改为 missing/ambiguous，必须命中同一条状态门禁。
for (const status of ['missing', 'ambiguous']) {
  invoke('validate_video_config.cjs', {schema_version:1,target_model:'h3',selection_source:'user_explicit',output_variant:'single',state:'locked',bindings:[
    {semantic_id:'帧S01-01',shot_id:null,use:'i2v',source:'asset-frame-1',platform_tag:'<Picture 1>',upload_order:1,status}
  ]}, false, verified, 'locked 不得有 missing/ambiguous binding');
}
for (const value of [null, [], 'text', 7]) {
  const f = path.join(temp, `top-${String(value)}.json`); fs.writeFileSync(f, JSON.stringify(value));
  const r = spawnSync(process.execPath, [path.join(root, 'skills/shared/scripts/validate_video_config.cjs'), f], {encoding:'utf8'});
  assert.notStrictEqual(r.status, 0, '视频配置非法顶层必须受控失败'); assert(!/TypeError/.test(`${r.stdout}\n${r.stderr}`), '非法顶层不得 TypeError');
}
for (const value of [null, [], 'text', 7]) {
  const f = path.join(temp, `ledger-top-${String(value)}.json`); fs.writeFileSync(f, JSON.stringify(value));
  const r = spawnSync(process.execPath, [path.join(root, 'skills/shared/scripts/validate_reference_assets.cjs'), f], {encoding:'utf8'});
  assert.notStrictEqual(r.status, 0, '资产账本非法顶层必须受控失败'); assert(!/TypeError/.test(`${r.stdout}\n${r.stderr}`), '账本非法顶层不得 TypeError');
}
const malformedBindings = invokeAt('validate_video_config.cjs', {schema_version:1,target_model:'seedance',selection_source:'user_explicit',output_variant:'single',state:'locked',bindings:[null]}, path.join(temp, 'bindings-null.json'));
assert.notStrictEqual(malformedBindings.status, 0, 'bindings:null 必须失败');
assert(/必须为非 null 对象/.test(`${malformedBindings.stdout}\n${malformedBindings.stderr}`), 'bindings:null 应报告合同错误而非异常');
// H: “继续” does not authorize a default model; unresolved model fixture passes as needs_confirmation.
assert(plan.includes('用户只说“继续”') && plan.includes('target_model=null'), '继续不授权默认模型');
run('validate_video_config.cjs', 'video-config-needs-confirmation.json');
// v2 mode separation: manual accepts only empty bindings; automatic keeps legacy rules.
invoke('validate_video_config.cjs', {schema_version:2,reference_mode:'manual_slots',target_model:'seedance',selection_source:'user_explicit',output_variant:'single',state:'locked',bindings:[]}, true);
invoke('validate_video_config.cjs', {schema_version:2,reference_mode:'manual_slots',target_model:'seedance',selection_source:'user_explicit',output_variant:'single',state:'locked',bindings:[{semantic_id:'角色A',use:'identity',status:'bound',source:'x',platform_tag:'<图片1>',upload_order:1}]}, false, null, 'manual_slots 的 bindings 必须为空数组');
invoke('validate_video_config.cjs', {schema_version:2,reference_mode:'manual_slots',target_model:'seedance',selection_source:'user_explicit',output_variant:'single',state:'locked',bindings:[]}, false, {schema_version:1,assets:[]}, 'manual_slots 不得提供 reference-assets.json');
invoke('validate_video_config.cjs', {schema_version:2,target_model:'seedance',selection_source:'user_explicit',output_variant:'single',state:'locked',bindings:[]}, false, null, 'reference_mode 必须为 manual_slots 或 automatic_platform');
invoke('validate_video_config.cjs', {schema_version:2,reference_mode:'wrong',target_model:'seedance',selection_source:'user_explicit',output_variant:'single',state:'locked',bindings:[]}, false, null, 'reference_mode 必须为 manual_slots 或 automatic_platform');
invoke('validate_video_config.cjs', {schema_version:2,reference_mode:'automatic_platform',target_model:'seedance',selection_source:'user_explicit',output_variant:'single',state:'locked',bindings:[]}, true);
// Manual-slot validator covers real 03/04 fixtures and storyboard-required character/scene mappings.
const manual03 = path.join(__dirname, 'fixtures/actual-project/03-分镜脚本图提示词.md');
const manual04 = path.join(__dirname, 'fixtures/actual-project/04-视频提示词.md');
const actualSb = path.join(__dirname, 'fixtures/actual-project/.movie-create/storyboard.json');
assert.strictEqual(invokeManual(manual03, actualSb).status, 0, '03 manual slots fixture must pass');
assert.strictEqual(invokeManual(manual04).status, 0, '04 manual slots fixture must pass');
const legacy04 = path.join(temp, 'legacy-04-视频提示词.txt');
fs.writeFileSync(legacy04, fs.readFileSync(manual04, 'utf8'));
assert.strictEqual(invokeManual(legacy04).status, 0, '历史 04 TXT 仅作手动槽位兼容校验必须通过');
const wrappedSb = path.join(temp, 'wrapped-storyboard.json'); fs.writeFileSync(wrappedSb, JSON.stringify({storyboard:{shots:[{characters:['林','周'],scene:'室内'}]}}));
assert.strictEqual(invokeManual(manual03, wrappedSb).status, 0, 'wrapped storyboard fixture must pass');
for (const [name, body, error] of [
  ['duplicate-name', '## 参考资产映射\n- 林 = [林设定图]\n- 林 = [林设定图]\n', '语义名称重复'],
  ['duplicate-slot', '## 参考资产映射\n- 林 = [同一图]\n- 周 = [同一图]\n', '图片槽位重复'],
  ['bad-slot', '## 参考资产映射\n- 林 = [蓝图.md]\n', '槽位不得包含'],
  ['repeat-slot', '## 参考资产映射\n- 林 = [林设定图]\n正文再次 [林设定图]\n', '图片槽位必须只在映射块出现一次']
]) {
  const f = path.join(temp, `${name}.md`); fs.writeFileSync(f, body);
  const result = invokeManual(f); assert.notStrictEqual(result.status, 0, `${name} must fail`); assert(`${result.stdout}\n${result.stderr}`.includes(error), `${name} error`);
}
const missing = path.join(temp, 'missing-scene.md'); fs.writeFileSync(missing, '## 参考资产映射\n- 林 = [林设定图]\n');
const sceneSb = path.join(temp, 'scene-storyboard.json'); fs.writeFileSync(sceneSb, JSON.stringify({shots:[{characters:['林'],scene:'室内'}]}));
const missingResult = invokeManual(missing, sceneSb); assert.notStrictEqual(missingResult.status, 0, 'missing scene mapping must fail'); assert(`${missingResult.stdout}\n${missingResult.stderr}`.includes('缺少场景映射'), 'missing scene error');
const wrappedMissing = path.join(temp, 'wrapped-missing-role.json'); fs.writeFileSync(wrappedMissing, JSON.stringify({storyboard:{shots:[{characters:['王'],scene:'室内'}]}}));
const wrappedMissingResult = invokeManual(manual03, wrappedMissing); assert.notStrictEqual(wrappedMissingResult.status, 0, 'wrapped missing role must fail'); assert(`${wrappedMissingResult.stdout}\n${wrappedMissingResult.stderr}`.includes('缺少角色映射'), 'wrapped missing role error');
// Deterministic card resolution: exact name, missing card, normalized duplicates and orphan/order are rejected.
function makeCardProject(label, roleFiles, sceneFiles, mapping, shots) {
  const dir = path.join(temp, label); fs.mkdirSync(path.join(dir, '01-角色提示词'), {recursive:true}); fs.mkdirSync(path.join(dir, '02-场景提示词'), {recursive:true});
  for (const f of roleFiles) fs.writeFileSync(path.join(dir, '01-角色提示词', f), '# 角色');
  for (const f of sceneFiles) fs.writeFileSync(path.join(dir, '02-场景提示词', f), '# 场景');
  const out = path.join(dir, '03.md'); fs.writeFileSync(out, `## 参考资产映射\n${mapping.map(([n,s]) => `- ${n} = [${s}]`).join('\n')}\n## 提示词\n正文`);
  const sb = path.join(dir, 'storyboard.json'); fs.writeFileSync(sb, JSON.stringify({shots})); return [out, sb];
}
let [cardFile, cardSb] = makeCardProject('exact-card', ['林.md'], ['室内.md'], [['林','林图'],['室内','室内图']], [{characters:['林'],scene:'室内'}]);
assert.strictEqual(invokeManual(cardFile, cardSb).status, 0, 'exact card names pass');
[cardFile, cardSb] = makeCardProject('missing-card', [], ['室内.md'], [['林','林图'],['室内','室内图']], [{characters:['林'],scene:'室内'}]);
assert.notStrictEqual(invokeManual(cardFile, cardSb).status, 0, 'missing role card fails');
[cardFile, cardSb] = makeCardProject('normalized-multiple', ['林.md','林　.md'], ['室内.md'], [['林','林图'],['室内','室内图']], [{characters:['林'],scene:'室内'}]);
assert.notStrictEqual(invokeManual(cardFile, cardSb).status, 0, 'normalized multiple cards fail');
[cardFile, cardSb] = makeCardProject('non-exact', ['林 .md'], ['室内.md'], [['林','林图'],['室内','室内图']], [{characters:['林'],scene:'室内'}]);
const nonExactResult = invokeManual(cardFile, cardSb); assert.notStrictEqual(nonExactResult.status, 0, 'non-exact card filename fails'); assert(`${nonExactResult.stdout}\n${nonExactResult.stderr}`.includes('精确一致'), 'non-exact filename error');
 [cardFile, cardSb] = makeCardProject('orphan-order', ['林.md','周.md'], ['室内.md'], [['周','周图'],['林','林图'],['室内','室内图']], [{characters:['林','周'],scene:'室内'}]);
assert.notStrictEqual(invokeManual(cardFile, cardSb).status, 0, 'orphan/order mapping fails');
const outside = path.join(temp, 'outside-mapping.md'); fs.writeFileSync(outside, '## 参考资产映射\n- 林 = [林设定图]\n## 正文\n- 周 = [周设定图]\n');
assert.strictEqual(invokeManual(outside).status, 0, 'mapping outside block is ignored');
const malformed = path.join(temp, 'malformed-bullet.md'); fs.writeFileSync(malformed, '## 参考资产映射\n- 林：[林设定图]\n');
const malformedResult = invokeManual(malformed); assert.notStrictEqual(malformedResult.status, 0, 'malformed mapping bullet must fail'); assert(`${malformedResult.stdout}\n${malformedResult.stderr}`.includes('格式非法'), 'malformed bullet error');
const leaked = path.join(temp, 'leaked-state.md'); fs.writeFileSync(leaked, '## 参考资产映射\n- 林 = [林设定图]\n正文 prompt_only <Picture 1>\n');
const leakedResult = invokeManual(leaked); assert.notStrictEqual(leakedResult.status, 0, 'manual state/tag leakage must fail'); assert(`${leakedResult.stdout}\n${leakedResult.stderr}`.includes('不得泄漏内部状态'), 'manual leakage error');
const boundary = path.join(temp, 'boundary.md'); fs.writeFileSync(boundary, '## 参考资产映射\n- 林 = [林设定图]\n正文 boundary 条件通过。\n');
assert.strictEqual(invokeManual(boundary).status, 0, 'boundary must not match bound state token');
const standaloneBound = path.join(temp, 'standalone-bound.md'); fs.writeFileSync(standaloneBound, '## 参考资产映射\n- 林 = [林设定图]\n正文 bound 状态泄漏。\n');
const standaloneBoundResult = invokeManual(standaloneBound); assert.notStrictEqual(standaloneBoundResult.status, 0, 'standalone bound must fail');
for (const badSlot of ['设定.md','空间蓝图','scene-layout','ASCII图','提示词']) {
  const f = path.join(temp, `bad-slot-${badSlot}.md`); fs.writeFileSync(f, `## 参考资产映射\n- 林 = [${badSlot}]\n`);
  assert.notStrictEqual(invokeManual(f).status, 0, `forbidden slot must fail: ${badSlot}`);
}
const autoBoundNoLedger = {schema_version:2,reference_mode:'automatic_platform',target_model:'h3',selection_source:'user_explicit',output_variant:'single',state:'locked',bindings:[{semantic_id:'x',use:'identity',source:'x',platform_tag:'<Picture 1>',upload_order:1,status:'bound'}]};
invoke('validate_video_config.cjs', autoBoundNoLedger, false, null, '必须提供 reference-assets.json');
console.log('参考图链路合同测试 PASS：Gate A-H 实际正反例矩阵');
