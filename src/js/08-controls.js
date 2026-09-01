// ===== 컨트롤 =====
$('thresh').oninput=()=>{$('thV').textContent=$('thresh').value;recompute(false);};
$('offset').oninput=()=>{$('offV').textContent=(+$('offset').value).toFixed(1);recompute(false);};
$('smooth').oninput=()=>{$('smV').textContent=['각지게','보통','부드럽게','매우 부드럽게','뭉툭하게','아주 뭉툭하게'][$('smooth').value];recompute(false,180);};
$('hd').oninput=()=>{$('hdV').textContent=(+$('hd').value).toFixed(1);S.type==='ring_tab'?recompute(false):(render(),updateInfo());};
$('wall').oninput=()=>recompute(false);
$('dpi').onchange=()=>{presetSizes();recompute(true);};
$('rot').onchange=()=>setRot($('rot').value,false);
$('rotSl').oninput=()=>setRot($('rotSl').value,true);
$('rotL').onclick=()=>setRot(((+S.rot||0)-90+540)%360-180,false);
$('rotR').onclick=()=>setRot(((+S.rot||0)+90+540)%360-180,false);
$('rotZero').onclick=()=>setRot(0,false);
$('bgmode').onchange=()=>recompute(true);
$('fillHoles').onchange=()=>recompute(true);
$('fillHolesMax').oninput=()=>{if($('fillHoles').checked)recompute(true);};
$('gapClose').oninput=()=>{$('gapCloseV').textContent=$('gapClose').value;recompute(true,180);}; // 클로징이 무거워 디바운스
$('cutcol').oninput=render;$('cutw').oninput=render;
['tabW','tabH','baseW','baseH','acr'].forEach(id=>$(id).oninput=()=>recompute(false));
$('korottoFlat').oninput=()=>{$('korottoFlatV').textContent=$('korottoFlat').value;recompute(false);};
$('korottoRad').oninput=()=>{$('korottoRadV').textContent=(+$('korottoRad').value).toFixed(1);recompute(false);};
$('korottoMode').onchange=()=>{applyKorottoMode();recompute(true);};
$('rolySway').oninput=()=>{$('rolySwayV').textContent=$('rolySway').value;recompute(false);};
$('rolyManual').onchange=()=>{applyKorottoMode();recompute(false);};
$('rolyR').oninput=()=>recompute(false);
$('rolyFix').onclick=rolyAutoFix;
$('slotOff').oninput=()=>{$('slotOffV').textContent=(+$('slotOff').value).toFixed(1);recompute(false);};
$('cornerRound').oninput=()=>{$('cornerRoundV').textContent=(+$('cornerRound').value).toFixed(1);recompute(false,220);}; // 필렛은 모폴로지가 무거워 디바운스 길게 — 드래그 중 누적 계산 방지
function applyTargetSize(which){
  if(!S.rawBbox)return;
  const pw=S.rawBbox.maxX-S.rawBbox.minX,ph=S.rawBbox.maxY-S.rawBbox.minY;
  const v=+(which==='w'?$('targetW').value:$('targetH').value);
  if(!(v>0))return;
  const d=Math.round(((which==='w'?pw:ph)/v)*25.4);
  if(d<72||d>1200)return;
  $('dpi').value=d;S.dpiDetected=null;
  const o=which==='w'?ph*v/pw:pw*v/ph;
  (which==='w'?$('targetH'):$('targetW')).value=o.toFixed(1);
  presetSizes();recompute(true);
}
$('boardOn').onchange=()=>{$('boardRow').style.display=$('boardOn').checked?'block':'none';if(S.img)recompute(true);};
$('boardCenter').onclick=()=>{S.imgOffX=0;S.imgOffY=0;if(S.img)recompute(true);};
$('boardW').onchange=$('boardH').onchange=()=>{if(S.img&&$('boardOn').checked)recompute(true);};
$('targetW').onchange=()=>applyTargetSize('w');
$('targetH').onchange=()=>applyTargetSize('h');
$('dpiPreset').onchange=()=>{if($('dpiPreset').value){$('dpi').value=$('dpiPreset').value;S.dpiDetected=null;presetSizes();recompute(true);}};
$('showAnchors').onchange=()=>{S.showAnchors=$('showAnchors').checked;if(S.img)render();};
$('anchorMinBtn').onclick=()=>{
  S.anchorMin=!S.anchorMin;
  $('anchorMinBtn').classList.toggle('primary',S.anchorMin);
  $('anchorMinBtn').classList.toggle('ghost',!S.anchorMin);
  $('anchorMinBtn').textContent=S.anchorMin?t('⚓ 앵커 최소화 중 (눌러서 해제)'):t('⚓ 앵커 수 최소화');
  for(const l of S.loops||[])delete l._fk;
  for(const l of S.baseLoops||[])delete l._fk;
  if(S.img){render();updateInfo();}
};
$('baseShape').onchange=()=>{$('baseRadRow').style.display=$('baseShape').value==='rect'?'flex':'none';recompute(false);};
$('baseRad').oninput=()=>recompute(false);
$('baseSrc').onchange=()=>{applyBaseArtUI();recompute(true);};
$('basePick').onchange=()=>recompute(true);
$('baseUpW').onchange=()=>{if(S.img)recompute(true);};
$('baseImgPick').onclick=async()=>{
  const fs2=await openImages(false,'goods-base');
  const f=fs2&&fs2[0];if(!f)return;
  const img=await loadImageFile(f);
  S.baseImg=img;$('baseSrc').value='upload';applyBaseArtUI();
  if(S.img)recompute(true);else updBaseUpNote();
};
$('baseImgFile').onchange=async e=>{
  const f=e.target.files&&e.target.files[0];e.target.value='';
  if(!f)return;
  S.baseImg=await loadImageFile(f);$('baseSrc').value='upload';applyBaseArtUI();
  if(S.img)recompute(true);else updBaseUpNote();
};
$('baseImgClear').onclick=()=>{S.baseImg=null;S.baseUp=null;applyBaseArtUI();if(S.img)recompute(true);else updBaseUpNote();};
const SHAPE_PRESETS={clip_normal:{kind:'circle',w:32,h:32,r:0},clip_wide:{kind:'rrect',w:55,h:32,r:6},clip_magnet:{kind:'circle',w:40,h:40,r:0}};
function updateShapeRadRow(){$('shapeRadRow').style.display=$('shapeKind').value==='rrect'?'flex':'none';}
$('shapeOn').onchange=()=>{
  const on=$('shapeOn').checked;
  $('shapeControls').classList.toggle('hide',!on);
  if(on&&!S.shapePlaced&&S.img){$('shapeModalBg').classList.add('show');} // 처음 켤 때만 크기 물어보기
  else render();
  updateInfo();
};
$('shapePreset').onchange=()=>{
  const p=SHAPE_PRESETS[$('shapePreset').value];
  if(p){$('shapeKind').value=p.kind;$('shapeW').value=p.w;$('shapeH').value=p.h;$('shapeR').value=p.r;updateShapeRadRow();}
  render();updateInfo();
};
$('shapeKind').onchange=()=>{$('shapePreset').value='custom';updateShapeRadRow();render();};
['shapeW','shapeH','shapeR'].forEach(id=>$(id).oninput=()=>{$('shapePreset').value='custom';render();updateInfo();});
$('shapeCol').oninput=render;
$('shapeCenter').onclick=()=>{S.shapePlaced=false;render();}; // 다음 렌더에서 중앙 재배치
function setShapeBtnUI(){
  $('shapeMoveBtn').classList.toggle('primary',S.moveShapeMode);
  $('shapeMoveBtn').classList.toggle('ghost',!S.moveShapeMode);
  $('shapeMoveBtn').textContent=S.moveShapeMode?t('✓ 이동 중 (눌러서 끄기)'):t('🖐 드래그로 도형 옮기기');
}
$('shapeMoveBtn').onclick=()=>{S.moveShapeMode=!S.moveShapeMode;
  if(S.moveShapeMode){S.moveTabMode=false;setTabBtnUI();}
  setShapeBtnUI();view.style.cursor=S.moveShapeMode?'move':'grab';};
updateShapeRadRow();
// ===== 도형 크기 모달 (도형을 처음 켤 때) =====
function applyShapeAndClose(kind,w,h,r,presetName){
  $('shapeKind').value=kind;$('shapeW').value=w;$('shapeH').value=h;$('shapeR').value=r;
  $('shapePreset').value=presetName||'custom';
  updateShapeRadRow();
  $('shapeModalBg').classList.remove('show');
  render();updateInfo();
}
$('shapeModalBg').querySelectorAll('[data-preset]').forEach(btn=>{
  btn.onclick=()=>{const p=SHAPE_PRESETS[btn.dataset.preset];applyShapeAndClose(p.kind,p.w,p.h,p.r,btn.dataset.preset);};
});
$('mShapeApply').onclick=()=>{
  const kind=$('mShapeKind').value;
  applyShapeAndClose(kind,+$('mShapeW').value||32,+$('mShapeH').value||32,kind==='rrect'?4:0,'custom');
};
$('shapeModalBg').addEventListener('click',e=>{
  if(e.target===$('shapeModalBg')){$('shapeModalBg').classList.remove('show');render();}
});
$('holeAuto').onclick=()=>{S.holeOffs={};recompute(false);};
$('earAuto').onclick=()=>{S.earOffs={};recompute(false);};
function setTabBtnUI(){
  $('tabMoveBtn').classList.toggle('primary',S.moveTabMode);
  $('tabMoveBtn').classList.toggle('ghost',!S.moveTabMode);
  $('tabMoveBtn').textContent=S.moveTabMode?t('✓ 이동 중 (눌러서 끄기)'):t('🖐 드래그로 촉 위치 옮기기');
}
$('tabMoveBtn').onclick=()=>{S.moveTabMode=!S.moveTabMode;if(S.moveTabMode){S.moveShapeMode=false;setShapeBtnUI();}
  setTabBtnUI();view.style.cursor=S.moveTabMode?'move':'grab';};
$('tabAuto').onclick=()=>{S.tabOffs={};S.slotOffs={};recompute(false);};

// ===== 드래그 =====
function pos(e){const r=view.getBoundingClientRect();const cx=(e.touches?e.touches[0].clientX:e.clientX)-r.left,cy=(e.touches?e.touches[0].clientY:e.clientY)-r.top;return{x:cx/S.scale,y:cy/S.scale};}
function clientPos(e){return{cx:e.touches?e.touches[0].clientX:e.clientX,cy:e.touches?e.touches[0].clientY:e.clientY};}
view.addEventListener('pointerdown',e=>{
  if(project.ui.view==='board'){boardPointerDown(e);return;} // 전체 보기: 아이템 고르기·끌어 옮기기
  if(project.ui.view==='final')return; // 완성 미리보기: 조작 없음
  const p=pos(e);let hit=false;
  if(S.type==='ring_hole'||S.type==='ring_tab'){
    const rad=(S.type==='ring_hole'?px((+$('hd').value)/2):earRadius())+px(3);
    let ci=-1,bd=1e18;
    S.holes.forEach((h,i)=>{const d=Math.hypot(p.x-h.x,p.y-h.y);if(d<=rad&&d<bd){bd=d;ci=i;}});
    const kind=S.type==='ring_hole'?'hole':'ear';
    if(ci>=0){
      hit=true;
      if(e.shiftKey){ // Shift+클릭: 선택 토글 (드래그 안 함)
        if(S.selKind!==kind){S.selKind=kind;S.selSet=new Set();}
        S.selSet.has(ci)?S.selSet.delete(ci):S.selSet.add(ci);
        render();
      }else{
        if(S.selKind!==kind||!S.selSet.has(ci)){S.selKind=kind;S.selSet=new Set([ci]);} // 미선택 대상 클릭 → 단독 선택
        const offs=kind==='hole'?S.holeOffs:S.earOffs;
        S.dragging=kind;
        S.dragStart={px:p.x,py:p.y,items:[...S.selSet].map(i=>{const o=offs[i]||{x:0,y:0};return{i,ox:o.x||0,oy:o.y||0};})};
        render();
      }
    }else if(!e.shiftKey&&S.selSet.size){S.selKind=null;S.selSet=new Set();render();} // 빈 곳 클릭 → 선택 해제
  }
  if(!hit&&S.type==='stand'&&S.slotRects){ // 받침 슬롯 직접 드래그 (위아래)
    for(const r2 of S.slotRects){
      if(Math.abs(p.x-r2.cx)<=r2.w/2+px(2)&&Math.abs(p.y-r2.cy)<=r2.h/2+px(2)){
        const o=S.slotOffs[r2.i]||{y:0};
        S.dragging='slot';hit=true;
        S.dragStart={px:p.x,py:p.y,oy:o.y||0,comp:r2.i};
        break;
      }
    }
  }
  if(!hit&&S.moveShapeMode&&$('shapeOn').checked){S.dragging='shape';S.dragStart={px:p.x,py:p.y,ox:S.shapeX,oy:S.shapeY};}
  else if(!hit&&S.type==='stand'&&S.moveTabMode&&S.standComps){
    let ci=0,bd=1e18;
    S.standComps.forEach((c,i)=>{const d=Math.abs(p.x-c.tabCx);if(d<bd){bd=d;ci=i;}}); // 포인터에 가장 가까운 촉
    if(e.shiftKey){ // Shift+클릭: 촉 선택 토글
      if(S.selKind!=='tab'){S.selKind='tab';S.selSet=new Set();}
      S.selSet.has(ci)?S.selSet.delete(ci):S.selSet.add(ci);
      render();
    }else{
      if(S.selKind!=='tab'||!S.selSet.has(ci)){S.selKind='tab';S.selSet=new Set([ci]);}
      S.dragging='tab';
      S.dragStart={px:p.x,py:p.y,items:[...S.selSet].map(i=>{const o=S.tabOffs[i]||{x:0,y:0};return{i,ox:o.x||0,oy:o.y||0};})};
      render();
    }
  }
  if(!S.dragging&&!hit&&S.boardOn&&S.img){ // 대지 모드: 빈 곳 드래그 = 그림을 대지 안에서 이동
    S.dragging='image';
    S.dragStart={px:p.x,py:p.y,ox:S.imgOffX||0,oy:S.imgOffY||0};
  }
  if(S.dragging){view.classList.add('dragging');view.setPointerCapture(e.pointerId);}
});
view.addEventListener('pointermove',e=>{
  if(project.ui.view==='board'){boardPointerMove(e);return;}
  if(project.ui.view==='final')return;
  if(!S.dragging||!S.dragStart)return;
  const p=pos(e);
  let dx=p.x-S.dragStart.px,dy=p.y-S.dragStart.py;
  if(e.shiftKey){if(Math.abs(dx)>=Math.abs(dy))dy=0;else dx=0;} // Shift: 수평/수직 축 고정
  const cxArt=S.rawBbox?(S.rawBbox.minX+S.rawBbox.maxX)/2:null;
  const MAG=px(1.5); // 그림 세로 중앙선 자석 범위
  if(S.dragging==='slot'){ // 슬롯: 세로만 (클램프는 계산에서)
    S.slotOffs[S.dragStart.comp]={y:S.dragStart.oy+tomm(dy)};
    recompute(false);return;
  }
  if(S.dragging==='image'){
    let ndx=dx,ndy=dy;
    S._imgDragPreview={dx:ndx,dy:ndy};
    render();return;
  }
  if(S.dragging==='shape'){
    let nx=S.dragStart.ox+dx;const ny=S.dragStart.oy+dy;
    if(!e.shiftKey&&cxArt!==null&&Math.abs(nx-cxArt)<MAG)nx=cxArt;
    S.shapeX=nx;S.shapeY=ny;render();return;
  }

  if(S.dragging==='hole'||S.dragging==='ear'||S.dragging==='tab'){
    const mx=tomm(dx),my=tomm(dy);
    const single=S.dragStart.items.length===1;
    const offs=S.dragging==='hole'?S.holeOffs:(S.dragging==='ear'?S.earOffs:S.tabOffs);
    for(const it of S.dragStart.items){ // 선택된 전원에 같은 이동량 적용
      let ox=it.ox+mx,oy=it.oy+my;
      if(single&&!e.shiftKey&&Math.abs(ox)<1.2)ox=0; // 자석은 단독 이동일 때만
      offs[it.i]={x:ox,y:oy};
    }
    if(S.dragging==='hole'){ // 타공은 마스크 불변 — 위치만 즉시 갱신
      for(const it of S.dragStart.items){const h=S.holes[it.i];if(!h)continue;const o=offs[it.i];h.x=h.ax+px(o.x);h.y=h.ay+px(o.y);}
      render();
    }else recompute(false); // 고리·촉은 마스크 재계산
  }
});
view.addEventListener('pointerup',()=>{
  if(project.ui.view==='board'){boardPointerUp();return;}
  if(project.ui.view==='final')return;
  if(S.dragging==='image'&&S._imgDragPreview){
    S.imgOffX=(S.dragStart.ox||0)+tomm(S._imgDragPreview.dx);
    S.imgOffY=(S.dragStart.oy||0)+tomm(S._imgDragPreview.dy);
    S._imgDragPreview=null;
    S.dragging=null;S.dragStart=null;view.classList.remove('dragging');
    recompute(true);return;
  }
  S.dragging=null;S.dragStart=null;view.classList.remove('dragging');
});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&S.selSet.size){S.selKind=null;S.selSet=new Set();render();}});
window.addEventListener('resize',()=>{if(S.img)fitAndRender();});
