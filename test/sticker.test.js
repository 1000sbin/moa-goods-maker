// 스티커 모델 (4b): 배경 = 대지 전체, 스티커 반칼 + 대지 외곽 완칼, 배경 파일 = 대지 크기
const fs=require('fs'),path=require('path'),os=require('os');
const {boot}=require('./harness');
const {w,NC,captured}=boot(process.argv[2]);
const $=id=>w.document.getElementById(id);
let fails=0;const ok=(c,m)=>{console.log((c?'PASS':'FAIL'),m);if(!c)fails++;};
const fire=(el,ev)=>el.dispatchEvent(new w.Event(ev,{bubbles:true}));

(async()=>{
  $('dpi').value=300;
  w.S.type='sticker';w.applyType();
  const art=NC.createCanvas(200,200);{const g=art.getContext('2d');g.fillStyle='#c36';g.beginPath();g.arc(100,100,70,0,7);g.fill();}
  w.setArtSource(art,200,200);
  $('offset').value=2;fire($('offset'),'input');
  $('whiteLayer').checked=true;fire($('whiteLayer'),'change');
  $('whiteInkCol').value='#ffee88';fire($('whiteInkCol'),'input');
  w.computeCore(true);
  ok($('whiteTitle').textContent==='배경'&&$('whiteToggleTxt').textContent==='배경 인쇄','스티커: 5단계 라벨이 배경/배경 인쇄');
  ok($('whiteOff').classList.contains('hide')&&$('whiteFormat').closest('label').classList.contains('hide'),'스티커: 화이트 여백·형식 숨김');
  const fr=w.fullCutRect();
  ok(fr&&fr.w===w.S.pW&&fr.h===w.S.pcH,'완칼 사각 = 대지 크기');
  // 배경 캔버스: 대지 전체가 단색
  const wc=w.whiteLayerCanvas();const px=wc.getContext('2d').getImageData(0,0,wc.width,wc.height).data;
  let filled=0;for(let i=3;i<px.length;i+=4)if(px[i]===255)filled++;
  ok(filled===wc.width*wc.height,'배경이 대지 전체를 채움 ('+filled+'/'+wc.width*wc.height+')');
  ok(px[0]===0xff&&px[1]===0xee&&px[2]===0x88,'배경 색 = 지정한 색');
  const vl=w.whiteVectorLoops();
  ok(vl.length===1&&vl[0].length===4,'배경 벡터 = 사각 1개');
  // PDF: 칼선 페이지에 반칼 + 완칼(사각), 배경 페이지는 인쇄색 채움
  await $('expPdf').onclick();await new Promise(r=>setTimeout(r,200));
  const pdfPath=path.join(os.tmpdir(),'moa-sticker.pdf');fs.writeFileSync(pdfPath,Buffer.from(await captured().blob.arrayBuffer()));
  console.log('  pdf →',pdfPath);
  // SVG
  $('expSvg').onclick();const svg=await captured().blob.text();
  ok(svg.includes('id="fullcut"')&&/<rect id="fullcut"[^>]*width="(\d+)"/.test(svg)&&+RegExp.$1===w.S.pW,'SVG에 완칼 rect (대지 폭)');
  ok(/<g id="white"><path d="[^"]*" fill="#ffee88"/.test(svg),'SVG 배경 = 인쇄색');
  // PSD 패스: 외곽 + 완칼
  await $('expPsd').onclick();await new Promise(r=>setTimeout(r,300));
  const buf=Buffer.from(await captured().blob.arrayBuffer());
  const psd=w.agPsd.readPsd(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength),{skipLayerImageData:true,skipCompositeImageData:true,skipThumbnail:true});
  const cutL=psd.children.find(c=>c.name==='칼선 패스 (벡터)');
  ok(cutL&&cutL.vectorMask.paths.length===2,'PSD 칼선 패스 = 반칼 1 + 완칼 1 ('+(cutL?cutL.vectorMask.paths.length:0)+')');
  // 배경 파일 → 대지 크기 = 파일 크기
  const bg=NC.createCanvas(600,360);{const g=bg.getContext('2d');g.fillStyle='#8cf';g.fillRect(0,0,600,360);}
  ok(!$('boardOn').checked,'처음엔 대지 크기 고정 아님');
  // whiteUpBtn 핸들러의 파일 선택을 우회해 같은 로직을 직접 실행
  w.S.customWhite=bg;w.S._cwCache=null;
  $('boardOn').checked=true;$('boardW').value=(600/w.S.pxmm).toFixed(1);$('boardH').value=(360/w.S.pxmm).toFixed(1);w.computeCore(true);
  ok(Math.abs(w.S.pW-600)<=1&&Math.abs(w.S.pcH-360)<=1,`대지 = 파일 크기 (${w.S.pW}×${w.S.pcH})`);
  const wc2=w.whiteLayerCanvas();const p2=wc2.getContext('2d').getImageData(0,0,wc2.width,wc2.height).data;
  let blue=0;for(let i=0;i<p2.length;i+=4)if(p2[i]===0x88&&p2[i+1]===0xcc&&p2[i+2]===0xff)blue++;
  ok(blue>=wc2.width*wc2.height*0.99,'배경 파일이 대지 전체에 색 그대로 ('+Math.round(blue/(wc2.width*wc2.height)*100)+'%)');
  ok(w.keepCustomColors(),'배경 파일 = 색 보존 모드');
  // 아크릴은 영향 없음
  w.S.type='acrylic';w.applyType();w.S.customWhite=null;$('boardOn').checked=false;w.computeCore(true);
  ok(w.fullCutRect()===null&&w.whiteVectorLoops().length>=1&&w.whiteVectorLoops()[0].length>4,'아크릴: 완칼 없음, 화이트는 실루엣');
  console.log(fails?`${fails}개 실패`:'모두 통과');process.exit(fails?1:0);
})().catch(e=>{console.error('하네스 오류',e);process.exit(2);});
