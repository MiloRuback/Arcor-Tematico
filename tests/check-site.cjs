const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,'IDs duplicados');
const checked=new Set();
function checkFile(relative,base=root){
  if(!relative||/^(https?:|data:|blob:|mailto:)/.test(relative))return;
  if(relative.startsWith('#')){assert.ok(ids.includes(relative.slice(1)),`Âncora ausente: ${relative}`);return;}
  const resolved=path.resolve(base,decodeURI(relative.split(/[?#]/)[0]));
  assert.ok(fs.existsSync(resolved),`Arquivo ausente: ${resolved}`);checked.add(path.relative(root,resolved));
}
for(const m of html.matchAll(/(?:src|href|poster|data-lightbox)="([^"]+)"/g))checkFile(m[1]);
const css=fs.readFileSync(path.join(root,'css/style.css'),'utf8');
for(const m of css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g))checkFile(m[1],path.join(root,'css'));
const scripts=['js/main.js','js/navigation.js','js/viewer3d.js','js/camera-constraints.mjs'];
for(const file of scripts){
  const absolute=path.join(root,file);execFileSync(process.execPath,['--check',absolute]);
  const source=fs.readFileSync(absolute,'utf8');
  for(const m of source.matchAll(/(?:from\s*|import\(|new URL\()\s*['"]([^'"]+)['"]/g)){if(m[1]!=='three')checkFile(m[1],path.dirname(absolute));}
}
const report={passed:true,ids:ids.length,localAssets:checked.size,syntaxChecked:scripts,missingAssets:[],timestamp:new Date().toISOString()};
fs.writeFileSync(path.join(__dirname,'static-checks.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
