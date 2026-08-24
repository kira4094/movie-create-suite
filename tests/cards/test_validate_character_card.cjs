const { spawnSync } = require('child_process');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const validator = path.join(root, 'skills/shared/scripts/validate_character_card.cjs');
function run(file) { return spawnSync(process.execPath, [validator, path.join(__dirname, 'fixtures/character', file)], { encoding: 'utf8' }); }
for (const name of ['pass.md', 'exempt-part4.md', 'pass-fast.md']) { const r = run(name); if (r.status !== 0) throw new Error(`${name} should pass\n${r.stdout}${r.stderr}`); }
const expected = [['fail.md','背景正向段'],['fail-order.md','顺序或数量'],['fail-background.md','背景正向段'],['fail-skill0.md','技能0'],['fail-part3-grid.md','六格'],['fail-fast-no-confirm.md','缺少用户明确确认'],['fail-fast-part3.md','Part 顺序或数量'],['fail-standard-part2.md','Part 顺序或数量'],['fail-fast-duration.md','时长超限'],['fail-fast-characters.md','主角超限'],['fail-fast-scenes.md','场景超限'],['fail-fast-model.md','模型未明确'],['fail-fast-aspect.md','比例未明确'],['fail-fast-ambiguity.md','素材绑定歧义必须为无']];
for (const [name, fragment] of expected) { const r = run(name); if (r.status === 0 || !r.stdout.includes(fragment)) throw new Error(`${name} must fail with ${fragment}\n${r.stdout}`); }
console.log('PASS: character validator fixtures');
