// 다중 아이템 (3단계): 파일 여러 장 → 아이템 여러 개, 한 그림 나누기
const {boot}=require('./harness');
const {w,NC}=boot(process.argv[2]);
const $=id=>w.document.getElementById(id);
let fails=0;const ok=(c,m)=>{console.log((c?'PASS':'FAIL'),m);if(!c)fails++;};
const png=(draw,W=200,H=200,name='a.png')=>{const c=NC.createCanvas(W,H);draw(c.getContext('2d'));const buf=c.toBuffer('image/png');const f=new w.File([buf],name,{type:'image/png'});return f;};
// jsdom 의 Image 는 blob URL 을 못 읽으므로 loadImage 가 쓰는 URL.createObjectURL/Image 를 node-canvas 로 대체
const fileCanvas=new Map();
w.URL.createObjectURL=f=>{const k='blob:'+Math.random();fileCanvas.set(k,f);return k;};
const origImage=w.Image;
w.Image=function(){const img={};let _src='';Object.defineProperty(img,'src',{set(v){_src=v;const f=fileCanvas.get(v);f.arrayBuffer().then(ab=>NC.loadImage(Buffer.from(ab))).then(ci=>{img.naturalWidth=ci.width;img.naturalHeight=ci.height;img.width=ci.width;img.height=ci.height;img.__nc=ci;img.onload&&img.onload();});},get(){return _src;}});return img;};
// drawImage 가 이 가짜 Image 를 받으면 node-canvas Image 로
const CTX=NC.CanvasRenderingContext2D.prototype,od=CTX.drawImage;
CTX.drawImage=function(i,...a){return od.call(this,(i&&i.__nc)?i.__nc:i,...a);};

(async()=>{
  const P=w.project;
  $('dpi').value=300;w.S.type='acrylic';w.applyType();
  // 1) 파일 3장 → 아이템 3개
  const f1=png(g=>{g.fillStyle='#36c';g.beginPath();g.arc(100,100,80,0,7);g.fill();},200,200,'circle.png');
  const f2=png(g=>{g.fillStyle='#c63';g.fillRect(20,20,160,100);},200,140,'rect.png');
  const f3=png(g=>{g.fillStyle='#3a3';g.fillRect(50,10,40,180);},120,200,'bar.png');
  await w.addImagesAsItems([f1,f2,f3]);
  ok(P.items.length===3,'파일 3장 → 아이템 3개 ('+P.items.length+')');
  ok(P.items.map(i=>i.name).join(',')==='circle.png,rect.png,bar.png','아이템 이름 = 파일명');
  ok(P.items.every(i=>i.img&&i.loops&&i.loops.length>0),'세 아이템 모두 칼선 계산됨');
  ok(w.S===P.items[2],'마지막으로 올린 것이 활성');
  const bar=$('itemBar');ok(bar.style.display==='flex'&&bar.querySelectorAll('.item[data-i]').length===3,'아이템 바에 칩 3개');
  // 칩 클릭으로 전환
  bar.querySelector('.item[data-i="0"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  ok(w.S===P.items[0]&&w.S.W===200&&w.S.H===200,'칩 클릭 → 아이템1 활성');

  // 2) 한 그림에 개체 3개 → 나누기
  const f4=png(g=>{g.fillStyle='#c36';g.beginPath();g.arc(60,80,40,0,7);g.fill();g.fillStyle='#63c';g.fillRect(150,40,80,110);g.fillStyle='#3c6';g.beginPath();g.arc(300,90,45,0,7);g.fill();g.fillRect(290,140,20,40);},360,200,'trio.png');
  await w.addImagesAsItems([f4]);
  ok(P.items.length===4&&w.S.name==='trio.png','trio.png 가 4번째 아이템으로 추가');
  const before=P.items.length;
  const r=w.splitCurrentItem();
  ok(r===true&&P.items.length===before+2,'나누기 → 아이템 3개로 대체 (총 '+P.items.length+')');
  const parts=P.items.slice(3);
  ok(parts.map(p=>p.name).join(',')==='trio-1,trio-2,trio-3','조각 이름 trio-1..3 (왼쪽부터)');
  ok(parts.every(p=>p.img&&p.loops.length>0),'조각마다 칼선 계산됨');
  ok(parts[0].W<parts[2].W&&parts[1].W<parts[2].W,'조각 크기가 각 개체 bbox (세 번째가 가장 큼)');
  ok(w.S===parts[0],'나눈 뒤 첫 조각이 활성');
  // 조각 3에 붙어 있던 작은 사각(파편)이 조각 3에 포함됐는지: 높이가 원 지름(90)보다 큼
  ok(parts[2].H>95,'흡수된 파편이 같은 조각에 포함됨 (H='+parts[2].H+')');
  // 나눌 게 없을 때
  ok(w.splitCurrentItem()===false,'개체 하나짜리는 나누기 거부');

  // 3) 삭제 후 바 갱신
  w.removeItem(P.items.indexOf(w.S));
  ok(P.items.length===5&&bar.querySelectorAll('.item[data-i]').length===5,'삭제 후 칩 5개');

  console.log(fails?`${fails}개 실패`:'모두 통과');process.exit(fails?1:0);
})().catch(e=>{console.error('하네스 오류',e);process.exit(2);});
