const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const validator = path.join(root, 'skills/shared/scripts/validate_character_card.cjs');
function run(file, parts) { const args = [validator, path.join(__dirname, 'fixtures/character', file)]; if (parts) args.push(parts); return spawnSync(process.execPath, args, { encoding: 'utf8' }); }
for (const name of ['pass-vnext-main.md']) { const r = run(name); if (r.status !== 0) throw new Error(`${name} should pass\n${r.stdout}${r.stderr}`); }
const expected = [['fail-vnext-main-part3.md','Part 顺序或数量'],['fail-vnext-performance-numbered.md','不得使用 Part 编号'],['fail-vnext-performance-grid.md','唯一且完整'],['fail-vnext-wearables-grid.md','规格或格数错误'],['fail-vnext-wearables-pagination.md','规格或格数错误']];
for (const [name, fragment] of expected) { const r = run(name, name.includes('performance') ? '--optional=performance' : name.includes('wearables') ? '--optional=wearables' : undefined); if (r.status === 0 || !r.stdout.includes(fragment)) throw new Error(`${name} must fail with ${fragment}\n${r.stdout}`); }
const argCheck = run('pass-vnext-main.md', '1,3'); if (argCheck.status === 0 || !(argCheck.stdout + argCheck.stderr).includes('主卡必须严格')) throw new Error('旧 expected-parts 序列必须拒绝');
// Part2 强合同反例：基于完整通过样本逐项破坏，避免其他 Part 的错误造成假覆盖。
const basePart2 = fs.readFileSync(path.join(__dirname, 'fixtures/character/pass-vnext-main.md'), 'utf8');
const part2Cases = [
  ['旧4:3规格', s => s.replace('生成规格：3:4竖版 2K 2行×3列六格', '生成规格：4:3横版 2K 2行×3列六格'), '固定画幅/分辨率错误'],
  ['弱布局摘要', s => s.replace(/^视角布局：.*$/m, '视角布局：上区头颈视图；下区锁骨至鞋履视图；下区不重复上区内容'), '缺少六格网格强约束'],
  ['缺下排右90', s => s.replace('锁骨至鞋履右侧90°', '锁骨至鞋履侧面'), '缺少下排三角度强约束'],
  ['正向背面视角', s => s.replace('受控派生：仅继承 Part 1', '受控派生：生成背面视角并仅继承 Part 1'), '禁止正向要求背面视角'],
  ['受控派生正向全身图', s => s.replace('受控派生：仅继承 Part 1', '受控派生：要求下排生成完整人物全身图并仅继承 Part 1'), '禁止正向要求背面视角或全身三视图'],
  ['下排全身图弱写法', s => s.replace('受控派生：仅继承 Part 1', '受控派生：下排生成全身图，仅继承 Part 1'), '禁止正向要求背面视角或全身三视图'],
  ['下排完整人物', s => s.replace('视角布局：', '视角布局：下排显示完整人物；'), '禁止正向要求背面视角或全身三视图'],
  ['缺上缘连续范围', s => s.replace(/锁骨和双肩作为画面上缘，连续呈现躯干、双臂、腰胯、腿部至鞋履；/, ''), '缺少下排上缘与连续范围强约束'],
  ['缺头颈排除', s => s.replace('；头部、面部、头发、耳朵、颈部不进入下排', ''), '缺少下排头颈排除强约束'],
  ['缺降级路径', s => s.replace(/；失败时只能重生成下排三格、上下排分两张生成后拼版或局部重绘下排/, ''), '必须完整列出三条允许的失败降级路径'],
];
const part2Dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'character-part2-contract-'));
for (const [name, mutate, fragment] of part2Cases) {
  const target = path.join(part2Dir, `${name}.md`); fs.writeFileSync(target, mutate(basePart2));
  const r = spawnSync(process.execPath, [validator, target, '1,2'], {encoding:'utf8'});
  if (r.status === 0 || !r.stdout.includes(fragment)) throw new Error(`Part2反例必须失败：${name} / ${fragment}\n${r.stdout}`);
}
console.log('PASS: character validator fixtures');
const wearableBase = fs.readFileSync(path.join(__dirname, 'fixtures/character/pass-vnext-wearables.md'), 'utf8');
for (const badShape of ['1行×4列4格','1行×6列6格']) {
  const polluted = path.join(fs.mkdtempSync(path.join(require('os').tmpdir(), 'wearable-shape-')), 'bad.md');
  fs.writeFileSync(polluted, wearableBase.replace('2行×2列4格', badShape));
  const r = spawnSync(process.execPath, [validator, polluted, '--optional=wearables'], {encoding:'utf8'});
  if (r.status === 0) throw new Error(`禁止伪造网格必须失败：${badShape}`);
}
