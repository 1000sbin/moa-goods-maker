// Project/Item 모델 검증 (2단계)
//   아이템 2개에 다른 그림·다른 설정을 주고 오갈 때 각자 독립적으로 계산되고, 패널 값이 아이템별로 보존되는지
const path=require('path');
const {boot}=require('./harness');
const {w,NC}=boot(process.argv[2]);
const $=id=>w.document.getElementById(id);
const fire=(el,ev)=>el.dispatchEvent(new w.Event(ev,{bubbles:true}));
let fails=0;const ok=(c,m)=>{console.log((c?'PASS':'FAIL'),m);if(!c)fails++;};

const circle=(r)=>{const c=NC.createCanvas(200,200);const g=c.getContext('2d');g.fillStyle='#36c';g.beginPath();g.arc(100,100,r,0,Math.PI*2);g.fill();return c;};
const rect=()=>{const c=NC.createCanvas(200,200);const g=c.getContext('2d');g.fillStyle='#c63';g.fillRect(30,30,140,140);return c;};
const bboxOf=loops=>loops.flat().reduce((b,p)=>[Math.min(b[0],p[0]),Math.min(b[1],p[1]),Math.max(b[2],p[0]),Math.max(b[3],p[1])],[1e9,1e9,-1e9,-1e9]).map(Math.round);

(async()=>{
  const P=w.project;
  ok(P.items.length===1&&w.S===P.items[0],'초기: 아이템 1개, S 가 그것을 가리킴');

  // 아이템 1: 원, 아크릴, 여백 3
  $('dpi').value=300;
  w.S.type='acrylic';w.applyType();
  w.setArtSource(circle(90),200,200);
  $('offset').value=3;fire($('offset'),'input');
  w.computeCore(true);
  const bb1=bboxOf(w.S.loops);const loops1=w.S.loops.length;
  ok(w.S.settings.offset==='3','아이템1 설정 저장: offset=3');

  // 아이템 2: 사각형, 키링(타공), 여백 6
  const it2=w.addItem('그림 2');
  w.setActiveItem(1);
  ok(w.S===it2&&P.selection[0]===it2.id,'전환: S 가 아이템2');
  ok(it2.settings.offset==='3','새 아이템은 전환 시점의 패널 값(offset=3)을 물려받음');
  w.S.type='ring_hole';w.applyType();
  w.setArtSource(rect(),200,200);
  $('offset').value=6;fire($('offset'),'input');
  w.computeCore(true);
  const bb2=bboxOf(w.S.loops);
  ok(w.S.holes.length>=1,'아이템2: 타공 생성됨 (ring_hole)');
  ok(bb2[2]-bb2[0]>bb1[2]-bb1[0],'아이템2 칼선 bbox 가 아이템1보다 큼 (사각 + 여백 6)');

  // 다시 아이템 1 — 설정·계산 결과 그대로
  w.setActiveItem(0);
  ok(w.S===P.items[0],'되돌아감: S 가 아이템1');
  ok($('offset').value==='3','패널에 아이템1 값(offset=3) 복원');
  ok(w.S.type==='acrylic'&&w.S.holes.length===0,'아이템1 타입 acrylic 유지, 타공 없음');
  ok(JSON.stringify(bboxOf(w.S.loops))===JSON.stringify(bb1)&&w.S.loops.length===loops1,'아이템1 칼선 재계산 결과 동일');
  ok($('types').querySelector('.on')&&$('types').querySelector('.on').dataset.t==='acrylic','타입 버튼 하이라이트가 acrylic');

  // 아이템2로 가서 패널값 확인
  w.setActiveItem(1);
  ok($('offset').value==='6','아이템2 패널 offset=6');
  ok($('types').querySelector('.on').dataset.t==='ring_hole','타입 버튼 하이라이트가 ring_hole');

  // 프로젝트 공용 설정: dpi 는 아이템 무관
  $('dpi').value=150;fire($('dpi'),'change');
  w.setActiveItem(0);
  ok($('dpi').value==='150'&&P.sheet.dpi==='150','dpi 는 project.sheet 에 저장되고 아이템 전환에 안 바뀜');

  // 삭제
  w.removeItem(1);
  ok(P.items.length===1&&w.S===P.items[0],'아이템2 삭제 후 아이템1 활성');
  w.removeItem(0);
  ok(P.items.length===1,'마지막 아이템은 삭제 안 됨');

  console.log(fails?`${fails}개 실패`:'모두 통과');process.exit(fails?1:0);
})().catch(e=>{console.error('하네스 오류',e);process.exit(2);});
