// ===== 타입 선택 =====
const HINTS={acrylic:'외곽 칼선만 만들어요 (일반 아크릴용).',sticker:'외곽 칼선만 만들어요. 타공·고리 없음.',sheet:'한 이미지 안의 여러 스티커를 각각 인식해 개별 칼선을 따요. 서로 겹치지 않게 배치된 시트용이에요.',ring_hole:'디자인에 직접 타공 구멍을 뚫어요.',
  ring_tab:'상단에 고리(귀)를 만들고 그 안에 구멍을 뚫어요. 그림은 안 뚫려요.',stand:'하단에 촉이 생기고, 슬롯 뚫린 받침이 따로 만들어져요. 받침 그림을 따로 올리면 그 모양으로 나와요.',
  stand_nb:'하단에 촉만 만들어요. 받침은 안 나가요 — 이미 있거나 따로 주문할 때.',
  korotto:'하단을 평평하고 두툼하게 만들어 받침 없이 그 자체로 서는 스탠드예요.'};
$('types').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  [...$('types').children].forEach(x=>x.classList.remove('on'));b.classList.add('on');
  S.type=b.dataset.t;S.noBase=b.dataset.nb==='1';
  const hk='HINT_'+S.type+(S.noBase?'_nb':'');
  $('typeHint').textContent=(TRS[LANG]&&(TRS[LANG][hk]||TRS[LANG]['HINT_'+S.type]))||HINTS[hk]||HINTS[S.type];applyType();
  S.holeOffs={};S.earOffs={};S.tabOffs={};S.slotOffs={};S.selKind=null;S.selSet=new Set();
  if(S.moveTabMode){S.moveTabMode=false;setTabBtnUI();}
  if(S.img)recompute(true);
  if(typeof renderRail==='function')renderRail();});
// ===== 탭 전환 =====
$('tabs').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  [...$('tabs').children].forEach(x=>x.classList.remove('on'));b.classList.add('on');
  document.querySelectorAll('.tabpage').forEach(pg=>pg.classList.toggle('on',pg.id===b.dataset.tab));
});

function applyType(){
  const t=S.type;
  $('holeGroup').classList.toggle('hide',!(t==='ring_hole'||t==='ring_tab'));
  $('wallRow').classList.toggle('hide',t!=='ring_tab');
  $('holeAuto').classList.toggle('hide',t!=='ring_hole');
  $('earAuto').classList.toggle('hide',t!=='ring_tab');
  updateWhiteLabels();
  $('standGroup').classList.toggle('hide',t!=='stand');
  $('korottoGroup').classList.toggle('hide',t!=='korotto');
  applyKorottoMode();applyBaseArtUI();
}
function applyKorottoMode(){
  const roly=$('korottoMode').value==='roly';
  $('rolyBox').classList.toggle('hide',!roly);
  $('korottoRadBox').classList.remove('hide'); // 오뚝이도 원호 끝 ↔ 측벽 코너가 각지므로 라운드가 필요
  $('rolyRRow').classList.toggle('hide',!$('rolyManual').checked);
  $('rolySway').disabled=$('rolyManual').checked;
}
applyType();

