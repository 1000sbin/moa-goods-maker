// 위자드 (4단계): 레일·페이지·제품별 종류 필터·잠금·완성 미리보기
const fs=require('fs'),path=require('path'),os=require('os');
const {boot}=require('./harness');
const {w,NC}=boot(process.argv[2]);
const $=id=>w.document.getElementById(id);
const P=w.project;
let fails=0;const ok=(c,m)=>{console.log((c?'PASS':'FAIL'),m);if(!c)fails++;};
const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const vis=id=>{const el=$(id);return !!el&&!el.closest('.step-page:not(.on)')&&!el.classList.contains('hide');};
const railBtn=n=>$('railSteps').querySelector(`button[data-step="${n}"]`);

(async()=>{
  ok(!!$('rail')&&!!$('railSteps')&&!$('tabs'),'레일 생성, 옛 탭 제거');
  ok(w.document.querySelectorAll('.step-page').length===6&&$('step1').classList.contains('on'),'페이지 6개, 시작은 1단계');
  ok($('rfLang')&&$('rfLang').contains($('langSel'))&&$('rfTheme')&&$('rfTheme').querySelector('.theme-swatches'),'레일 하단에 언어·테마 이동');
  ok(!!$('rfUpd')&&/v\d+\.\d+\.\d+/.test($('railFoot').textContent),'버전·업데이트 확인 버튼');
  // 모든 기존 컨트롤이 살아 있음
  for(const id of ['file','types','offset','bgmode','gapClose','holeGroup','korottoMode','tabW','shapeGroup','whiteLayer','expPdf','batchPick','multiExp'])ok(!!$(id),'컨트롤 유지: '+id);
  // 잠금: 이미지 전엔 3단계부터
  ok(railBtn(3).classList.contains('lock')&&railBtn(6).classList.contains('lock')&&!railBtn(2).classList.contains('lock'),'이미지 전: 3단계 이후 잠김');
  w.goStep(5);ok(P.ui.step===2,'잠긴 단계로 가면 2단계로');
  // 제품 선택 → 종류 필터
  click($('products').querySelector('button[data-p="sticker"]'));
  ok(P.product==='sticker'&&P.ui.step===2,'스티커 선택 → 2단계');
  const typeBtns=[...$('types').children].filter(b=>b.dataset&&b.dataset.t);
  const shown=typeBtns.filter(b=>!b.classList.contains('hide')).map(b=>b.dataset.t);
  ok(shown.join(',')==='sticker,sheet','스티커 종류만 보임: '+shown.join(','));
  ok(w.S.type==='sticker','허용되지 않던 타입(ring_hole) → 첫 허용 타입(sticker)으로 자동 전환');
  ok(!railBtn(4),'스티커면 부품 단계가 레일에서 사라짐');
  click($('products').querySelector('button[data-p="acrylic"]'));
  const shown2=typeBtns.filter(b=>!b.classList.contains('hide')).map(b=>b.dataset.t+(b.dataset.nb?'_nb':''));
  ok(shown2.join(',')==='ring_hole,ring_tab,stand,stand_nb,korotto,acrylic','아크릴 종류 6개: '+shown2.join(','));
  ok(!!railBtn(4),'아크릴이면 부품 단계 있음');
  click($('products').querySelector('button[data-p="assembly"]'));
  ok(!$('assemblyHint').classList.contains('hide')&&typeBtns.every(b=>b.classList.contains('hide')),'조립 굿즈: 안내 + 종류 버튼 없음');
  click($('products').querySelector('button[data-p="acrylic"]'));

  // 이미지 올리면 잠금 해제
  const c=NC.createCanvas(200,200);const g=c.getContext('2d');g.fillStyle='#36c';g.beginPath();g.arc(100,100,80,0,7);g.fill();
  w.setArtSource(c,200,200);w.computeCore(true);w.goStep(2);
  ok(!railBtn(3).classList.contains('lock')&&!railBtn(6).classList.contains('lock'),'이미지 후 잠금 해제');
  // 다음/이전
  click($('wizNext'));ok(P.ui.step===3&&$('step3').classList.contains('on'),'다음 → 3단계');
  click($('wizNext'));click($('wizNext'));ok(P.ui.step===5,'→ 5단계');
  click($('wizPrev'));ok(P.ui.step===4,'이전 → 4단계');
  click(railBtn(6));ok(P.ui.step===6&&$('wizNext').disabled&&$('wizNext').textContent==='완료','레일 클릭 → 6단계, 완료 버튼');
  ok(railBtn(2).classList.contains('done')&&railBtn(2).textContent.includes('✓'),'지난 단계는 ✓');
  // 스티커 제품에서 4단계 건너뜀
  click($('products').querySelector('button[data-p="sticker"]'));w.goStep(3);click($('wizNext'));
  ok(P.ui.step===5,'스티커: 3 → 다음 = 5 (부품 건너뜀)');

  // 완성 미리보기
  click($('products').querySelector('button[data-p="acrylic"]'));
  $('types').querySelector('button[data-t="ring_hole"]').click();w.computeCore(true);w.renderItemBar();
  ok(!!$('itemFinal'),'아이템 바에 완성 보기 버튼');
  click($('itemFinal'));
  ok(P.ui.view==='final'&&$('itemFinal').classList.contains('on')&&$('stageInfo').textContent.includes('완성 미리보기'),'완성 보기 켬');
  const out=path.join(os.tmpdir(),'moa-final.png');fs.writeFileSync(out,w.document.getElementById('view').toBuffer?w.document.getElementById('view').toBuffer('image/png'):Buffer.from(w.document.getElementById('view').toDataURL().split(',')[1],'base64'));
  console.log('  완성 미리보기 →',out);
  click($('itemFinal'));ok(P.ui.view==='draft','완성 보기 끔');
  console.log(fails?`${fails}개 실패`:'모두 통과');process.exit(fails?1:0);
})().catch(e=>{console.error('하네스 오류',e);process.exit(2);});
