const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '../..');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/four-blocks-contract.json'), 'utf8'));
assert.deepStrictEqual(fixture.visible, ['01-角色提示词','02-场景提示词','03-分镜提示词.md','04-视频提示词.txt']);
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const entry = read('skills/movie-create-entry/SKILL.md');
const script = read('skills/movie-create-drama-script/SKILL.md');
const out = read('skills/movie-create-out-video-director/SKILL.md');
const seedance = read('skills/movie-create-out-video-director/references/seedance-output-spec.md');
const h3 = read('skills/movie-create-out-video-director/references/h3-output-spec.md');
assert(seedance.indexOf('映射声明首段') < seedance.indexOf('六段式'), 'Seedance mapping precedes six fields');
assert(h3.indexOf('第一行图片对齐指令') < h3.indexOf('映射声明') && h3.includes('H3 六字段'), 'H3 alignment precedes mapping and fields');
assert(out.includes('seedance-output-spec.md') && out.includes('h3-output-spec.md'), 'OUT references selected model specs');
const negative = read('skills/shared/negative-block.md');
assert(negative.includes('剧情明确要求的招牌、UI、楼层号、协议编号、信件等文字必须逐字保留'), 'story text exception is explicit');
const requiredTextFixture = fs.readFileSync(path.join(__dirname, 'fixtures/visible-text-required.md'), 'utf8');
assert(requiredTextFixture.includes('"今日营业"') && requiredTextFixture.includes('第 0.8 秒') && requiredTextFixture.includes('淡入'), '剧情文字 fixture preserves exact text, timing and presentation');
assert(!/不要文字|不要字幕/.test(requiredTextFixture), '剧情文字 fixture has no conflicting blanket negative');
const absentTextFixture = fs.readFileSync(path.join(__dirname, 'fixtures/visible-text-not-required.md'), 'utf8');
for (const term of ['无关文字', '乱码', '水印', '外加字幕条']) assert(absentTextFixture.includes(term), `无剧情文字 fixture 缺少防护: ${term}`);
assert(fixture.visible.every(x => entry.includes(x)), 'entry must expose four visible blocks');
assert(fixture.internal.every(x => entry.includes(x)), 'entry must expose internal paths');
for (const bad of fixture.forbidden) assert(!entry.includes(bad), `entry leaks ${bad}`);
assert(script.includes('03-分镜提示词.md') && script.includes('唯一分镜块'), 'script owns storyboard prompt block');
assert(!read('skills/movie-create-design-character/SKILL.md').includes('快速条件：已满足'), 'character Skill does not advertise legacy quick marker');
const forbiddenField = ['reference', '_image'].join('');
assert(!script.includes(forbiddenField), 'script must not leak model-specific image fields');
assert(out.includes('04-视频提示词.txt') && out.includes('.movie-create/storyboard.json'), 'out uses V3 paths');
assert(out.includes('dialogue') && out.includes('speaker'), 'out embeds dialogue parameters');
for (const token of ['<Picture N>', '<图片N>', '<视频N>', '<音频N>', '严格编辑<视频N>', '延长<视频N>', 'integrated_multimodal_description', 'subject_definitions', '<scenetrans>', '<cutoff>']) {
  assert(!out.includes(token), `OUT 主文件不得包含模型专属 token: ${token}`);
}
assert(seedance.includes('六段式') && seedance.includes('编辑') && seedance.includes('延长') && seedance.includes('组合') && seedance.includes('Seedance QA'), 'Seedance reference is complete');
assert(h3.includes('T2VA') && h3.includes('I2VA') && h3.includes('FL2VA') && h3.includes('L2VA') && h3.includes('Ref2VA') && h3.includes('<scenetrans>') && h3.includes('<cutoff>') && h3.includes('H3 QA'), 'H3 reference is complete');
assert(/OUT 只消费[\s\S]*04-视频提示词\.txt/.test(out), 'OUT responsibility must resolve to the video block');
assert(/唯一分镜块[\s\S]*明确请求时[\s\S]*八宫格/.test(script), 'optional grid responsibility must remain in script block');
const actualRoot = path.join(__dirname, 'fixtures/actual-project');
const actualVisible = fs.readdirSync(actualRoot).filter(name => !name.startsWith('.'));
assert.deepStrictEqual(actualVisible.sort(), ['01-角色提示词','02-场景提示词','03-分镜提示词.md','04-视频提示词.txt'].sort(), 'actual fixture root must contain only four blocks');
const actualStoryboard = JSON.parse(fs.readFileSync(path.join(actualRoot, '.movie-create/storyboard.json'), 'utf8'));
const actualVoice = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/calls/voice-directives.json'), 'utf8'));
assert(!fs.existsSync(path.join(actualRoot, '.movie-create/voice-directives.json')), 'actual project must not contain voice directive sidecar');
assert.strictEqual(actualStoryboard.shots.length, 2, 'actual fixture storyboard has dialogue and environment shot');
assert.deepStrictEqual(actualStoryboard.shots[0].characters, ['林','周'], 'dialogue shot has two character assets');
assert(actualStoryboard.shots[0].ref_anchors.includes('林') && actualStoryboard.shots[0].ref_anchors.includes('周'), 'two-person shot has reference anchors');
assert(fs.existsSync(path.join(actualRoot, '01-角色提示词/林.md')) && fs.existsSync(path.join(actualRoot, '01-角色提示词/周.md')), 'both character cards exist');
assert.strictEqual(actualStoryboard.shots[0].speaker, '林', 'dialogue shot has one frozen speaker');
assert.strictEqual(actualVoice[0].dialogue, actualStoryboard.shots[0].dialogue, 'voice dialogue matches frozen text');
assert.strictEqual(actualVoice[0].speaker, actualStoryboard.shots[0].speaker, 'voice speaker matches shot speaker');
assert(actualVoice[0].speed && actualVoice[0].volume && actualVoice[0].timbre && actualVoice[0].duration, 'voice directive has calculated parameters');
assert(!actualVoice.some(d => d.shot_id === 'S01-02'), 'pure environment shot has no voice directive');
assert.strictEqual(actualStoryboard.shots[1].characters.length, 0, 'pure environment shot has no characters');
assert.strictEqual(actualStoryboard.shots[1].mood, '', 'pure environment shot has no mood');
const forbiddenVoiceField = ['voice', '_directive'].join('');
assert(!(forbiddenVoiceField in actualStoryboard.shots[0]) && !(forbiddenVoiceField in actualStoryboard.shots[1]), 'storyboard schema has no voice directive field');
assert(!fs.existsSync(path.join(actualRoot, '03-分镜.json')), 'actual fixture has no legacy storyboard output');
const actualFiles = [path.join(actualRoot, '01-角色提示词/林.md'), path.join(actualRoot, '02-场景提示词/室内.md'), path.join(actualRoot, '03-分镜提示词.md'), path.join(actualRoot, '04-视频提示词.txt')];
const actualTexts = actualFiles.map(file => fs.readFileSync(file, 'utf8'));
assert(actualTexts[3].includes('<Picture 1>'), 'only video block contains model reference tag');
assert(actualTexts.slice(0, 3).every(text => !text.includes('<Picture 1>')), 'non-video blocks stay model neutral');
const visibleReaction = '目光锁定门把手、指节收紧、呼吸短促';
assert(actualTexts[0].includes('六格') && actualTexts[0].includes('起势、峰值、余波'), 'character fixture has six evidence frames');
assert(actualStoryboard.shots[0].mood === '恐惧·中度' && actualStoryboard.shots[0].action.includes('抓住门把手'), 'storyboard carries frozen mood/action');
assert(actualTexts[2].includes(visibleReaction), '03 carries visible reaction from character evidence');
assert(actualTexts[3].includes(visibleReaction), '04 compiles the same visible reaction');
assert(actualTexts[2].includes('周侧耳倾听') && actualTexts[3].includes('倾听者反应：周侧耳倾听'), 'listener reaction is visible in 03 and 04');
const voiceSource = [
  {shot_id:'S02-01', speaker:'林', dialogue:'第一句'},
  {shot_id:'S02-02', speaker:'林', dialogue:'第二句'},
  {shot_id:'S02-03', speaker:'', dialogue:''}
];
const voiceDirectives = voiceSource.filter(shot => shot.dialogue).map(shot => ({shot_id:shot.shot_id, speaker:shot.speaker, dialogue:shot.dialogue}));
assert.strictEqual(voiceDirectives.length, 2, '相邻同 speaker 必须保持两条 directive');
assert.deepStrictEqual(voiceDirectives.map(x => x.shot_id), ['S02-01','S02-02'], 'directive 不跨镜合并');
assert(!voiceDirectives.some(x => x.shot_id === 'S02-03'), '空 dialogue 不生成 directive');
assert(!voiceDirectives.some(x => x.speaker !== voiceSource.find(s => s.shot_id === x.shot_id).speaker), 'speaker 错误必须可检测');
assert(!voiceDirectives.some(x => x.dialogue !== voiceSource.find(s => s.shot_id === x.shot_id).dialogue), 'dialogue 改写必须可检测');
const validateVoice = directives => directives.forEach(d => {
  const shot = voiceSource.find(s => s.shot_id === d.shot_id);
  if (!shot || d.speaker !== shot.speaker || d.dialogue !== shot.dialogue) throw new Error('voice directive 与冻结 shot 不一致');
});
assert.throws(() => validateVoice([{shot_id:'S02-01',speaker:'错人',dialogue:'第一句'}]), /不一致/, 'speaker 错误必须停止');
assert.throws(() => validateVoice([{shot_id:'S02-01',speaker:'林',dialogue:'被改写'}]), /不一致/, 'dialogue 改写必须停止');
console.log('静态产物 fixture测试PASS：四块根级、storyboard、voice directives 与纯环境镜通过');
const variants = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/static-variants.json'), 'utf8'));
for (const variant of variants) {
  assert.deepStrictEqual(variant.blocks, fixture.visible, `${variant.name}: four visible blocks`);
  assert(variant.meta && Object.prototype.hasOwnProperty.call(variant.meta, 'style_source'), `${variant.name}: style metadata present`);
  for (const forbidden of variant.forbidden) assert(!variant.scene.includes(forbidden), `${variant.name}: conflict-free style contract`);
  for (const [block, sample] of Object.entries(variant.block_samples)) assert(sample.includes(block.startsWith('01') ? '角色' : block.startsWith('02') ? '场景' : block.startsWith('03') ? '分镜' : '视频'), `${variant.name}: ${block} block sample`);
  if (variant.name === '恐怖高饱和竖屏') assert(variant.scene.includes('9:16') && !variant.scene.includes('4:3'), '9:16 variant excludes default 4:3');
  console.log(`静态产物 fixture测试PASS：${variant.name}`);
}

const scenarios = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/v3-contract-scenarios.json'), 'utf8'));
for (const scenario of scenarios) {
  const text = scenario.type === 'route' ? entry : read(scenario.file);
  if (scenario.type === 'negative-absent') assert(!text.includes(scenario.expect), `${scenario.name}: forbidden text present`);
  else if (scenario.type === 'doc-all') for (const expected of scenario.expect) assert(text.includes(expected), `${scenario.name}: missing ${expected}`);
  else assert(text.includes(scenario.expect), `${scenario.name}: expected contract absent`);
  console.log(`PASS 契约场景：${scenario.name}`);
}
console.log(`文档契约测试PASS：${scenarios.length} 个契约场景（非真实生成实测）`);
