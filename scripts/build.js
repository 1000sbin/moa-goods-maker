#!/usr/bin/env node
// 모아 굿즈메이커 빌드 — src/ 를 합쳐 app/index.html 과 단일파일 HTML을 만든다.
//   node scripts/build.js          → app/index.html + 모아굿즈메이커_단일파일.html
// 소스 구조:
//   src/head.html   <!doctype> ~ <style> 직전
//   src/styles.css  <style> 내용
//   src/body.html   </style> 이후 ~ <script> 직전 (마크업 + 라이브러리 <script src>)
//   src/js/*.js     앱 스크립트 (파일명 순서대로 이어붙임)
//   src/tail.html   </script> 이후
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),SRC=path.join(ROOT,'src');
const r=p=>fs.readFileSync(p,'utf8');
const js=fs.readdirSync(path.join(SRC,'js')).filter(f=>f.endsWith('.js')).sort().map(f=>r(path.join(SRC,'js',f))).join('\n');
const app=[r(path.join(SRC,'head.html')),'<style>',r(path.join(SRC,'styles.css')),'</style>',r(path.join(SRC,'body.html')),'<script>',js,'</script>',r(path.join(SRC,'tail.html'))].join('\n');
fs.writeFileSync(path.join(ROOT,'app','index.html'),app);
// 단일파일: <script src="x.js"> 를 인라인으로 (오프라인 동작)
const LIBS=[['ag-psd.js','/* ag-psd 31.0.2 (MIT) — https://github.com/Agamnentzar/ag-psd — 오프라인 동작 */'],
            ['jszip.js','/* JSZip 3.10.1 (MIT or GPL-3.0-or-later) — https://stuk.github.io/jszip/ — 오프라인 동작 */'],
            ['jspdf.js','/* jsPDF 4.2.1 (MIT) — https://github.com/parallax/jsPDF — 오프라인 동작 */']];
let single=app;
for(const [f,hdr] of LIBS){
  const tag=`<script src="${f}"></script>`;
  if(!single.includes(tag))throw new Error('missing '+tag);
  single=single.replace(tag,()=>`<script>${hdr}\n${r(path.join(ROOT,'app',f))}\n</script>`); // 함수형: 라이브러리 안의 '$$' 패턴이 치환되지 않게
}
fs.writeFileSync(path.join(ROOT,'모아굿즈메이커_단일파일.html'),single);
const ver=(app.match(/APP_VER='([^']+)'/)||[])[1];
console.log(`built v${ver}: app/index.html (${(app.length/1024).toFixed(0)}KB), 단일파일 (${(single.length/1024/1024).toFixed(2)}MB)`);
