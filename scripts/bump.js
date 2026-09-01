#!/usr/bin/env node
// 버전 한 번에 올리기: node scripts/bump.js 1.7.1
//   package.json · src/js APP_VER 상수 · 푸터 배지(src/body.html) 세 곳을 바꾸고 빌드까지 한다.
const fs=require('fs'),path=require('path');
const v=process.argv[2];if(!/^\d+\.\d+\.\d+$/.test(v||'')){console.error('사용법: node scripts/bump.js 1.7.1');process.exit(1);}
const ROOT=path.join(__dirname,'..');
const edit=(p,re,to)=>{const s=fs.readFileSync(p,'utf8');if(!re.test(s))throw new Error(p+': 패턴 없음 '+re);fs.writeFileSync(p,s.replace(re,to));console.log('✓',path.relative(ROOT,p));};
edit(path.join(ROOT,'package.json'),/"version": "[^"]+"/,`"version": "${v}"`);
for(const f of fs.readdirSync(path.join(ROOT,'src','js'))){const p=path.join(ROOT,'src','js',f);if(/APP_VER='[^']+'/.test(fs.readFileSync(p,'utf8')))edit(p,/APP_VER='[^']+'/,`APP_VER='${v}'`);}
edit(path.join(ROOT,'src','body.html'),/v\d+\.\d+\.\d+<\/span>/,`v${v}</span>`);
require('child_process').execFileSync('node',[path.join(__dirname,'build.js')],{stdio:'inherit'});
