#!/usr/bin/env node
// validate_character_card.cjs — 角色卡 v3 精确契约校验
const fs = require('fs');
const payload = require('./validate_prompt_payload.cjs');
const file = process.argv[2];
const expectedArg = process.argv[3] || '1,2,3,4';
const expected = expectedArg.split(/[,，→\s]+/).filter(Boolean).map(Number);
if (!file) { console.error('用法: node validate_character_card.cjs <角色卡.md> [expected-parts]'); process.exit(2); }
if (!expected.length || expected.some(n => ![1,2,3,4].includes(n)) || new Set(expected).size !== expected.length) {
  console.error('FAIL expected-parts：必须是 1,2,3,4 的不重复序列'); process.exit(2);
}
let s; try { s = fs.readFileSync(file, 'utf8'); } catch (e) { console.error('无法读取:', e.message); process.exit(1); }
const issues = [];
if (/执行档位：|快速资格：|模式豁免：|已省略：Part\s*[234]/.test(s)) issues.push('FAIL 角色卡：不得包含执行档位、资格、豁免或省略控制字段');
const ms = [...s.matchAll(/^##\s+Part\s+([1-4])[^\n]*(?:\r?\n|$)/gmi)];
const parts = new Map(ms.map((m, i) => [+m[1], s.slice(m.index + m[0].length, i + 1 < ms.length ? ms[i + 1].index : s.length)]));
if (ms.map(m => +m[1]).join(',') !== expected.join(',')) issues.push(`FAIL Part 顺序或数量：应为 ${expected.join('→')}`);
const schemas = {
  1: ['参考图映射','一致性铁律','图片对齐','生成规格','技能0·角色人设','技能1·画幅与题材锚定','技能2·景别与机位·身份体型姿态','技能3·背景','技能4·长相与气质','技能5·发型','技能6·服装槽位','技能7·面料质感','技能8·姿态与状态','技能9·布光与质感','技能10·反向词','限制'],
  2: ['参考图映射','一致性铁律','图片对齐','生成规格','技能0·角色人设','视角布局','受控派生','限制'],
  3: ['参考图映射','一致性铁律','图片对齐','生成规格','技能0·角色人设','六格布局','情绪映射','受控派生','限制'],
  4: ['参考图映射','一致性铁律','图片对齐','生成规格','技能0·角色人设','穿戴物清单','宫格布局','受控派生','限制']
};
function strictPart(n, body) {
  const fields = schemas[n]; if (!fields) { issues.push(`FAIL Part${n}：不允许的 Part`); return; }
  const hs = body.split(/\r?\n/).map(x => x.trim()).filter(Boolean).filter(x => /^[^：\n]+：/.test(x)).map(x => x.slice(0,x.indexOf('：')).replace(/（强制）$/,''));
  for (const f of fields) if (hs.filter(x => x === f).length !== 1) issues.push(`FAIL Part${n}：字段「${f}」必须恰好出现一次`);
  for (const h of hs) if (!fields.includes(h)) issues.push(`FAIL Part${n}：禁止额外字段「${h}」`);
  const ix = fields.map(f => hs.indexOf(f)); if (ix.some(i => i < 0) || ix.some((v,i) => i && v <= ix[i-1])) issues.push(`FAIL Part${n}：字段顺序错误或字段合并`);
  const spec = body.match(/^生成规格：(.+)$/m)?.[1] || '';
  const wanted = {1:'9:16竖版 2K',2:'3:4竖版 2K 2行×3列六格',3:'16:9横版 2K 2行×3列六格'}[n];
  if (wanted && spec !== wanted) issues.push(`FAIL Part${n}：固定画幅/分辨率错误`);
  if (n === 4 && !/^4:3横版 2K\s+\d+行×\d+列\d+格$/.test(spec)) issues.push('FAIL Part4：固定画幅/分辨率错误');
  if (n > 1 && !/Part\s*1|Picture 1|角色1/.test(body)) issues.push(`FAIL Part${n}：必须引用 Part1 唯一事实源`);
  if (n === 2) {
    const layout = body.match(/^视角布局：(.+)$/m)?.[1] || '';
    const limit = body.match(/^限制：(.+)$/m)?.[1] || '';
    const required = [
      ['六格网格', /2行[×x]3列六格/],
      ['上排三角度', /上排[^；。]*头颈正面[^；。]*头颈左侧45°[^；。]*头颈右侧90°/],
      ['下排三角度', /下排[^；。]*锁骨至鞋履正面[^；。]*锁骨至鞋履左侧45°[^；。]*锁骨至鞋履右侧90°/],
      ['高度比例', /上排约35%[^；。]*下排约65%/],
      ['列对齐', /三列等宽[^；。]*上下列严格对齐/],
      ['下排上缘与连续范围', /锁骨和双肩作为画面上缘[^；。]*躯干[^；。]*双臂[^；。]*腰胯[^；。]*腿部至鞋履/],
      ['下排头颈排除', /头部、面部、头发、耳朵、颈部不进入下排/],
    ];
    for (const [label, pattern] of required) if (!pattern.test(layout)) issues.push(`FAIL Part2：缺少${label}强约束`);
    if (/裁切|横截面|切口|截断|背面|全身三视图|完整全身/.test(layout)) issues.push('FAIL Part2：视角布局不得出现裁切/解剖切面/背面/全身三视图');
    // 只审查视角布局与受控派生的正向语义；参考图映射可合法包含“Part1全身定妆照”，限制字段可合法写禁止句。
    const derived = body.match(/^受控派生：(.+)$/m)?.[1] || '';
    for (const field of [layout, derived]) {
      const positive = field.replace(/禁止[^；。]*|不得[^；。]*|不进入[^；。]*/g, '');
      if (/背面视角|全身图|全身视图|全身像|全身三视图|完整人物/.test(positive)) issues.push('FAIL Part2：禁止正向要求背面视角或全身三视图');
    }
    if (!/禁止背面视角/.test(limit) || !/完整人物全身图和全身三视图|不得成为完整人物全身图|不得成为全身三视图/.test(limit)) issues.push('FAIL Part2：限制必须禁止背面及下排全身图');
    if (!/重生成下排三格/.test(limit) || !/上下排分两张生成后拼版/.test(limit) || !/局部重绘下排/.test(limit)) issues.push('FAIL Part2：必须完整列出三条允许的失败降级路径');
  }
  if (n === 3 && !/2行×3列六格|2行x3列六格|六格/.test(body)) issues.push('FAIL Part3：缺少六格峰值表情布局');
  if (n === 3 && /(?:｜|\|)证据[“\"]|有证据的表情/.test(body)) issues.push('FAIL Part3：不得暴露证据来源或内部选择机制');
  if (n === 4) {
    const list = body.match(/^穿戴物清单：共(\d+)件；(.+)$/m), layout = body.match(/^宫格布局：(.+)$/m), layoutText = layout?.[0] || '';
    if (!list || !layout) issues.push('FAIL Part4：宫格/分页规则缺失');
    else {
      const count = +list[1], entries = [...list[2].matchAll(/(?:^|；)(\d+)=/g)].map(m => +m[1]);
      if (entries.length !== count || entries.some((v,i) => v !== i+1)) issues.push('FAIL Part4：穿戴物编号必须连续且与共N件一致');
      const pages = layoutText.match(/^宫格布局：共(\d+)页；(.+)$/m);
      const pageRows = pages ? [...pages[2].matchAll(/第(\d+)页=(\d+)行×(\d+)列(\d+)格（(\d+)-(\d+)）/g)] : [];
      const expectedPages = Math.max(1, Math.ceil(count / 6));
      if (!pages || +pages[1] !== expectedPages || pageRows.length !== expectedPages) issues.push('FAIL Part4：总页数或分页布局错误');
      let next = 1;
      for (const [i, m] of pageRows.entries()) {
        const page = +m[1], rows = +m[2], cols = +m[3], cells = +m[4], first = +m[5], last = +m[6];
        const pageCount = last - first + 1;
        const expectedCells = pageCount === 1 ? '1,1,1' : pageCount === 2 ? '1,2,2' : pageCount <= 4 ? '2,2,4' : '2,3,6';
        if (page !== i + 1 || first !== next || last < first || last > count || pageCount > 6 || `${rows},${cols},${cells}` !== expectedCells || cells !== rows * cols) issues.push(`FAIL Part4：第${page}页编号范围或网格错误`);
        next = last + 1;
      }
      if (next !== count + 1 || !/按原顺序，每页最多6格/.test(layoutText)) issues.push('FAIL Part4：分页未覆盖全部物件或缺少顺序约束');
      const first = pageRows[0];
      if (first) {
        const firstSpec = `${first[2]}行×${first[3]}列${first[4]}格`;
        if (!spec.endsWith(firstSpec)) issues.push('FAIL Part4：生成规格必须与第1页布局一致');
      }
    }
  }
  if (n === 1 && /^技能10·反向词：.*(?:裸露|私密部位|裸体|性器官)/m.test(body)) issues.push('FAIL Part1：不得自动加入直接性/解剖敏感词');
}
// 新生产卡默认必须严格；仅对明确的旧最小 fixture 保留兼容。旧 3:4 不能绕过契约。
const strict = /^(?:参考图映射|图片对齐)：/m.test(s) || /生成规格：(?:9:16|4:3|16:9)/m.test(s) || /3:4/.test(s);
if (strict) expected.forEach(n => strictPart(n, parts.get(n) || ''));
else expected.forEach(n => { const b=parts.get(n)||''; if (!b) issues.push(`FAIL Part${n}：缺失`); else { if (!/技能0/.test(b)) issues.push(`FAIL Part${n}：缺少本 Part 的技能0`); if (!/一致性铁律/.test(b)) issues.push(`FAIL Part${n}：缺少本 Part 的一致性铁律`); } });
if (/##\s+Part\s+3/.test(s) && !/(6\s*格|六格|2行\s*[×x*]\s*3列)/i.test(s)) issues.push('FAIL Part3：缺少六格峰值表情布局');
const payloadResult = payload.validate(s, 'character');
for (const issue of payloadResult.issues) issues.push(`FAIL 提示词预算/安全：${issue}`);
const positive = s.split(/\r?\n/).filter(x => /背景/.test(x) && !/负面|禁止|反向|不要|不得/.test(x)).join('\n');
for (const w of ['森林','山水','城市','庭院','宫殿','场景背景']) if (positive.includes(w)) issues.push(`FAIL 背景正向段含场景词「${w}」`);
if (!/纯色/.test(positive)) issues.push('FAIL 背景正向段缺少纯色约束');
if (issues.length) { console.log(`FAIL: ${file}\n`+issues.join('\n')); process.exit(1); }
console.log(`PASS: ${file}（v3固定字段/受控派生/固定画幅全合格）`);
