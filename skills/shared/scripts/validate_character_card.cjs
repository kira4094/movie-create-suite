#!/usr/bin/env node
// validate_character_card.cjs — 角色卡 v3 精确契约校验
const fs = require('fs');
const file = process.argv[2];
if (!file) { console.error('用法: node validate_character_card.cjs <角色卡.md>'); process.exit(2); }
let s; try { s = fs.readFileSync(file, 'utf8'); } catch (e) { console.error('无法读取:', e.message); process.exit(1); }
const issues = [];
const quickRequested = /执行档位：快速(?:（用户已确认）)?/.test(s), quick = /执行档位：快速（用户已确认）/.test(s);
if (quickRequested && !quick) issues.push('FAIL 快速档位：缺少用户明确确认');
if (!/执行档位：(?:快速(?:（用户已确认）)?|标准|制作)/.test(s)) issues.push('FAIL 执行档位：缺少标准/制作/快速标记');
if (quickRequested && !/模式豁免：Part2、Part4/.test(s)) issues.push('FAIL 快速档位：缺少精确模式豁免标记');
const q = s.match(/^快速资格：(.+)$/m);
if (quickRequested && !q) issues.push('FAIL 快速档位：缺少快速资格明细');
if (quickRequested && q) {
  const v = q[1], num = (label, max) => { const m = v.match(new RegExp(`${label}=(\\d+)秒?`)); if (!m || +m[1] > max) issues.push(`FAIL 快速资格：${label}超限或缺失`); };
  num('时长',30); num('主角',2); num('场景',2);
  if (!/(?:模型)=(?:Seedance|MiniMax H3)(?:；|$)/.test(v)) issues.push('FAIL 快速资格：模型未明确');
  if (!/(?:比例)=(?:4:3|9:16|16:9)(?:；|$)/.test(v)) issues.push('FAIL 快速资格：比例未明确');
  for (const x of ['素材绑定歧义','镜组歧义','忠实度未决','人性化未决','角色归属未决']) if (!new RegExp(`${x}=无(?:；|$)`).test(v)) issues.push(`FAIL 快速资格：${x}必须为无`);
}
const ms = [...s.matchAll(/^##\s+Part\s+([1-4])[^\n]*(?:\r?\n|$)/gmi)];
const parts = new Map(ms.map((m, i) => [+m[1], s.slice(m.index + m[0].length, i + 1 < ms.length ? ms[i + 1].index : s.length)]));
const omitted = new Set([...s.matchAll(/已省略：Part\s*([234])（用户明确豁免）/g)].map(m => +m[1]));
if (/已省略：Part\s*1（用户明确豁免）/.test(s)) issues.push('FAIL Part1：不可豁免');
if (quick && omitted.size) issues.push('FAIL 快速档位：不得使用逐项已省略标记，仅使用模式豁免：Part2、Part4');
if (quick && omitted.has(3)) issues.push('FAIL 快速档位：Part3不可省略');
const expected = quick ? [1,3] : [1,2,3,4].filter(n => !omitted.has(n));
if (ms.map(m => +m[1]).join(',') !== expected.join(',')) issues.push(`FAIL Part 顺序或数量：应为 ${expected.join('→')}`);
const schemas = {
  1: ['参考图映射','一致性铁律','图片对齐','生成规格','技能0·角色人设','技能1·画幅与题材锚定','技能2·景别与机位·身份体型姿态','技能3·背景','技能4·长相与气质','技能5·发型','技能6·服装槽位','技能7·面料质感','技能8·姿态与状态','技能9·布光与质感','技能10·反向词','限制'],
  2: ['参考图映射','一致性铁律','图片对齐','生成规格','技能0·角色人设','视角布局','受控派生','限制'],
  3: ['参考图映射','一致性铁律','图片对齐','生成规格','技能0·角色人设','六格布局','情绪映射','受控派生','限制'],
  4: ['参考图映射','一致性铁律','图片对齐','生成规格','技能0·角色人设','穿戴物清单','宫格布局','受控派生','限制']
};
function strictPart(n, body) {
  const fields = schemas[n]; if (!fields) { issues.push(`FAIL Part${n}：不允许的 Part`); return; }
  const hs = body.split(/\r?\n/).map(x => x.trim()).filter(Boolean).filter(x => /^[^：\n]+：/.test(x)).map(x => x.slice(0,x.indexOf('：')));
  for (const f of fields) if (hs.filter(x => x === f).length !== 1) issues.push(`FAIL Part${n}：字段「${f}」必须恰好出现一次`);
  for (const h of hs) if (!fields.includes(h)) issues.push(`FAIL Part${n}：禁止额外字段「${h}」`);
  const ix = fields.map(f => hs.indexOf(f)); if (ix.some(i => i < 0) || ix.some((v,i) => i && v <= ix[i-1])) issues.push(`FAIL Part${n}：字段顺序错误或字段合并`);
  const spec = body.match(/^生成规格：(.+)$/m)?.[1] || '';
  const wanted = {1:'9:16竖版 2K',2:'4:3横版 2K',3:'16:9横版 2K 2行×3列六格'}[n];
  if (wanted && spec !== wanted) issues.push(`FAIL Part${n}：固定画幅/分辨率错误`);
  if (n === 4 && !/^4:3横版 2K\s+\d+行×\d+列\d+格$/.test(spec)) issues.push('FAIL Part4：固定画幅/分辨率错误');
  if (n > 1 && !/Part\s*1|Picture 1|角色1/.test(body)) issues.push(`FAIL Part${n}：必须引用 Part1 唯一事实源`);
  if (n === 2 && (!/左侧45°|左侧45度/.test(body) || !/右侧90°|右侧90度|右侧面/.test(body) || !/下区裁切/.test(body))) issues.push('FAIL Part2：视角/下区裁切受控派生要求缺失');
  if (n === 3 && !/2行×3列六格|2行x3列六格|六格/.test(body)) issues.push('FAIL Part3：缺少六格峰值表情布局');
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
const positive = s.split(/\r?\n/).filter(x => /背景/.test(x) && !/负面|禁止|反向|不要|不得/.test(x)).join('\n');
for (const w of ['森林','山水','城市','庭院','宫殿','场景背景']) if (positive.includes(w)) issues.push(`FAIL 背景正向段含场景词「${w}」`);
if (!/纯色/.test(positive)) issues.push('FAIL 背景正向段缺少纯色约束');
if (issues.length) { console.log(`FAIL: ${file}\n`+issues.join('\n')); process.exit(1); }
console.log(`PASS: ${file}（v3固定字段/受控派生/固定画幅全合格）`);
