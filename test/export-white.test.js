// 커스텀 화이트 → PDF 내보내기 검증
//   node test/export-white.test.js            기본(아크릴·커스텀 화이트)
//   GTYPE=stand MODE=custom WOFF=1 node test/export-white.test.js
const fs=require('fs'),path=require('path');
const {boot}=require('./harness');
const APP=process.argv[2]||path.join(__dirname,'..','app','index.html');
const OUT=process.argv[3]||path.join(require('os').tmpdir(),'moa-test-out.pdf');
const {w,NC,captured}=boot(APP);
const $=id=>w.document.getElementById(id);
// 굿즈 이미지: 200x200 원 (파랑)
const art=NC.createCanvas(200,200);{const c=art.getContext('2d');c.fillStyle='#3366cc';c.beginPath();c.arc(100,100,90,0,Math.PI*2);c.fill();}
// 커스텀 화이트: 원 안의 작은 사각형만 (60..140) — 자동 실루엣(원)과 분명히 다름
const cw=NC.createCanvas(200,200);{const c=cw.getContext('2d');c.fillStyle='#fff';c.fillRect(60,60,80,80);}
(async()=>{
  const S=w.S;
  $('dpi').value=300;
  w.setArtSource(art,200,200);
  // 타입: 일반 아크릴
  S.type=process.env.GTYPE||'acrylic';w.applyType&&w.applyType();
  w.computeCore(true);
  $('whiteLayer').checked=true;$('whiteLayer').onchange();
  const mode=process.env.MODE||'custom';
  if(mode==='custom'){S.customWhite=cw;}
  if(process.env.CWSIZE==='diff'){const c2=NC.createCanvas(400,400);const g=c2.getContext('2d');g.fillStyle='#fff';g.fillRect(120,120,160,160);S.customWhite=c2;}
  if(process.env.CWALPHA==='half'){const c2=NC.createCanvas(200,200);const g=c2.getContext('2d');g.fillStyle='rgba(255,255,255,0.4)';g.fillRect(60,60,80,80);S.customWhite=c2;}
  if(process.env.CWEMPTY){S.customWhite=NC.createCanvas(200,200);} // 완전 투명 화이트
  if(process.env.WOFF)$('whiteOff').value=process.env.WOFF;
  if(process.env.WFMT)$('whiteFormat').value=process.env.WFMT;
  if(process.env.WSIMP)$('whiteSimplify').value=process.env.WSIMP;
  w.recompute&&w.computeCore(false);
  console.log('type',S.type,'pW×pcH',S.pW,S.pcH,'custom',!!S.customWhite,'keepCol',w.keepCustomColors(),'grad',w.whiteHasGradient());
  const loops=w.whiteVectorLoops();
  const bb=loops.flat().reduce((b,p)=>[Math.min(b[0],p[0]),Math.min(b[1],p[1]),Math.max(b[2],p[0]),Math.max(b[3],p[1])],[1e9,1e9,-1e9,-1e9]);
  console.log('whiteVectorLoops',loops.length,'bbox(px)',bb.map(Math.round),'expected custom rect ~',[S.xImg+60,S.yImg+60,S.xImg+140,S.yImg+140]);
  await $('expPdf').onclick();
  await new Promise(r=>setTimeout(r,300));
  if(!captured()){console.log('PDF 캡처 없음 · psdWarn:',$('psdWarn').style.display,$('psdWarn').textContent.slice(0,60));process.exit(0);}
  const buf=Buffer.from(await captured().blob.arrayBuffer());
  fs.writeFileSync(OUT,buf);console.log('PDF 저장',OUT,buf.length,'bytes');
  if(mode==='custom'&&!process.env.CWEMPTY&&!process.env.CWALPHA){ // 벡터 루프 bbox가 커스텀 사각형과 일치해야 함 (여백 0 기준 ±2px)
    const exp=[S.xImg+60,S.yImg+60,S.xImg+140,S.yImg+140];const off=(+(process.env.WOFF||0))*S.pxmm;
    const ok=bb.every((v,i)=>Math.abs(v-exp[i]-(i<2?-off:off))<=2.5);
    console.log(ok?'PASS':'FAIL','화이트 루프 bbox');process.exit(ok?0:1);
  }
  process.exit(0);
})().catch(e=>{console.error('하네스 오류',e);process.exit(2);});
