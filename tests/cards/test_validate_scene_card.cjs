const { spawnSync } = require('child_process');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const validator = path.join(root, 'skills/shared/scripts/validate_scene_card.cjs');
function run(file) { return spawnSync(process.execPath, [validator, path.join(__dirname, 'fixtures/scene', file)], { encoding: 'utf8' }); }
for (const name of ['pass.md','pass-916.md','pass-16-9.md','pass-irrelevant-numbers.md','pass-heading-newline.md']) if (run(name).status !== 0) throw new Error(`${name} should pass`);
const expected = [['fail.md','生成规格'],['fail-hard4.md','硬四段'],['fail-missing-hard4.md','硬四段'],['fail-style.md','风格'],['fail-undeclared-9-16-default.md','生成规格'],['fail-mode2-missing-light.md','正文'],['fail-mode-in-hard4.md','正文'],['fail-light-in-negative.md','正文'],['fail-variation.md','变化线'],['fail-variation-missing-baseline.md','变化线'],['fail-keyword-wrong-block.md','字段位置']];
for (const [name, fragment] of expected) { const r = run(name); if (r.status === 0 || !r.stdout.includes(fragment)) throw new Error(`${name} must fail with ${fragment}\n${r.stdout}`); }
console.log('PASS: scene validator fixtures');
