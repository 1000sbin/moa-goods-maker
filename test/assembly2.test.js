// 조립 굿즈 짝 맞춤 (5b): 디오라마 촉·슬롯, 여러 캐릭터, 쉐이커 파츠 여러 장(구멍 없음), 누들 슬롯, 스핀 받침대 그림 모양
const fs=require('fs'),path=require('path'),os=require('os');
const {boot}=require('./harness');
const {w,NC,captured}=boot(process.argv[2]);
const $=id=>w.document.getElementById(id);
const P=w.project;
let fails=0;const ok=(c,m)=>{console.log((c?'PASS':'FAIL'),m);if(!c)fails++;};
const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const bboxOf=loops=>loops.flat().reduce((b,p)=>[Math.min(b[0],p[0]),Math.min(b[1],p[1]),Math.max(b[2],p[0]),Math.max(b[3],p[1])],[1e9,1e9,-1e9,-1e9]);
const mm=v=>v/w.S.pxmm;
const png=(draw,W,H,name)=>{const c=NC.createCanvas(W,H);draw(c.getContext('2d'));return new w.File([c.toBuffer('image/png')],name,{type:'image/png'});};
// loadImage 가 쓰는 Image/objectURL 을 node-canvas 로 (multi.test 와 동일)
const fileCanvas=new Map();w.URL.createObjectURL=f=>{const k='blob:'+Math.random();fileCanvas.set(k,f);return k;};
w.Image=function(){const img={};let _src='';Object.defineProperty(img,'src',{set(v){_src=v;const f=fileCanvas.get(v);f.arrayBuffer().then(ab=>NC.loadImage(Buffer.from(ab))).then(ci=>{img.naturalWidth=ci.width;img.naturalHeight=ci.height;img.width=ci.width;img.height=ci.height;img.__nc=ci;img.onload&&img.onload();});},get(){return _src;}});return img;};
const CTX=NC.CanvasRenderingContext2D.prototype,od=CTX.drawImage;CTX.drawImage=function(i,...a){return od.call(this,(i&&i.__nc)?i.__nc:i,...a);};
const charPng=(name,col)=>png(g=>{g.fillStyle=col;g.beginPath();g.arc(100,90,70,0,7);g.fill();g.fillRect(70,150,60,40);},200,200,name);

(async()=>{
  $('dpi').value=300;
  // ===== 디오라마 =====
  click($('products').querySelector('button[data-p="assembly"]'));
  click($('assemblyPresets').querySelector('button[data-asm="diorama"]'));
  const [L,R,F,C]=P.items;
  ok(L.plate.tab&&R.plate.tab&&F.plate.slotsFrom==='auto','좌·우판에 촉, 바닥판은 슬롯 자동');
  w.setActiveItem(0);
  const bbL=bboxOf(w.S.loops);
  ok(Math.abs(mm(bbL[3]-bbL[1])-103)<1.5,`왼쪽 벽 높이 = 100 + 촉 3 = 103mm (${mm(bbL[3]-bbL[1]).toFixed(1)})`);
  ok(w.S.loops.length===1,'왼쪽 벽 = 촉 2개 + 손가락 결합 포함 한 덩어리 칼선');
  { // 촉 2개: 아래 가장자리에서 흰 픽셀 구간이 2개
    const d=w.S.img.getContext('2d').getImageData(0,w.S.img.height-2,w.S.img.width,1).data;let runs=0,prev=false;for(let x=0;x<w.S.img.width;x++){const on=d[x*4+3]>128;if(on&&!prev)runs++;prev=on;}
    ok(runs===2,'왼쪽 벽 아래 촉 2개 ('+runs+')');
    // 오른쪽 가장자리: 세로로 돌출/홈이 번갈아 (칸 7개 → 전이 6번)
    const col=w.S.img.getContext('2d').getImageData(w.S.img.width-2,0,1,w.S.img.height).data;let tr=0,prevOn=null;for(let y=0;y<w.S.img.height;y++){const on=col[y*4+3]>128;if(prevOn!==null&&on!==prevOn)tr++;prevOn=on;}
    ok(tr>=6,'오른쪽 가장자리 손가락 결합: 돌출/홈 전이 '+tr+'회');
  }
  L.plate.tab.n=3;w.rebuildPlate(w.S);w.computeCore(true);
  { const d=w.S.img.getContext('2d').getImageData(0,w.S.img.height-2,w.S.img.width,1).data;let runs=0,prev=false;for(let x=0;x<w.S.img.width;x++){const on=d[x*4+3]>128;if(on&&!prev)runs++;prev=on;}ok(runs===3,'촉 3개로 변경 ('+runs+')');}
  L.plate.tab.n=2;w.rebuildPlate(w.S);w.computeCore(true);
  w.setActiveItem(2);
  ok(w.S.loops.length===1,'바닥판: 벽 촉 자리는 가장자리 홈이라 외곽 1개 ('+w.S.loops.length+')');
  { // 왼쪽 가장자리 홈 2개, 위쪽 가장자리 홈 2개
    const im=w.S.img,ins=w.S._plateInset;const g=im.getContext('2d');
    const colL=g.getImageData(ins+1,0,1,im.height).data;let runs=0,prev=true;for(let y=ins;y<im.height-ins;y++){const on=colL[y*4+3]>128;if(!on&&prev)runs++;prev=on;}
    const rowT=g.getImageData(0,ins+1,im.width,1).data;let runs2=0,prev2=true;for(let x=ins;x<im.width-ins;x++){const on=rowT[x*4+3]>128;if(!on&&prev2)runs2++;prev2=on;}
    ok(runs===2&&runs2===2,`바닥판 가장자리 홈: 왼쪽 ${runs}개 · 뒤쪽 ${runs2}개`);
  }
  const ef=w.edgeFingers(w.S);
  ok(ef.length===2&&ef.every(f=>f.segs.length===2&&f.segs.every(sg=>sg.type==='in'&&Math.abs((sg.b-sg.a)-20.1)<0.01)),'홈 = 촉 폭 20 + 여유 0.1, 깊이 = 벽 두께');
  L.plate.tab.edge='right';w.rebuildPlate(w.S);
  ok(w.edgeFingers(w.S).some(f=>f.edge==='right'),'벽의 edge 를 오른쪽으로 바꾸면 홈도 오른쪽 가장자리로');L.plate.tab.edge='left';w.rebuildPlate(w.S);w.computeCore(true);
  // 캐릭터 2개 업로드 → 둘 다 스탠드(받침 없음) → 바닥판 슬롯 4개
  w.setActiveItem(3);
  await w.addImagesAsItems([charPng('a.png','#c36'),charPng('b.png','#36c')]);
  ok(P.items.length===5&&P.items[3].type==='stand'&&P.items[4].type==='stand'&&P.items[4].noBase===true,'캐릭터 2장 → 아이템 2개, 둘 다 스탠드(받침 없음)');
  ok(P.items[3].settings.fillHoles===true||P.items[3].settings.fillHoles==='true'||P.items[3].settings.fillHoles===$('fillHoles').defaultChecked,'캐릭터 설정은 그림형 기본값 (판 기본값 안 물려받음)');
  w.setActiveItem(2);
  ok(w.S.loops.length===3,'바닥판: 외곽(홈 포함) + 캐릭터 슬롯 2 = 3 ('+w.S.loops.length+')');
  const sl2=w.slotLayout(w.S);const chars=sl2.filter(s=>!s.edge);
  ok(chars.length===2&&chars[0].cx<chars[1].cx&&chars.every((s,i)=>Math.abs(s.w-(+P.items[3+i].settings.tabW))<0.01),'캐릭터 슬롯 2개, 가로, 각 캐릭터 촉 너비와 일치, 가운데 줄에 나란히');
  // 캐릭터 촉 너비 바꾸면 바닥판 슬롯도 따라옴
  w.setActiveItem(3);$('tabW').value=22;$('tabW').dispatchEvent(new w.Event('input',{bubbles:true}));w.S.settings.tabW='22';w.computeCore(true);
  w.setActiveItem(2);
  ok(w.slotLayout(w.S).some(s=>Math.abs(s.w-22)<0.01),'캐릭터 촉 22mm → 바닥판 슬롯 22mm 로 갱신');
  // 슬롯 위치 조정
  w.S.plate.slotAdj={[P.items[3].id]:{dx:10,dy:-5}};w.rebuildPlate(w.S);w.computeCore(true);
  ok(w.slotLayout(w.S).find(s=>s.id===P.items[3].id).cx>F.plate.w/3+10-0.01,'슬롯 위치 x+10 조정 반영');
  ok(!!$('plateGroup')&&$('plateGroup').querySelectorAll('[data-slotdx]').length===4,'바닥판 패널에 조정 행 4개 (벽 2 + 캐릭터 2)');

  // ===== 쉐이커: 파츠 여러 장, 구멍 없음 =====
  click($('assemblyPresets').querySelector('button[data-asm="shaker"]'));
  const parts=P.items.find(i=>i.name==='파츠');w.setActiveItem(P.items.indexOf(parts));
  const holey=png(g=>{g.fillStyle='#c36';g.beginPath();g.arc(60,60,55,0,7);g.fill();g.clearRect(50,50,20,20);g.clearRect(20,80,8,8);},120,120,'p1.png'); // 안에 구멍 있는 그림
  await w.addImagesAsItems([holey,charPng('p2.png','#3a3'),charPng('p3.png','#a33')]);
  const ps=P.items.filter(i=>i.name==='파츠'||/^p\d\.png$/.test(i.name));
  ok(ps.length===3&&ps.every(i=>i.type==='acrylic'&&i.kind==='art'),'파츠 3장 → 아크릴 그림형 3개');
  ok(ps.every(i=>i.holes.length===0),'파츠에 타공 없음');
  ok(ps[0].loops.length===1,'그림 안 구멍은 메워져 칼선 1개 (구멍 안 뚫림) → '+ps[0].loops.length);

  // ===== 누들 스토퍼: 덮개판 슬롯 =====
  click($('assemblyPresets').querySelector('button[data-asm="noodle"]'));
  const lid=P.items.find(i=>i.name==='덮개판'),ch=P.items.find(i=>i.name==='캐릭터');
  w.setActiveItem(P.items.indexOf(ch));await w.addImagesAsItems([charPng('n.png','#c36')]);
  w.setActiveItem(P.items.indexOf(lid));
  console.log('  덮개판 loops',w.S.loops.length,'slots',JSON.stringify(w.slotLayout(w.S)),'ch img',!!ch.img,'ch type',ch.type,'tabSpec',JSON.stringify(w.tabSpec(ch)),'slotKey',w.S._slotKey);
  ok(w.S.loops.length===2&&w.slotLayout(w.S).length===1&&!w.slotLayout(w.S)[0].vert,'덮개판: 외곽 + 캐릭터 촉 슬롯 1 (가로)');

  // ===== 스핀: 받침대에 그림 → 그림 모양 =====
  click($('assemblyPresets').querySelector('button[data-asm="spin"]'));
  const base=P.items.find(i=>i.name==='받침대');w.setActiveItem(P.items.indexOf(base));
  const star=NC.createCanvas(700,700);{const g=star.getContext('2d');g.fillStyle='#fc6';g.beginPath();for(let i=0;i<10;i++){const r=i%2?230:340,a=i*Math.PI/5-Math.PI/2;g.lineTo(350+Math.cos(a)*r,350+Math.sin(a)*r);}g.closePath();g.fill();} // 약 59mm 별, 가운데가 촉 슬롯(15×3)보다 넉넉히 큼
  base.plate.art=star;w.rebuildPlate(base);w.computeCore(true);
  ok(base.kind==='plate'&&base.loops.length===1&&Math.abs(mm(bboxOf(base.loops)[2]-bboxOf(base.loops)[0])-70)<1.5,'받침대(판): 그림을 올려도 칼선은 70mm 사각');
  // 본체에 그림을 올려 촉이 생기게
  const body=P.items.find(i=>i.name==='본체');w.setActiveItem(P.items.indexOf(body));await w.addImagesAsItems([charPng('body.png','#36c')]);w.setActiveItem(P.items.indexOf(base));w.computeCore(true);
  ok(base.loops.length===2,'받침대(판): 본체 촉 슬롯 1 → 칼선 2개');
  w.plateUseArtShape(base,true);w.computeCore(true);
  ok(base.kind==='art'&&base.img===star,'그림 모양으로 전환 → 그림형');
  ok(base.loops.length===2,'그림 모양 받침대에도 본체 촉 슬롯 유지 — 여백 2mm 뒤에 뚫려 메워지지 않음 (칼선 '+base.loops.length+'개)');
  const bbS=bboxOf(base.loops);
  ok(mm(bbS[2]-bbS[0])<69,`받침대 칼선이 별 모양 bbox (${mm(bbS[2]-bbS[0]).toFixed(1)}mm, 사각 70보다 작음)`);
  w.plateUseArtShape(base,false);w.computeCore(true);
  ok(base.kind==='plate'&&Math.abs(mm(bboxOf(base.loops)[2]-bboxOf(base.loops)[0])-70)<1.5&&base.loops.length===2,'규격 도형으로 복귀 (슬롯 유지)');

  console.log(fails?`${fails}개 실패`:'모두 통과');process.exit(fails?1:0);
})().catch(e=>{console.error('하네스 오류',e);process.exit(2);});
