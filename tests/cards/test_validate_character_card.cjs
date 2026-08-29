const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const validator = path.join(root, 'skills/shared/scripts/validate_character_card.cjs');
function run(file, parts) { return spawnSync(process.execPath, [validator, path.join(__dirname, 'fixtures/character', file), parts], { encoding: 'utf8' }); }
for (const name of ['pass.md', 'pass-v3.md', 'pass-v3-sensitive-fact.md', 'pass-v3-part4-three.md', 'pass-v3-part4-seven.md']) { const r = run(name, '1,2,3,4'); if (r.status !== 0) throw new Error(`${name} should pass\n${r.stdout}${r.stderr}`); }
for (const [name, parts] of [['exempt-part4.md','1,2,3'],['exempt-part2-part3.md','1,4'],['pass-fast.md','1,3']]) { const r = run(name, parts); if (r.status !== 0) throw new Error(`${name} should pass with ${parts}\n${r.stdout}${r.stderr}`); }
const expected = [['fail.md','背景正向段'],['fail-order.md','顺序或数量'],['fail-background.md','背景正向段'],['fail-skill0.md','技能0'],['fail-part3-grid.md','六格'],['fail-v3-merged-field.md','字段顺序错误或字段合并'],['fail-v3-extra-field.md','禁止额外字段'],['fail-v3-old-part2.md','固定画幅/分辨率错误'],['fail-v3-wrong-aspect.md','固定画幅/分辨率错误'],['fail-v3-part4-grid.md','第1页编号范围或网格错误'],['fail-v3-part4-pagination.md','分页'],['fail-v3-sensitive.md','直接性/解剖敏感词']];
for (const [name, fragment] of expected) { const r = run(name, '1,2,3,4'); if (r.status === 0 || !r.stdout.includes(fragment)) throw new Error(`${name} must fail with ${fragment}\n${r.stdout}`); }
const argCheck = run('pass.md', '1,3'); if (argCheck.status === 0 || !argCheck.stdout.includes('顺序或数量')) throw new Error('expected-parts 参数必须控制 Part 合同');
const hygieneDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'character-card-hygiene-'));
const clean = fs.readFileSync(path.join(__dirname, 'fixtures/character/pass-v3.md'), 'utf8');
for (const marker of ['｜证据“原文”', '只改变上述有证据的表情']) {
  const polluted = path.join(hygieneDir, `${marker.length}.md`); fs.writeFileSync(polluted, clean.replace('情绪映射：', `情绪映射：${marker}；`));
  const r = spawnSync(process.execPath, [validator, polluted, '1,2,3,4'], {encoding:'utf8'});
  if (r.status === 0 || !r.stdout.includes('Part3')) throw new Error(`Part3 控制说明必须失败：${marker}`);
}
console.log('PASS: character validator fixtures');
