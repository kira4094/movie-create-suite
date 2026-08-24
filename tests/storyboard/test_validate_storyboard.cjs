#!/usr/bin/env node
/* 使用系统临时副本验证校验器；不修改基准 fixture。 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const here = __dirname;
const root = path.resolve(here, '..', '..');
const validator = path.join(root, 'skills', 'shared', 'scripts', 'validate_storyboard.cjs');
const fixtureDir = path.join(here, 'fixtures');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'storyboard-validator-'));
function fixture(name) { return path.join(fixtureDir, name); }
function run(file, args = [], env = {}) {
  const result = cp.spawnSync(process.execPath, [validator, file, ...args], { encoding: 'utf8', env: { ...process.env, ...env } });
  let report = null;
  const match = result.stdout.match(/\{[\s\S]*\}\s*$/);
  if (match) { try { report = JSON.parse(match[0]); } catch (_) {} }
  return { ...result, report };
}
function copy(name, out = name) { const dest = path.join(temp, out); fs.copyFileSync(fixture(name), dest); return dest; }
function has(report, text) { return report && report.issues.some((issue) => issue.problem.includes(text)); }
function expectExit(result, code, message) { assert.strictEqual(result.status, code, `${message}: ${result.stderr}\n${result.stdout}`); }
function sha(file) { return require('crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function withoutAllowedDurations(value) {
  const copy = JSON.parse(JSON.stringify(value));
  const owner = copy && copy.storyboard && typeof copy.storyboard === 'object' ? copy.storyboard : copy;
  if (owner && Array.isArray(owner.shots)) owner.shots.forEach((shot) => { delete shot.duration; delete shot.time_range; });
  return copy;
}

try {
  let result = run(copy('storyboard-valid-v1.json'));
  expectExit(result, 0, '有效 v1'); assert.strictEqual(result.report.verdict, 'PASS');
  result = run(copy('storyboard-duration-mismatch-v1.json'), ['--dry-run']);
  expectExit(result, 1, 'dry-run 仍报告原始不匹配'); assert.strictEqual(result.report.fix_plan.durations[0], 6); assert.strictEqual(result.report.fix_applied, false);
  const mismatch = copy('storyboard-duration-mismatch-v1.json', 'mismatch-fix.json'); const before = fs.readFileSync(mismatch); const fixed = run(mismatch, ['--fix', '--backup']); expectExit(fixed, 0, '安全 fix'); assert.strictEqual(fixed.report.fix_applied, true); assert.deepStrictEqual(fs.readFileSync(`${mismatch}.bak`), before); assert.strictEqual(JSON.parse(fs.readFileSync(mismatch)).shots[0].duration, 6);
  const wrapped = copy('storyboard-wrapped-unknown-fields-v1.json', 'wrapped-fix.json'); const wrappedBefore = JSON.parse(fs.readFileSync(wrapped)); result = run(wrapped, ['--dry-run']); expectExit(result, 1, '包裹 dry-run'); assert.deepStrictEqual(JSON.parse(fs.readFileSync(wrapped)), wrappedBefore); result = run(wrapped, ['--fix']); expectExit(result, 0, '包裹 fix'); const wrappedAfter = JSON.parse(fs.readFileSync(wrapped)); assert.deepStrictEqual(withoutAllowedDurations(wrappedAfter), withoutAllowedDurations(wrappedBefore));
  let failedFile = copy('storyboard-impossible-duration-v1.json', 'impossible.json'); let failedHash = sha(failedFile); result = run(failedFile, ['--dry-run']); expectExit(result, 1, '不可行时长快速失败'); assert.ok(has(result.report, '目标时长不可行')); assert.strictEqual(sha(failedFile), failedHash);
  failedFile = copy('storyboard-empty-shots-v1.json', 'empty.json'); failedHash = sha(failedFile); result = run(failedFile); expectExit(result, 1, '空镜头失败'); assert.ok(has(result.report, 'shots 必须是非空数组')); assert.strictEqual(sha(failedFile), failedHash);
  failedFile = copy('storyboard-invalid-duration-v1.json', 'invalid.json'); failedHash = sha(failedFile); result = run(failedFile); expectExit(result, 1, '畸形时长失败'); assert.ok(has(result.report, '有限正整数')); assert.strictEqual(sha(failedFile), failedHash);
  const mixed = copy('storyboard-mixed-minimum-duration-v1.json', 'mixed.json'); const mixedBefore = JSON.parse(fs.readFileSync(mixed)); result = run(mixed, ['--dry-run']); expectExit(result, 1, 'mixed dry-run 生成缩短计划'); assert.strictEqual(JSON.parse(fs.readFileSync(mixed)).shots[0].duration, 1); result = run(mixed, ['--fix']); expectExit(result, 0, 'mixed fix 精确收敛'); const mixedAfter = JSON.parse(fs.readFileSync(mixed)); assert.strictEqual(mixedAfter.shots[0].duration, 1); assert.deepStrictEqual(mixedAfter.shots.map((shot) => shot.duration), [1, 1, 1]); assert.strictEqual(mixedAfter.shots[2].time_range, '0:02-0:03'); assert.strictEqual(mixedAfter.shots.reduce((sum, shot) => sum + shot.duration, 0), mixedAfter.duration_seconds); assert.strictEqual(result.report.issues.filter((issue) => issue.severity === 'high').length, 0); assert.deepStrictEqual(mixedBefore.coverage, mixedAfter.coverage);
  result = run(copy('storyboard-intentional-repeat-v1.json')); expectExit(result, 0, 'intentional_repeat 合法');

  const base = JSON.parse(fs.readFileSync(fixture('storyboard-valid-v1.json')));
  base.coverage = [{ beat: '合法省略', status: 'omitted_with_reason', reason: '本节拍由后续镜头承接' }, { beat: '合法非视觉', status: 'nonvisual_context', reason: '仅有声音信息' }, { beat: '缺原因重复', status: 'intentional_repeat', shot_ids: ['镜头-1'] }, { beat: '缺引用重复', status: 'intentional_repeat', reason: '需要重复' }, { beat: '坏引用重复', status: 'intentional_repeat', reason: '需要重复', shot_ids: ['不存在'] }, { beat: '缺原因省略', status: 'omitted_with_reason' }, { beat: '缺原因非视觉', status: 'nonvisual_context' }, { beat: '越界', status: 'covered', shot_ids: ['不存在'] }, { beat: '未知', status: 'future', shot_ids: [] }];
  const coverageFile = path.join(temp, 'coverage.json'); fs.writeFileSync(coverageFile, JSON.stringify(base)); result = run(coverageFile); expectExit(result, 1, 'coverage 高严重度'); assert.ok(has(result.report, '必须提供非空 reason')); assert.ok(has(result.report, '引用越界')); assert.ok(has(result.report, '未知 coverage 状态'));
  for (const coverage of [undefined, [], [{ beat: '缺状态', shot_ids: ['镜头-1'] }]]) { const missingCoverage = JSON.parse(fs.readFileSync(fixture('storyboard-valid-v1.json'))); if (coverage === undefined) delete missingCoverage.coverage; else missingCoverage.coverage = coverage; fs.writeFileSync(coverageFile, JSON.stringify(missingCoverage)); const beforeCoverageHash = sha(coverageFile); result = run(coverageFile); expectExit(result, 1, 'coverage 结构缺失或不完整'); assert.ok(has(result.report, coverage === undefined || coverage.length === 0 ? 'coverage 必须是非空数组' : '未知 coverage 状态')); assert.strictEqual(sha(coverageFile), beforeCoverageHash); }
  base.shots[1].shot_id = base.shots[0].shot_id; base.coverage = [{ beat: '重复测试', status: 'covered', shot_ids: ['镜头-1'] }]; fs.writeFileSync(coverageFile, JSON.stringify(base)); const duplicateHash = sha(coverageFile); result = run(coverageFile); expectExit(result, 1, 'shot_id 唯一'); assert.ok(has(result.report, 'shot_id 重复')); assert.strictEqual(sha(coverageFile), duplicateHash);
  const assetBase = JSON.parse(fs.readFileSync(fixture('storyboard-valid-v1.json'))); assetBase.assets.characters.push({ id: '人物甲' }); assetBase.assets.props = []; fs.writeFileSync(coverageFile, JSON.stringify(assetBase)); const assetHash = sha(coverageFile); result = run(coverageFile); expectExit(result, 1, 'assets 重复与遗漏'); assert.ok(has(result.report, '资产重复')); assert.ok(has(result.report, '资产遗漏')); assert.strictEqual(sha(coverageFile), assetHash);
  const wrappedFallback = JSON.parse(fs.readFileSync(fixture('storyboard-wrapped-unknown-fields-v1.json'))); wrappedFallback.storyboard.duration_seconds = 4; delete wrappedFallback.storyboard.assets; wrappedFallback.assets = { characters: [], scenes: [{ id: '地下通道' }], props: [] }; const fallbackFile = path.join(temp, 'wrapped-fallback.json'); fs.writeFileSync(fallbackFile, JSON.stringify(wrappedFallback)); const fallbackBefore = JSON.parse(fs.readFileSync(fallbackFile)); result = run(fallbackFile, ['--dry-run']); expectExit(result, 1, '包裹顶层 assets dry-run'); assert.deepStrictEqual(JSON.parse(fs.readFileSync(fallbackFile)), fallbackBefore); result = run(fallbackFile, ['--fix']); expectExit(result, 0, '包裹顶层 assets fix'); const fallbackAfter = JSON.parse(fs.readFileSync(fallbackFile)); assert.deepStrictEqual(withoutAllowedDurations(fallbackAfter), withoutAllowedDurations(fallbackBefore)); assert.ok(fallbackAfter.assets && !fallbackAfter.storyboard.assets);
  const conflict = JSON.parse(fs.readFileSync(fixture('storyboard-wrapped-unknown-fields-v1.json'))); conflict.assets = { characters: [], scenes: [{ id: '另一场景' }], props: [] }; const conflictFile = path.join(temp, 'wrapped-conflict.json'); fs.writeFileSync(conflictFile, JSON.stringify(conflict)); const conflictHash = sha(conflictFile); result = run(conflictFile, ['--fix']); expectExit(result, 1, '包裹内外 assets 冲突'); assert.ok(has(result.report, 'assets 冲突') || result.stderr.includes('assets 冲突')); assert.strictEqual(sha(conflictFile), conflictHash);

  const scriptFile = path.join(temp, 'script.txt'); fs.writeFileSync(scriptFile, '这是一个足够长的原文台词，用于近似文本检查。短。'); const dialogue = JSON.parse(fs.readFileSync(fixture('storyboard-valid-v1.json'))); dialogue.shots[0].dialogue = '人物甲：极短'; dialogue.shots[0].speaker = '人物甲'; dialogue.shots[1].dialogue = '旁白：完全不在原文的旁白内容'; dialogue.shots[1].speaker = '旁白'; dialogue.shots.push({ ...dialogue.shots[1], shot_id: '镜头-3', dialogue: '系统：系统说了一段不存在的内容', speaker: '系统', time_range: '0:04-0:05', duration: 1 }); dialogue.duration_seconds = 5; const dialogueFile = path.join(temp, 'dialogue.json'); fs.writeFileSync(dialogueFile, JSON.stringify(dialogue)); result = run(dialogueFile, ['--script', scriptFile]); expectExit(result, 0, '角色 speaker 合法且旁白/系统音豁免'); assert.ok(has(result.report, '短文本无法确认')); assert.ok(has(result.report, '旁白无法确认')); assert.ok(has(result.report, '近似文本无法确认')); assert.ok(result.report.issues.every((issue) => issue.field !== '逐字比对' && issue.field !== 'speaker'));
  const badSpeaker = JSON.parse(fs.readFileSync(fixture('storyboard-valid-v1.json'))); badSpeaker.shots[0].dialogue = '人物甲：台词'; badSpeaker.shots[0].speaker = '不存在角色'; const badSpeakerFile = path.join(temp, 'bad-speaker.json'); fs.writeFileSync(badSpeakerFile, JSON.stringify(badSpeaker)); result = run(badSpeakerFile); expectExit(result, 1, 'speaker 不属于 characters 失败'); assert.ok(has(result.report, '必须属于当前镜头 characters[]'));

  for (const value of [0, 1.5, '2秒', '2']) { const malformed = JSON.parse(fs.readFileSync(fixture('storyboard-valid-v1.json'))); malformed.duration_seconds = value; malformed.shots[0].duration = value; const malformedFile = path.join(temp, `malformed-${String(value)}.json`); fs.writeFileSync(malformedFile, JSON.stringify(malformed)); result = run(malformedFile); expectExit(result, 1, `非法目标或镜头时长 ${value}`); assert.ok(has(result.report, '有限正整数')); }
  const ranges = JSON.parse(fs.readFileSync(fixture('storyboard-valid-v1.json'))); ranges.shots[0].time_range = '0:00-0:03'; const rangeFile = path.join(temp, 'bad-range.json'); fs.writeFileSync(rangeFile, JSON.stringify(ranges)); result = run(rangeFile); expectExit(result, 1, 'time_range 区间长度'); assert.ok(has(result.report, '区间长度必须等于 duration'));
  ranges.shots[0].time_range = '0:01-0:03'; fs.writeFileSync(rangeFile, JSON.stringify(ranges)); result = run(rangeFile); expectExit(result, 1, 'time_range 不连续'); assert.ok(has(result.report, '不连续'));
  ranges.shots[0].time_range = '0:00-0:02'; ranges.shots[1].time_range = '0:02-0:05'; fs.writeFileSync(rangeFile, JSON.stringify(ranges)); result = run(rangeFile); expectExit(result, 1, 'time_range 终点不等于目标'); assert.ok(has(result.report, '时间轴结束应为'));

  const atomic = copy('storyboard-duration-mismatch-v1.json', 'atomic.json'); const atomicHash = require('crypto').createHash('sha256').update(fs.readFileSync(atomic)).digest('hex'); result = run(atomic, ['--fix'], { STORYBOARD_TEST_FORCE_RENAME_FAILURE: '1' }); expectExit(result, 1, '原子替换失败'); assert.strictEqual(require('crypto').createHash('sha256').update(fs.readFileSync(atomic)).digest('hex'), atomicHash); assert.strictEqual(fs.readdirSync(temp).some((name) => name.endsWith('.tmp')), false);
  for (const args of [['--fix', '--dry-run'], ['--backup'], ['--unknown'], ['--script']]) { result = run(copy('storyboard-valid-v1.json'), args); expectExit(result, 2, `非法 CLI ${args.join(' ')}`); }
  console.log(`测试通过：${16} 组断言；临时目录：${temp}`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
