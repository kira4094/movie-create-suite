#!/usr/bin/env node
/** 分镜 v1 质量安全校验器；只负责确定性校验与安全的时长修复。 */
const fs = require('fs');
const path = require('path');

function usage() { console.error('用法: node validate_storyboard.cjs <分镜.json> [--script <原文.txt>] [--dry-run | --fix [--backup]]'); }
function parseArgs(argv) {
  const out = { file: null, script: null, fix: false, dryRun: false, backup: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--script') { if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('--script 缺少文件路径'); out.script = argv[++i]; }
    else if (arg === '--fix') out.fix = true;
    else if (arg === '--dry-run') out.dryRun = true;
    else if (arg === '--backup') out.backup = true;
    else if (arg.startsWith('--')) throw new Error(`未知参数: ${arg}`);
    else if (out.file) throw new Error('只能指定一个分镜文件');
    else out.file = arg;
  }
  if (!out.file) throw new Error('缺少分镜文件');
  if (out.fix && out.dryRun) throw new Error('--fix 与 --dry-run 不能同时使用');
  if (out.backup && !out.fix) throw new Error('--backup 只能与 --fix 合用');
  return out;
}
function integer(value) { return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value); }
function fmtTime(seconds) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }
function add(issues, severity, field, shotId, problem, suggestion = '') { issues.push({ severity, field, shot_id: shotId, problem, suggestion }); }
function normalizeText(value) { return String(value).normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu, ''); }
function parseRange(value) {
  if (typeof value !== 'string') return null;
  const m = value.match(/^(\d+):(\d{2})-(\d+):(\d{2})$/);
  if (!m || Number(m[2]) >= 60 || Number(m[4]) >= 60) return null;
  return { start: Number(m[1]) * 60 + Number(m[2]), end: Number(m[3]) * 60 + Number(m[4]) };
}
function container(data) { return data && data.storyboard && typeof data.storyboard === 'object' && !Array.isArray(data.storyboard) ? data.storyboard : data; }

function validate(data, scriptText) {
  const root = container(data); const issues = [];
  if (!root || typeof root !== 'object' || Array.isArray(root)) { add(issues, 'high', 'structure', -1, '分镜根对象必须是 JSON 对象'); return { root, issues, shots: [], target: null, plan: null }; }
  const shots = root.shots; const target = root.duration_seconds;
  if (!integer(target) || target <= 0) add(issues, 'high', 'duration_seconds', -1, 'duration_seconds 必须是有限正整数');
  if (!Array.isArray(shots) || shots.length === 0) add(issues, 'high', 'shots', -1, 'shots 必须是非空数组');
  const list = Array.isArray(shots) ? shots : []; const ids = new Set();
  const required = ['shot_id', 'time_range', 'duration', 'scene', 'purpose', 'continuity', 'hook', 'ref_anchors'];
  list.forEach((shot, index) => {
    if (!shot || typeof shot !== 'object' || Array.isArray(shot)) { add(issues, 'high', 'structure', index + 1, '镜头必须是对象'); return; }
    required.forEach((field) => { if (shot[field] === undefined || shot[field] === null || shot[field] === '') add(issues, 'high', 'structure', shot.shot_id || index + 1, `镜头缺少必填字段: ${field}`); });
    if (ids.has(shot.shot_id)) add(issues, 'high', 'shot_id', shot.shot_id, `shot_id 重复: ${shot.shot_id}`);
    ids.add(shot.shot_id);
    if (!integer(shot.duration) || shot.duration < 1) add(issues, 'high', 'duration', shot.shot_id, 'duration 必须是有限正整数且至少为 1 秒');
    else if (shot.duration < 2 || shot.duration > 5) add(issues, 'medium', 'duration', shot.shot_id, '创作时长建议为 2–5 秒；当前值仅满足机械约束');
    if (shot.continuity && (!shot.continuity.start || !shot.continuity.end)) add(issues, 'high', 'continuity', shot.shot_id, 'continuity 缺少 start 或 end');
  });
  const durations = list.map((s) => integer(s && s.duration) && s.duration >= 1 ? s.duration : null); const sum = durations.every((v) => v !== null) ? durations.reduce((a, b) => a + b, 0) : null; let plan = null;
  if (integer(target) && target > 0 && sum !== null && list.length > 0 && sum !== target) {
    add(issues, 'high', 'duration', -1, `时长不匹配: 镜头之和 ${sum}s ≠ 目标 ${target}s（差 ${target - sum}s）`);
    if (target < list.length) add(issues, 'high', 'duration', -1, `目标时长不可行：至少需要 ${list.length}s，当前目标为 ${target}s`);
    else {
      const next = durations.slice(); let remaining = target - sum;
      if (remaining > 0) { for (let i = 0; remaining > 0; i = (i + 1) % next.length, remaining -= 1) next[i] += 1; }
      else {
        remaining = -remaining;
        while (remaining > 0) { const candidates = next.map((v, i) => v > 1 ? i : -1).filter((i) => i >= 0); if (!candidates.length) break; candidates.forEach((i) => { if (remaining > 0) { next[i] -= 1; remaining -= 1; } }); }
      }
      if (remaining === 0) plan = { durations: next, reason: '仅调整 duration 与 time_range' };
    }
  }
  if (!plan && integer(target) && target >= list.length && sum !== null && sum === target) plan = { durations: durations.slice(), reason: '仅重算 time_range' };
  let cursor = 0;
  list.forEach((shot) => {
    const range = parseRange(shot.time_range);
    if (!range) { add(issues, 'high', 'time_range', shot.shot_id, 'time_range 必须是非负整数秒 M:SS-M:SS'); return; }
    if (range.start !== cursor) add(issues, 'high', 'time_range', shot.shot_id, `time_range 不连续：应从 ${fmtTime(cursor)} 开始`);
    if (integer(shot.duration) && range.end - range.start !== shot.duration) add(issues, 'high', 'time_range', shot.shot_id, 'time_range 区间长度必须等于 duration');
    cursor = range.end;
  });
  if (integer(target) && list.length && cursor !== target) add(issues, 'high', 'time_range', -1, `时间轴结束应为 ${fmtTime(target)}，实际为 ${fmtTime(cursor)}`);
  const derived = { characters: new Set(), scenes: new Set(), props: new Set() };
  list.forEach((shot) => { (Array.isArray(shot.characters) ? shot.characters : []).forEach((x) => derived.characters.add(x)); if (shot.scene !== undefined) derived.scenes.add(shot.scene); (Array.isArray(shot.props) ? shot.props : []).forEach((x) => derived.props.add(x)); });
  const internalAssets = root.assets && typeof root.assets === 'object' ? root.assets : null;
  const outerAssets = data && data !== root && data.assets && typeof data.assets === 'object' ? data.assets : null;
  if (internalAssets && outerAssets && JSON.stringify(internalAssets) !== JSON.stringify(outerAssets)) add(issues, 'high', 'assets', -1, '包裹对象内外 assets 冲突，无法安全判断');
  const assets = internalAssets || outerAssets || {};
  ['characters', 'scenes', 'props'].forEach((cat) => {
    const entries = Array.isArray(assets[cat]) ? assets[cat] : []; const declared = new Set();
    entries.forEach((entry) => { const id = entry && entry.id; if (declared.has(id)) add(issues, 'high', 'assets', -1, `资产重复: ${cat}「${id}」`); declared.add(id); });
    derived[cat].forEach((id) => { if (!declared.has(id)) add(issues, 'high', 'assets', -1, `资产遗漏: ${cat}「${id}」在镜头中使用但未登记`); });
    declared.forEach((id) => { if (!derived[cat].has(id)) add(issues, 'medium', 'assets', -1, `资产多余: ${cat}「${id}」未被镜头使用`); });
  });
  const coverage = Array.isArray(root.coverage) ? root.coverage : []; const statuses = new Set(['covered', 'omitted_with_reason', 'nonvisual_context', 'intentional_repeat']);
  if (!Array.isArray(root.coverage) || root.coverage.length === 0) add(issues, 'high', 'coverage', -1, 'coverage 必须是非空数组');
  coverage.forEach((entry) => {
    const status = entry && entry.status; const shotIds = entry && Array.isArray(entry.shot_ids) ? entry.shot_ids : []; const reason = entry && typeof entry.reason === 'string' && entry.reason.trim() !== '';
    if (!statuses.has(status)) add(issues, 'high', 'coverage', -1, `未知 coverage 状态: ${status}`);
    if (status === 'nonvisual_context') { if (!reason) add(issues, 'high', 'coverage', -1, 'nonvisual_context 必须提供非空 reason'); }
    else if (status === 'omitted_with_reason') { if (!reason) add(issues, 'high', 'coverage', -1, 'omitted_with_reason 必须提供非空 reason'); }
    else { if (!shotIds.length) add(issues, 'high', 'coverage', -1, `${status} 必须引用至少一个镜头`); if (status === 'intentional_repeat' && !reason) add(issues, 'high', 'coverage', -1, 'intentional_repeat 必须提供非空 reason'); }
    shotIds.forEach((id) => { if (!ids.has(id)) add(issues, 'high', 'coverage', -1, `覆盖率引用越界: 镜头 ${id} 不存在`); });
  });
  if (scriptText !== null) {
    const source = normalizeText(scriptText);
    list.forEach((shot) => {
      if (typeof shot.dialogue !== 'string' || shot.dialogue === '') return;
      const body = shot.dialogue.replace(/^.*?[:：]/u, '').replace(/^（.*?）/u, ''); const clean = normalizeText(body); const speaker = String(shot.speaker || ''); const narrator = speaker.includes('旁白') || speaker.includes('narrator') || shot.type === 'narrator'; const system = speaker.includes('系统') || shot.type === 'system'; const short = clean.length < 8; const matched = clean && source.includes(clean); const approximate = !short && (source.includes(clean.slice(0, 10)) || source.includes(clean.slice(-10)));
      if (!matched && !(approximate && !system)) add(issues, 'medium', '近似文本一致性检查', shot.shot_id, short ? '短文本无法确认' : narrator ? '旁白无法确认' : '近似文本无法确认');
    });
  }
  return { root, issues, shots: list, target, plan };
}
function canApply(result) { return result.plan && !result.issues.some((issue) => issue.severity === 'high' && issue.field !== 'duration' && issue.field !== 'time_range'); }
function writeAtomic(file, original, updated, backup) {
  const dir = path.dirname(file); const temp = path.join(dir, `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`); const backupFile = backup ? `${file}.bak` : null;
  try { fs.writeFileSync(temp, updated); if (process.env.STORYBOARD_TEST_FORCE_RENAME_FAILURE === '1') throw new Error('测试强制原子替换失败'); if (backupFile) fs.writeFileSync(backupFile, original); fs.renameSync(temp, file); return { backupFile }; }
  catch (error) { try { if (fs.existsSync(temp)) fs.unlinkSync(temp); } catch (_) {} throw error; }
}
function main() {
  let options; try { options = parseArgs(process.argv.slice(2)); } catch (error) { usage(); console.error(`错误: ${error.message}`); process.exitCode = 2; return; }
  let original; try { original = fs.readFileSync(options.file); } catch (error) { console.error(`错误: 无法读取文件: ${error.message}`); process.exitCode = 1; return; }
  let data; try { data = JSON.parse(original.toString('utf8')); } catch (error) { console.error(`错误: 无法解析 JSON: ${error.message}`); process.exitCode = 1; return; }
  let scriptText = null; if (options.script) { try { scriptText = fs.readFileSync(options.script, 'utf8'); } catch (error) { console.error(`错误: 无法读取原文: ${error.message}`); process.exitCode = 1; return; } }
  let result = validate(data, scriptText); let fixApplied = false; let backupFile = null;
  const report = () => ({ verdict: result.issues.some((x) => x.severity === 'high') ? 'FAIL' : 'PASS', issues: result.issues, summary: `共 ${result.shots.length} 镜 / ${Array.isArray(result.root && result.root.coverage) ? result.root.coverage.length : 0} 节拍 / ${result.issues.length} 问题`, fix_plan: options.dryRun ? result.plan : undefined, fix_applied: fixApplied, backup: backupFile });
  if (options.dryRun) { const output = report(); console.log(JSON.stringify(output, null, 2)); process.exitCode = output.verdict === 'PASS' ? 0 : 1; return; }
  if (options.fix && canApply(result)) {
    const copy = JSON.parse(JSON.stringify(data)); const root = container(copy); result.plan.durations.forEach((duration, index) => { root.shots[index].duration = duration; }); let cursor = 0; root.shots.forEach((shot) => { shot.time_range = `${fmtTime(cursor)}-${fmtTime(cursor + shot.duration)}`; cursor += shot.duration; });
    try { const written = Buffer.from(JSON.stringify(copy, null, 2) + '\n', 'utf8'); const atomic = writeAtomic(options.file, original, written, options.backup); backupFile = atomic.backupFile; data = copy; result = validate(data, scriptText); fixApplied = true; }
    catch (error) { console.error(`错误: 原子写回失败，原文件保持不变: ${error.message}`); process.exitCode = 1; return; }
  }
  const output = report(); console.log(JSON.stringify(output, null, 2)); process.exitCode = output.verdict === 'PASS' ? 0 : 1;
}
main();
