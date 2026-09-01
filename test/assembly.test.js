// 조립 굿즈 (5단계): 프리셋 → 판형 아이템, 판 모양/가이드/그림, dpi 재합성, 전체 보기 드래그, 합본 내보내기
const fs=require('fs'),path=require('path'),os=require('os');
const {boot}=require('./harness');
const {w,NC,captured}=boot(process.argv[2]);
const $=id=>w.document.getElementById(id);
const P=w.project;
let fails=0;const ok=(c,m)=>{console.log((c?'PASS':'FAIL'),m);if(!c)fails++;};
const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const bboxOf=loops=>loops.flat().reduce((b,p)=>[Math.min(b[0],p[0]),Math.min(b[1],p[1]),Math.max(b[2],p[0]),Math.max(b[3],p[1])],[1e9,1e9,-1e9,-1e9]);
const mm=v=>v/w.S.pxmm;

(async()=>{
  $('dpi').value=300;
  // 1) 스핀 스탠드 프리셋
  click($('products').querySelector('button[data-p="assembly"]'));
  ok(!!$('assemblyPresets')&&$('assemblyPresets').querySelectorAll('button[data-asm]').length===4,'조립 굿즈: 프리셋 4개');
  click($('assemblyPresets').querySelector('button[data-asm="spin"]'));
  ok(P.kind==='spin'&&P.items.length===3,'스핀 스탠드 → 아이템 3개');
  const [body,base,mod]=P.items;
  ok(body.kind==='art'&&body.type==='stand'&&body.noBase===true&&!body.img,'본체 = 그림형 · 스탠드(받침 없음) · 아직 이미지 없음');
  ok(base.kind==='plate'&&base.img&&base.loops.length>=1,'받침대 = 판형, 판 이미지 합성·칼선 계산됨');
  ok(mod.kind==='plate'&&mod.plate.tpl==='circle'&&mod.plate.noart,'회전 모듈 = 원 판 · 인쇄 없음');
  ok(w.S===body,'첫 아이템(본체) 활성');
  ok($('multiExp').value==='board','내보내기 = 한 대지');
  // 받침대 판 크기 = 70mm
  w.setActiveItem(1);
  const bb=bboxOf(w.S.loops);
  ok(Math.abs(mm(bb[2]-bb[0])-70)<1.2&&Math.abs(mm(bb[3]-bb[1])-70)<1.2,`받침대 칼선 ≈ 70×70mm (${mm(bb[2]-bb[0]).toFixed(1)}×${mm(bb[3]-bb[1]).toFixed(1)})`);
  ok(!!$('plateGroup')&&!$('plateGroup').classList.contains('hide')&&$('offset').closest('.grp').classList.contains('hide'),'3단계: 판 모양 패널 표시, 칼선 그룹 숨김');
  // 판 모양 바꾸기: 둥근 사각 50×80 r10
  w.setPlateShape({tpl:'rrect',w:50,h:80,r:10});w.computeCore(true); // recompute 는 지연 실행
  const bb2=bboxOf(w.S.loops);
  ok(Math.abs(mm(bb2[2]-bb2[0])-50)<1.2&&Math.abs(mm(bb2[3]-bb2[1])-80)<1.2,'판 50×80 으로 변경 반영');
  ok(w.S.loops.length===1,'둥근 사각 판 = 칼선 1개');
  // 판에 그림 (contain, 클리핑)
  const art=NC.createCanvas(400,100);{const g=art.getContext('2d');g.fillStyle='#c36';g.fillRect(0,0,400,100);}
  w.S.plate.art=art;w.rebuildPlate(w.S);w.computeCore(true);
  const d=w.S.img.getContext('2d').getImageData(0,0,w.S.img.width,w.S.img.height).data;
  let pink=0,white=0;for(let i=0;i<d.length;i+=4){if(d[i+3]<128)continue;if(d[i]>200&&d[i+1]<80)pink++;else if(d[i]>240&&d[i+1]>240)white++;}
  ok(pink>0&&white>pink,'판 그림이 판 안에 contain 으로 들어감 (흰 여백 > 그림)');
  // 회전 모듈: 원 판 칼선
  w.setActiveItem(2);
  const bb3=bboxOf(w.S.loops);
  ok(Math.abs(mm(bb3[2]-bb3[0])-70)<1.5&&w.S.loops.length===1,'회전 모듈 원 판 ≈ 70mm');

  // 2) 가이드 PNG: 슬롯(투명 구멍) 있는 판
  const guide=NC.createCanvas(300,200);{const g=guide.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,300,200);g.clearRect(120,80,60,12);g.clearRect(20,150,30,30);}
  Object.assign(w.S.plate,{tpl:'guide',guide:guide,w:60,h:40,guideName:'guide.png',noart:false});
  w.rebuildPlate(w.S);w.computeCore(true);
  ok(w.S.loops.length===3,'가이드 판: 외곽 1 + 투명 구멍 2 = 칼선 3개 ('+w.S.loops.length+')');
  const bb4=bboxOf(w.S.loops);
  ok(Math.abs(mm(bb4[2]-bb4[0])-60)<1.5,'가이드 실제 크기 60mm 반영');

  // 3) dpi 바꾸면 판 재합성
  $('dpi').value=150;w.computeCore(true);
  ok(Math.abs(w.S._plateDpi-150/25.4)<1e-6&&Math.abs(mm(bboxOf(w.S.loops)[2]-bboxOf(w.S.loops)[0])-60)<1.5,'dpi 150 → 판 재합성, 여전히 60mm');
  $('dpi').value=300;w.computeCore(true);

  // 4) 본체에 이미지 (판형이 아닌 아이템에는 그대로 그림)
  w.setActiveItem(0);
  const c=NC.createCanvas(200,260);{const g=c.getContext('2d');g.fillStyle='#36c';g.beginPath();g.arc(100,110,80,0,7);g.fill();g.fillRect(70,180,60,60);}
  w.setArtSource(c,200,260);w.computeCore(true);
  ok(w.S.img===c&&w.S.kind==='art'&&w.S.loops.length>=1,'본체에 그림 → 그림에서 칼선');
  w.setActiveItem(1);
  ok(w.S.loops.length===2&&w.slotLayout(w.S).length===1&&Math.abs(w.slotLayout(w.S)[0].cy-w.S.plate.h/2)<0.01,'받침대: 본체 촉 슬롯이 가운데에 생김 (칼선 '+w.S.loops.length+'개)');
  w.setActiveItem(0);

  // 5) 전체 보기 드래그
  w.setBoardView(true);
  const B=w.boardSize();const it=P.items[1];const sc=$('view').width/B.w;
  $('view').getBoundingClientRect=()=>({left:0,top:0});
  const ev=(t,x,y)=>$('view').dispatchEvent(new w.MouseEvent(t,{clientX:x*sc,clientY:y*sc,bubbles:true}));
  const x0=it.placement.x,y0=it.placement.y;
  ev('pointerdown',x0+10,y0+10);ev('pointermove',x0+210,y0+160);ev('pointerup',x0+210,y0+160);
  ok(w.S===it&&it.placement.x===x0+200&&it.placement.y===y0+150&&P.sheet.manual===true,`드래그로 받침대 이동 (+200,+150) → (${it.placement.x},${it.placement.y})`);
  const B2=w.autoLayout();
  ok(it.placement.x===x0+200&&B2.w>=it.placement.x+it.pW,'수동 배치 유지, 대지는 내용에 맞게 확장');
  w.resetLayout();
  ok(P.sheet.manual===false&&it.placement.x!==x0+200,'자동 배치로 복귀');
  w.setBoardView(false);

  // 6) 합본 PDF
  await $('expPdf').onclick();await new Promise(r=>setTimeout(r,200));
  ok(captured()&&captured().name==='굿즈_대지.pdf','합본 PDF 저장');
  const pdfPath=path.join(os.tmpdir(),'moa-assembly.pdf');fs.writeFileSync(pdfPath,Buffer.from(await captured().blob.arrayBuffer()));
  console.log('  pdf →',pdfPath);
  // 아이템 바 배지
  w.renderItemBar();
  ok($('itemBar').querySelectorAll('.kbadge.B').length===2&&$('itemBar').querySelectorAll('.kbadge.A').length===1,'아이템 바: 판 배지 2, 그림 배지 1');

  // 7) 쉐이커 프리셋으로 교체 (이미지 있는 아이템은 유지)
  click($('assemblyPresets').querySelector('button[data-asm="shaker"]'));
  ok(P.kind==='shaker'&&P.items.length===3+4,'쉐이커: 기존 이미지 있는 아이템 3 + 새 4');
  console.log(fails?`${fails}개 실패`:'모두 통과');process.exit(fails?1:0);
})().catch(e=>{console.error('하네스 오류',e);process.exit(2);});
