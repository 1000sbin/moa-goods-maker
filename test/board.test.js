// 대지 배치 + 합본 내보내기 (3단계)
const fs=require('fs'),path=require('path'),os=require('os');
const {boot}=require('./harness');
const {w,NC,captured}=boot(process.argv[2]);
const $=id=>w.document.getElementById(id);
let fails=0;const ok=(c,m)=>{console.log((c?'PASS':'FAIL'),m);if(!c)fails++;};
const cv=(draw,W,H)=>{const c=NC.createCanvas(W,H);draw(c.getContext('2d'));return c;};
const fire=(el,ev)=>el.dispatchEvent(new w.Event(ev,{bubbles:true}));

(async()=>{
  const P=w.project;
  $('dpi').value=300;
  // 아이템 1: 원 (아크릴, 여백 3, 화이트 켬)
  w.S.type='acrylic';w.applyType();w.S.name='circle';
  w.setArtSource(cv(g=>{g.fillStyle='#36c';g.beginPath();g.arc(100,100,80,0,7);g.fill();},200,200),200,200);
  $('offset').value=3;fire($('offset'),'input');$('whiteLayer').checked=true;fire($('whiteLayer'),'change');
  w.computeCore(true);
  // 아이템 2: 사각 (키링, 여백 5, 화이트 끔)
  const it2=w.addItem('rect');w.setActiveItem(1);
  w.S.type='ring_hole';w.applyType();
  w.setArtSource(cv(g=>{g.fillStyle='#c63';g.fillRect(20,20,260,120);},300,160),300,160);
  $('offset').value=5;fire($('offset'),'input');$('whiteLayer').checked=false;fire($('whiteLayer'),'change');
  w.computeCore(true);
  // 아이템 3: 세로 막대
  const it3=w.addItem('bar');w.setActiveItem(2);
  w.S.type='acrylic';w.applyType();
  w.setArtSource(cv(g=>{g.fillStyle='#3a3';g.fillRect(30,10,60,220);},120,240),120,240);
  w.computeCore(true);
  w.renderItemBar();

  ok($('multiExpRow').style.display==='block'&&$('multiExp').value==='board','아이템 2개 이상 → 합본 옵션 표시, 기본 = 한 대지');
  ok(!!$('itemBoard'),'전체 보기 버튼 있음');

  // 자동 배치
  const B=w.autoLayout();
  const its=w.itemsWithImg();
  ok(its.length===3&&B.w>0&&B.h>0,`배치 대지 ${B.w}×${B.h}px`);
  const gap=w.boardGapPx();
  const rects=its.map(i=>[i.placement.x,i.placement.y,i.pW,i.pH]);
  let overlap=false;for(let a=0;a<3;a++)for(let b=a+1;b<3;b++){const [ax,ay,aw,ah]=rects[a],[bx,by,bw,bh]=rects[b];if(ax<bx+bw&&bx<ax+aw&&ay<by+bh&&by<ay+ah)overlap=true;}
  ok(!overlap,'아이템끼리 겹치지 않음');
  ok(its.every(i=>i.placement.x>=gap-0.5&&i.placement.y>=gap-0.5&&i.placement.x+i.pW<=B.w+0.5&&i.placement.y+i.pH<=B.h+0.5),'모두 대지 안, 여백 유지');
  ok(w.boardOverflow().length===0,'넘침 없음 (자동 크기)');

  // 전체 보기 렌더
  w.setBoardView(true);
  ok(P.ui.view==='board'&&$('view').width>0&&$('stageInfo').innerHTML.includes('전체 보기'),'전체 보기 렌더 + 정보 표시');
  // 전체 보기에서 클릭으로 아이템 선택
  const r0=its[0];const sc=$('view').width/B.w;
  $('view').getBoundingClientRect=()=>({left:0,top:0});
  $('view').dispatchEvent(new w.MouseEvent('pointerdown',{clientX:(r0.placement.x+r0.pW/2)*sc,clientY:(r0.placement.y+r0.pH/2)*sc,bubbles:true}));
  ok(w.S===r0,'전체 보기에서 클릭 → 그 아이템 활성');
  w.setBoardView(false);
  ok(P.ui.view==='draft','도안 보기로 복귀');

  // 고정 대지: 너무 작으면 넘침 경고
  $('boardOn').checked=true;$('boardW').value=30;$('boardH').value=30;
  const Bf=w.autoLayout();
  ok(Bf.fixed&&w.boardOverflow().length>0,'고정 30×30mm → 넘치는 아이템 감지 ('+w.boardOverflow().length+')');
  $('boardOn').checked=false;w.autoLayout();

  // withItem: 다른 아이템 설정으로 그렸다가 되돌아오는지
  w.setActiveItem(0);
  const seen=w.withItem(it2,()=>$('offset').value);
  ok(seen==='5'&&$('offset').value==='3'&&w.S===P.items[0],'withItem: 아이템2 설정(5)으로 실행 후 아이템1(3)로 복원');

  // 합본 PDF
  await $('expPdf').onclick();await new Promise(r=>setTimeout(r,200));
  ok(captured()&&captured().name==='굿즈_대지.pdf','합본 PDF 저장됨');
  const pdfPath=path.join(os.tmpdir(),'moa-board.pdf');fs.writeFileSync(pdfPath,Buffer.from(await captured().blob.arrayBuffer()));
  console.log('  pdf →',pdfPath);

  // 합본 SVG
  $('expSvg').onclick();
  const svg=await captured().blob.text();
  ok(captured().name==='굿즈_대지.svg'&&(svg.match(/<g id="it\d+"/g)||[]).length===3&&svg.includes(`viewBox="0 0 ${B.w} ${B.h}"`),'합본 SVG: 그룹 3개, viewBox = 대지');
  ok(svg.includes('<circle'),'합본 SVG에 키링 타공 원 포함');

  // 합본 ZIP
  await $('expZip').onclick();await new Promise(r=>setTimeout(r,300));
  ok(captured().name==='굿즈_대지.zip','합본 ZIP 저장됨');
  const JSZip=w.JSZip;const zab=await captured().blob.arrayBuffer();const z=await JSZip.loadAsync(new w.Uint8Array(zab)); // 창 컨텍스트의 타입으로 넘겨야 JSZip 이 인식
  const names=Object.keys(z.files).sort();
  ok(names.join(',')==='디자인.png,미리보기.png,칼선.png,화이트.png','ZIP 파일 구성: '+names.join(','));
  const cutPng=await NC.loadImage(Buffer.from(await z.file('칼선.png').async('uint8array')));
  ok(cutPng.width===B.w&&cutPng.height===B.h,'칼선.png 크기 = 대지');

  // 합본 PSD
  await $('expPsd').onclick();await new Promise(r=>setTimeout(r,300));
  ok(captured().name==='굿즈_대지.psd','합본 PSD 저장됨');
  const psdBuf=Buffer.from(await captured().blob.arrayBuffer());
  const psd=w.agPsd.readPsd(psdBuf.buffer.slice(psdBuf.byteOffset,psdBuf.byteOffset+psdBuf.byteLength),{skipLayerImageData:true,skipCompositeImageData:true,skipThumbnail:true});
  const lnames=psd.children.map(c=>c.name);
  ok(psd.width===B.w&&psd.height===B.h,'PSD 크기 = 대지');
  ok(lnames.includes('칼선 패스 (벡터)')&&lnames.includes('화이트 패스 (벡터)')&&lnames.includes('디자인'),'PSD 레이어: '+lnames.join(' / '));
  const cutLayer=psd.children.find(c=>c.name==='칼선 패스 (벡터)');
  ok(cutLayer.vectorMask&&cutLayer.vectorMask.paths.length>=4,'칼선 패스 수 ≥ 4 (3 외곽 + 타공) → '+cutLayer.vectorMask.paths.length);

  // 현재 아이템만 모드면 기존 단일 내보내기
  $('multiExp').value='each';
  $('expSvg').onclick();
  ok(captured().name==='칼선.svg','현재 아이템만 → 기존 단일 SVG');

  console.log(fails?`${fails}개 실패`:'모두 통과');process.exit(fails?1:0);
})().catch(e=>{console.error('하네스 오류',e);process.exit(2);});
