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
assert(script.includes('语义 ID 不是图片凭证'), '03 declares semantic-only anchors');
assert(out.includes('不得跳过参考资产解析') && out.includes('verified') && out.includes('bound'), '04 resolves ledger and request binding');
assert(out.includes('target_model=null') && out.includes('不生成 04'), 'missing model blocks 04');
assert(plan.includes('用户只说“继续”') && plan.includes('无真实绑定图片时必须使用无图 T2V'), 'confirmation and no-image fallback are explicit');
assert(entry.includes('reference-assets.json') && entry.includes('video-config.json'), 'entry hands off internal state');
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
// A: confirmed model with no images is valid T2V and carries no bindings/tags.
invoke('validate_video_config.cjs', {schema_version:1,target_model:'seedance',selection_source:'user_explicit',output_variant:'single',state:'locked',bindings:[]}, true);
// B: semantic anchors remain names, never model tags.
assert(script.includes('语义 ID 不是图片凭证') && !/ref_anchors[^\n]*(?:→|映射为)[^\n]*(?:<Picture N>|<图片N>)/.test(script), '语义 anchors 不等于模型标签');
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
console.log('参考图链路合同测试 PASS：Gate A-H 实际正反例矩阵');
