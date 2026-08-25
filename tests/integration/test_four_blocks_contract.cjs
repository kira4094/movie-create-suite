const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '../..');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/four-blocks-contract.json'), 'utf8'));
assert.deepStrictEqual(fixture.visible, ['01-角色提示词','02-场景提示词','03-分镜提示词.md','04-视频提示词.txt']);
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const entry = read('skills/movie-create-entry/SKILL.md');
const styleTemplate = read('skills/shared/风格定调模板.md');
const registryDoc = read('skills/shared/skill-registry.md');
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
assert(entry.includes('直接模式（默认）') && entry.includes('协作审阅模式'), 'entry defines adaptive execution modes');
assert(entry.includes('真实歧义只提出最小问题') && entry.includes('不重跑无关上游'), 'entry limits questions and downstream recovery');
for (const route of ['路径A：','路径B：','路径C：跳过风格','路径D：自定义风格或题材推荐']) assert(entry.includes(route), `entry style route missing: ${route}`);
for (const doc of [styleTemplate, registryDoc]) {
  assert(!doc.includes('三选一'), 'shared style contract must not retain three-route wording');
  assert(!/路径C[^\n]*(题材推荐|自定义)/.test(doc), 'shared style contract must not assign legacy C semantics');
  for (const route of ['A', 'B', 'C', 'D']) assert(doc.includes(route), `shared style contract missing route ${route}`);
}
assert(styleTemplate.includes('C：跳过风格') && styleTemplate.includes('D：自定义或题材推荐'), 'style template routes aligned');
assert(registryDoc.includes('C=明确跳过风格') && registryDoc.includes('D=自定义或题材推荐'), 'registry routes aligned');
assert(entry.includes('不要生成图片') && entry.includes('只产文字提示词'), 'entry clarifies text-only delivery');
for (const bad of fixture.forbidden) assert(!entry.includes(bad), `entry leaks ${bad}`);
assert(script.includes('03-分镜提示词.md') && script.includes('唯一分镜块'), 'script owns storyboard prompt block');
assert(!read('skills/movie-create-design-character/SKILL.md').includes('快速条件：已满足'), 'character Skill does not advertise legacy quick marker');
const character = read('skills/movie-create-design-character/SKILL.md');
const characterSpec = read('skills/movie-create-design-character/references/character-card-spec.md');
assert(character.includes('Part 矩阵唯一权威') && characterSpec.includes('按模式矩阵输出 Part'), 'character Part matrix is documented');
assert(character.includes('可选扩展三视图') && character.includes('标准 Part2 多视图'), 'Part2 and optional three-view extension are distinct');
assert(/Part\s*3 六格/.test(character) && !/Part\s*3 十格/.test(character) && !characterSpec.includes('2行×5列') && !characterSpec.includes('十情绪表情卡'), 'Part3 fixed six-grid contract has no ten-grid legacy wording');
assert(!character.includes('禁止不提问直接默认') && !character.includes('产出提示词前必须先问清需求'), 'character direct mode has no unconditional pre-question gate');
assert(!read('skills/movie-create-drama-story/SKILL.md').includes('列一版配置让用户确认'), 'story direct mode has no unconditional configuration confirmation gate');
const story = read('skills/movie-create-drama-story/SKILL.md');
const scene = read('skills/movie-create-design-scene/SKILL.md');
assert(story.includes('仅适用于协作审阅模式或信息不全') && story.includes('不得因 10 组选项未逐项选择停下'), 'story question loop is mode-aware');
assert(!story.includes('提问式交互（核心，第一步强制）') && !story.includes('逐项追问未定选项**（每次只问 1 项，按优先级顺序）'), 'story has no unconditional first-step gate');
assert(!story.includes('每集 3 分钟节奏') && story.includes('15–180 秒'), 'story has dynamic duration rhythm, not fixed three-minute rhythm');
assert(scene.includes('直接模式未指定人物时默认空镜且不提问') && scene.includes('用户已明确要求带人物时直接保留带人物且不提问'), 'scene person presence gate is mode-aware');
assert(!scene.includes('生成场景卡前先问清"要不要带人物"'), 'scene has no unconditional person question');
assert(scene.includes('用户已明确要求带人物时直接保留带人物且不提问') && scene.includes('仅镜头需求/资产关系无法判断'), 'scene preserves explicit people branch without re-questioning');
assert(!character.includes('默认写实真人 + 标注「风格可换」'), 'character no longer forces realistic-human fallback');
assert(characterSpec.includes('优先继承入口与 `.movie-create/style-guide.md`') && !characterSpec.includes('美术风格必须先确认'), 'character style source is mode-aware');
assert(read('skills/movie-create-drama-story/SKILL.md').includes('15–30 秒') && read('skills/shared/dramaturgy-planning.md').includes('31–60 秒'), 'short-duration envelopes are synchronized');
const adaptiveScenarios = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/adaptive-mode-scenarios.json'), 'utf8'));
assert.strictEqual(adaptiveScenarios.length, 6, 'adaptive mode fixture covers six required behavior scenarios');
for (const scenario of adaptiveScenarios) {
  assert(['direct', 'collaborative'].includes(scenario.mode), `${scenario.name}: mode declared`);
  assert(Array.isArray(scenario.applicable_skills) && Array.isArray(scenario.forbidden_skills), `${scenario.name}: skill calls declared`);
  for (const forbidden of scenario.forbidden_skills) assert(!scenario.applicable_skills.includes(forbidden), `${scenario.name}: mutually exclusive skill was mechanically co-called: ${forbidden}`);
  assert(Array.isArray(scenario.visible_outputs), `${scenario.name}: visible outputs declared`);
  if (scenario.mode === 'direct' && scenario.input_complete && !scenario.stop_reason) {
    assert.deepStrictEqual(scenario.visible_outputs, fixture.visible, `${scenario.name}: complete direct mode must deliver exactly four blocks`);
    for (const skill of ['movie-create-drama-emotion角色pass', 'movie-create-design-scene-layout', 'movie-create-design-character', 'movie-create-design-scene', 'movie-create-drama-script 3A', 'movie-create-drama-script 3B', 'validate_storyboard', 'movie-create-drama-review PASS', 'movie-create-drama-dialogue voice', 'movie-create-out-video-director']) assert(scenario.applicable_skills.includes(skill), `${scenario.name}: applicable Skill bypassed: ${skill}`);
  }
  if (scenario.name === '带原文改编直接模式') assert(!scenario.applicable_skills.includes('movie-create-drama-story'), 'adaptation must not call story generation');
  if (scenario.name === '改编缺原文只问源材料') {
    assert.strictEqual(scenario.questions.length, 1, 'missing adaptation source asks exactly one question');
    assert.deepStrictEqual(scenario.visible_outputs, [], 'missing source delivers no visible block');
  }
  if (scenario.name === '素材映射冲突暂停') assert(!scenario.visible_outputs.includes('04-视频提示词.txt') && scenario.stop_reason.includes('受影响阶段'), 'mapping conflict pauses before 04');
  if (scenario.mode === 'collaborative') assert(scenario.pause_points && scenario.pause_points.length > 0 && scenario.stop_reason.includes('逐层确认'), `${scenario.name}: collaborative mode retains layer pauses`);
}
console.log('自适应模式行为 fixture测试PASS：6 个场景（静态契约，非 LLM 真实生成实测）');
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
