#!/usr/bin/env node
// Shared prompt payload validator. Counts Unicode code points (Array.from).
const fs = require('fs');
const DEFAULT_LIMITS = { platform: 3000, delivery: 2700, characterPart: 2700, sceneBase: 2700, sceneVariation: 1200, storyboardPage: 2700, videoShot: 1200, videoMerged: 1900 };
const FORBIDDEN = ['截断','半身','缺手脚','裸露','私密部位','低俗身体','裸体','性器官'];
const POSITIVE = ['完整着装','服装结构闭合','覆盖自然','人物头顶至鞋履完整入镜','双手与鞋履清晰','人体结构和比例自然'];
const SHOT_SIZE_ABBREVIATIONS = ['ELS','LS','FS','MLS','MS','MCU','CU','ECU'];
const count = text => Array.from(String(text ?? '')).length;
function blocks(text, re) { const ms=[...text.matchAll(re)]; return ms.map((m,i)=>({id:m[1]||String(i+1), text:text.slice(m.index+m[0].length,i+1<ms.length?ms[i+1].index:text.length)})); }
function validate(text, kind, opts={}) {
  const limits={...DEFAULT_LIMITS,...(opts.limits||{})}; const issues=[]; const units=[];
  if (kind==='character') { units.push(...blocks(text,/^##\s+Part\s+([1-4])[^\n]*(?:\r?\n|$)/gmi).map(x=>({...x,limit:limits.characterPart}))); if(!units.length && opts.allowUnstructured) units.push({id:'optional-asset',text,limit:limits.characterPart}); else if(!units.length) issues.push('no valid character Part units'); }
  else if (kind==='scene') {
    const mappingMatch=text.match(/^参考图映射\s*：|^##\s*参考图映射\s*$/im); const mapping=mappingMatch?mappingMatch.index:-1; if(mapping<0) issues.push('scene missing 参考图映射');
    const endRe=/^##\s+(?:场景)?(?:变化线|关键道具)/im; const endMatch=mapping>=0?text.slice(mapping).search(endRe):-1; const end=mapping>=0?(endMatch<0?text.length:mapping+endMatch):0;
    if(mapping>=0) units.push({id:'base',text:text.slice(mapping,end),limit:limits.sceneBase});
    const v= text.match(/^##\s+(?:场景)?变化线[\s\S]*$/im)?.[0]||'';
    const starts=[...v.matchAll(/(?:^|\n)[-*]\s*变体\s*(\d+)\s*提示词：\s*/gmi)]; for(let i=0;i<starts.length;i++){ const start=starts[i].index+starts[i][0].length; const tail=v.slice(start); const nextVariant=i+1<starts.length?starts[i+1].index-start:tail.length; const meta=tail.search(/(?:\n|^)\s*[-*]?\s*本体保持\s*[:：]/m); const heading=tail.search(/(?:\n|^)\s*##\s+/m); const next=Math.min(nextVariant,meta<0?tail.length:meta,heading<0?tail.length:heading); units.push({id:`variation-${starts[i][1]}`,text:tail.slice(0,next),limit:limits.sceneVariation}); }
  } else if (kind==='storyboard') { units.push(...blocks(text,/^##\s+([^\n]*页)[^\n]*(?:\r?\n|$)/gmi).map(x=>({...x,limit:limits.storyboardPage}))); if(!units.length) units.push({id:'page-1',text,limit:limits.storyboardPage}); else { const first=text.search(/^##\s+[^\n]*页[^\n]*(?:\r?\n|$)/gmi); const prefix=text.slice(0,first).replace(/^#\s+[^\n]*(?:\r?\n|$)/,''); for(const u of units) u.text=prefix+u.text; } }
  else if (kind==='video') { units.push(...blocks(text,/^##\s+(S\d{2}-\d{2})[^\n]*(?:\r?\n|$)/gmi).map(x=>({...x,limit:limits.videoShot}))); if(!units.length) units.push({id:'merged',text,limit:limits.videoMerged}); else { const first=text.search(/^##\s+S\d{2}-\d{2}[^\n]*(?:\r?\n|$)/gmi); const prefix=text.slice(0,first).replace(/^#\s+[^\n]*(?:\r?\n|$)/,''); for(const u of units) u.text=prefix+u.text; } }
  else return {ok:false,issues:['unknown kind'],units:[]};
  for(const u of units){ const n=count(u.text); u.count=n; if(n>u.limit) issues.push(`${u.id}: ${n}>${u.limit}`); const hits=FORBIDDEN.filter(w=>u.text.includes(w)); if(hits.length) issues.push(`${u.id}: forbidden terms ${hits.join(',')}`); const shotText=u.text.replace(/\bMS Paint\b/g,''); const shotHits=[...shotText.matchAll(/(?<![A-Za-z0-9])(ELS|LS|FS|MLS|MS|MCU|CU|ECU)(?![A-Za-z0-9])/gi)].map(m=>m[1].toUpperCase()); if(shotHits.length) issues.push(`${u.id}: English shot-size abbreviations ${[...new Set(shotHits)].join(',')}`); }
  return {ok:issues.length===0,issues,units,limits};
}
function validateFile(file,kind,opts={}) { return validate(fs.readFileSync(file,'utf8'),kind,opts); }
if(require.main===module){ const [,,file,kind='scene']=process.argv; if(!file){console.error('usage: node validate_prompt_payload.cjs <file> <character|scene|storyboard|video>');process.exit(2);} const r=validateFile(file,kind); console.log(JSON.stringify(r,null,2)); process.exit(r.ok?0:1); }
module.exports={count,validate,validateFile,FORBIDDEN,POSITIVE,SHOT_SIZE_ABBREVIATIONS,DEFAULT_LIMITS};
