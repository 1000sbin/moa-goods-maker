// ===== 조립 굿즈: 판형 아이템 · 프리셋 · 가이드 가져오기 =====
// 판형(plate) 아이템은 '모양이 정해진 판'이다. 칼선을 그림에서 뽑지 않고 규격(원·사각·둥근사각) 또는 가이드 파일(PNG/SVG)의
// 실루엣이 곧 칼선이다. 구현은 판 모양을 불투명 이미지로 합성해 S.img 로 넣는 것 — 그러면 기존 파이프라인(마스크→칼선→화이트→내보내기)이
// 그대로 돈다. 판에 넣는 그림은 판 안에 맞춰(contain) 그려 넣고 밖은 잘린다. 가이드 PNG의 투명 구멍(슬롯·타공)은 그대로 칼선이 된다.

const PLATE_DEFAULT_SETTINGS={offset:'0',cornerRound:'1',fillHoles:false,gapClose:'0',smooth:'3',thresh:'128',bgmode:'alpha'}; // smooth 3: 곡선 판(원·둥근사각)의 계단을 없애 앵커를 줄임. 모서리 이탈 0.06mm 이내(측정)

function newPlateItem(name,plate){ // plate: {tpl:'circle'|'rect'|'rrect'|'guide', w,h (mm), r (mm), guide:image, noart:bool}
  const it=newItem(name);it.kind='plate';it.role='panel';it.type='acrylic';
  it.plate=Object.assign({tpl:'rect',w:70,h:70,r:6,art:null,noart:false,guide:null},plate||{});
  Object.assign(it.settings,PLATE_DEFAULT_SETTINGS);
  return it;
}
function plateShapePath(ctx,p,w,h){ // 캔버스 px 좌표 (0,0)-(w,h)에 판 모양
  ctx.beginPath();
  if(p.tpl==='circle'){ctx.ellipse(w/2,h/2,w/2,h/2,0,0,Math.PI*2);}
  else if(p.tpl==='rrect'){const r=Math.min(w/2,h/2,px(p.r||0));ctx.moveTo(r,0);ctx.arcTo(w,0,w,h,r);ctx.arcTo(w,h,0,h,r);ctx.arcTo(0,h,0,0,r);ctx.arcTo(0,0,w,0,r);ctx.closePath();}
  else{ctx.rect(0,0,w,h);}
}
// 판 이미지를 다시 합성해 S(=it)에 넣는다. dpi 가 바뀌면 크기가 달라지므로 prepareSource 에서 스탬프로 재호출.
// 아이템의 '촉' 폭·두께(mm). 판이면 plate.tab, 그림형 스탠드면 촉 너비 설정
// 촉 n개의 중심 위치 (판 폭에 대한 비율 0..1) — 벽 판과 바닥판 슬롯이 같은 함수를 써서 항상 맞물린다
function tabFractions(n){n=Math.max(1,Math.min(6,n|0||1));const out=[];for(let i=0;i<n;i++)out.push((i+1)/(n+1));return out;}
function tabSpec(it){
  if(it.kind==='plate'&&it.plate&&it.plate.tab)return {w:it.plate.tab.w,t:it.plate.tab.t||3,edge:it.plate.tab.edge||'left',n:it.plate.tab.n||1,len:it.plate.w};
  if(it.kind==='art'&&it.type==='stand'&&it.img){const tw=+(it.settings.tabW||$('tabW').value)||15;return {w:tw,t:+(it.settings.acr||$('acr').value)||3};}
  return null;
}
// 슬롯을 받는 판(바닥판·덮개판)에 꽂히는 아이템들 — slotsFrom:'auto' 면 촉이 있는 모든 다른 아이템
function slotSources(it){
  const p=it.plate;if(!p||!p.slotsFrom)return [];
  const list=p.slotsFrom==='auto'?project.items.filter(x=>x!==it&&tabSpec(x)&&(!it.group||x.group===it.group)):p.slotsFrom.map(id=>project.items.find(x=>x.id===id)).filter(x=>x&&tabSpec(x));
  return list;
}
function slotKey(it){return slotSources(it).map(x=>x.id+':'+JSON.stringify(tabSpec(x))+':'+JSON.stringify((it.plate.slotAdj||{})[x.id]||0)).join('|');}
// 슬롯 자리 계산 (mm, 판 좌표). 판(측면판)은 좌·우 가장자리에 세로로, 그림형(캐릭터)은 가운데 줄에 가로로 고르게
function slotLayout(it){
  const p=it.plate;const W=p.tpl==='art'?(p.artW||p.w):p.w,H=p.tpl==='art'?(p.artH||p.h):p.h;const srcs=slotSources(it);const out=[];
  const panels=srcs.filter(x=>x.kind==='plate'),chars=srcs.filter(x=>x.kind!=='plate');
  const margin=Math.max(4,Math.min(8,W*0.06));
  // 벽 판은 바닥의 어느 가장자리에 서는지(edge)에 따라: left/right = 세로 슬롯, back/front = 가로 슬롯. 뒷모서리에서 ㄱ자로 만나는 구성이 기본
  // 벽(판)은 가장자리 홈(edgeFingers)으로 물리므로 여기선 목록에만 (패널 표시용)
  panels.forEach(x=>{const ts=tabSpec(x);out.push({id:x.id,edge:ts.edge||'left',w:ts.w,h:ts.t,n:ts.n,edgeNotch:true,cx:0,cy:0});});
  const n=chars.length;
  chars.forEach((x,i)=>{const ts=tabSpec(x);const cx=W*(i+1)/(n+1);const cy=H*(p.slotRow||0.62);out.push({id:x.id,cx,cy,w:ts.w,h:ts.t,vert:false});});
  for(const sl of out){if(sl.edgeNotch)continue;const adj=(p.slotAdj||{})[sl.id];if(adj){sl.cx+=adj.dx||0;sl.cy+=adj.dy||0;}}
  return out;
}
// 가장자리 결합 명세 → 세그먼트 목록 (mm, 각 가장자리의 시작점 기준 좌표)
//   p.tab      = {w,h,t,edge,n}             아래 촉 n개 (h = 바닥판 두께 = 촉 높이)
//   p.corner   = {side:'left'|'right', phase:'A'|'B', n, t}   벽끼리 손가락 결합 (칸 2n+1 개, A=짝수 칸 돌출/홀수 칸 홈, B=반대)
//   slotsFrom  = 바닥판: 꽂히는 벽마다 그 가장자리에 촉 폭·위치 그대로 홈 (깊이 = 벽 두께)
function edgeFingers(it){
  const p=it.plate,out=[];const W=p.w,H=p.h;
  if(p.tab){const n=p.tab.n||1,tw=p.tab.w,th=p.tab.h||3;out.push({edge:'bottom',segs:tabFractions(n).map(f=>({a:W*f-tw/2,b:W*f+tw/2,type:'out',depth:th}))});}
  if(p.corner&&p.corner.phase&&p.corner.phase!=='none'){
    const n=p.corner.n||3,k=2*n+1,L=H,seg=L/k,t=(p.corner.t||p.thick||3);const A=p.corner.phase==='A';
    const segs=[];for(let i=0;i<k;i++){const outSeg=(i%2===0)===A;segs.push({a:i*seg,b:(i+1)*seg,type:outSeg?'out':'in',depth:t+(outSeg?0:0.1)});}
    out.push({edge:p.corner.side==='left'?'left':'right',segs});
  }
  if(p.slotsFrom){ // 바닥판: 벽 촉 자리 홈
    for(const x of slotSources(it)){if(x.kind!=='plate')continue;const ts=tabSpec(x);const e=ts.edge||'left';
      const L=(e==='left'||e==='right')?H:W;const adj=(p.slotAdj||{})[x.id]||{dx:0,dy:0};const sh=(e==='left'||e==='right')?(adj.dy||0):(adj.dx||0);
      const segs=tabFractions(ts.n).map(f=>({a:L*f-ts.w/2-0.05+sh,b:L*f+ts.w/2+0.05+sh,type:'in',depth:ts.t+0.1}));
      out.push({edge:e==='back'?'top':e==='front'?'bottom':e,segs});}
  }
  return out;
}
function ensurePlateFresh(it){ // dpi·슬롯 짝 값이 바뀌었으면 판을 다시 합성·계산 (규격 판 + 그림 모양 판)
  if(!it||!it.plate)return false;
  if(it.kind!=='plate'&&!(it.plate.tpl==='art'&&it.plate.slotsFrom))return false;
  const pxmm=(+$('dpi').value||300)/25.4;
  const key=it.plate.slotsFrom?slotKey(it):'';
  if(it._plateDpi===pxmm&&it._slotKey===key)return false;
  const prev=S;S=it;rebuildPlate(it);computeCore(true);S=prev;return true;
}
// 그림 모양 판(kind 'art' + plate.tpl 'art'): 그림 자체가 판. 규격 도형 대신 그림 실루엣에서 칼선을 뽑되, 꽂히는 아이템의 촉 슬롯은 똑같이 뚫는다
function rebuildArtPlate(it){
  const p=it.plate,art=p.art;if(!art)return;
  const pxmm=(+$('dpi').value||300)/25.4;
  p.artW=art.width/pxmm;p.artH=art.height/pxmm; // 슬롯 배치는 그림 크기 기준 (규격 w/h 는 보존)
  it._plateDpi=pxmm; // 슬롯은 computeCore 에서 최종 형상(여백·둥글리기 뒤)에 뚫는다
  const prev=S;S=it;setArtSource(art,art.width,art.height);S=prev;
}
function rebuildPlate(it){
  it=it||S;if(!it||!it.plate)return;
  if(it.kind==='art'){if(it.plate.tpl==='art')rebuildArtPlate(it);return;}
  const p=it.plate;const pxmm=(+$('dpi').value||300)/25.4;
  let w,h,cv;
  if(p.tpl==='guide'&&p.guide){ // 가이드: 이미지 그대로 (mm 크기는 p.w/p.h 로 지정 → 리샘플)
    w=Math.max(4,Math.round(p.w*pxmm));h=Math.max(4,Math.round(p.h*pxmm));
    cv=document.createElement('canvas');cv.width=w;cv.height=h;const g=cv.getContext('2d');
    g.drawImage(p.guide,0,0,w,h);
    if(p.guideOpaque!==false){ // 가이드가 선 그림(투명 바탕 위 외곽선)이면 채워야 하지만, 보통은 실루엣 PNG. 실루엣이면 그대로.
    }
  }else{
    w=Math.max(4,Math.round(p.w*pxmm));h=Math.max(4,Math.round(p.h*pxmm));
    cv=document.createElement('canvas');cv.width=w;cv.height=h;const g=cv.getContext('2d');
    g.fillStyle='#ffffff';plateShapePath(g,p,w,h);g.fill();
  }
  if(p.art&&!p.noart){ // 판 안에 그림 (contain, 가운데) — 판 밖은 잘림
    const g=cv.getContext('2d');g.save();
    if(p.tpl==='guide'){g.globalCompositeOperation='source-atop';}else{plateShapePath(g,p,w,h);g.clip();}
    const sc=Math.min(w/p.art.width,h/p.art.height)*(p.artScale||1);const aw=p.art.width*sc,ah=p.art.height*sc;
    g.drawImage(p.art,(w-aw)/2+(p.artDx||0)*pxmm,(h-ah)/2+(p.artDy||0)*pxmm,aw,ah);g.restore();
  }
  // ---- 퍼즐형 가장자리 ----
  // 판 두께 d 만큼 사방에 여유를 두고, 각 가장자리에 촉(밖으로 돌출) / 홈(안으로 파냄) 을 넣는다.
  //   bottom: 바닥판에 꽂히는 촉 n개 (tab)            ↔ 바닥판 해당 가장자리의 홈 (slotsFrom 이 자동으로 판다)
  //   corner: 벽끼리 만나는 옆 가장자리의 손가락 결합 — 한쪽은 A(짝수 칸 돌출), 다른 쪽은 B(홀수 칸 돌출)
  const d=p.thick||3;const dpx=Math.round(d*pxmm);
  const fingers=edgeFingers(it); // [{edge:'bottom'|'top'|'left'|'right', segs:[{a,b,type:'out'|'in',depth}]}] (mm)
  if(fingers.length){
    const c2=document.createElement('canvas');c2.width=w+2*dpx;c2.height=h+2*dpx;const g=c2.getContext('2d');
    g.drawImage(cv,dpx,dpx);
    for(const f of fingers)for(const sg of f.segs){
      const a0=Math.round(sg.a*pxmm),b0=Math.round(sg.b*pxmm),dep=Math.round(sg.depth*pxmm);
      if(sg.type==='out'){g.fillStyle='#fff';
        if(f.edge==='bottom')g.fillRect(dpx+a0,dpx+h-1,b0-a0,dep+1);
        else if(f.edge==='top')g.fillRect(dpx+a0,dpx-dep,b0-a0,dep+1);
        else if(f.edge==='right')g.fillRect(dpx+w-1,dpx+a0,dep+1,b0-a0);
        else g.fillRect(dpx-dep,dpx+a0,dep+1,b0-a0);
      }else{g.save();g.globalCompositeOperation='destination-out';g.fillStyle='#000';
        if(f.edge==='bottom')g.fillRect(dpx+a0,dpx+h-dep,b0-a0,dep+1);
        else if(f.edge==='top')g.fillRect(dpx+a0,dpx-1,b0-a0,dep+1);
        else if(f.edge==='right')g.fillRect(dpx+w-dep,dpx+a0,dep+1,b0-a0);
        else g.fillRect(dpx-1,dpx+a0,dep+1,b0-a0);
        g.restore();}
    }
    cv=c2;w=c2.width;h=c2.height;it._plateInset=dpx; // 판 본체가 (dpx,dpx) 에 놓임 — 슬롯 좌표 보정용
  }else it._plateInset=0;
  if(p.slotsFrom){ // 꽂히는 아이템들의 촉 자리를 뚫는다 (여유 +0.1mm)
    const g=cv.getContext('2d');g.save();g.globalCompositeOperation='destination-out';g.fillStyle='#000';
    const ins=it._plateInset||0;
    for(const sl of slotLayout(it)){if(sl.edgeNotch)continue;const sw=(sl.w+0.1)*pxmm,sh=(sl.h+0.1)*pxmm;g.fillRect(Math.round(ins+sl.cx*pxmm-sw/2),Math.round(ins+sl.cy*pxmm-sh/2),Math.round(sw),Math.round(sh));}
    g.restore();it._slotKey=slotKey(it);
  }
  it._plateDpi=pxmm;
  const prev=S;S=it;setArtSource(cv,w,h);S=prev;
}
// 판을 '그림 모양 그대로'로 — 그림에서 칼선을 뽑는 그림형으로 전환 (스핀 받침대에 자유형 그림을 쓸 때)
function plateUseArtShape(it,on){
  it=it||S;if(!it||!it.plate)return;
  if(on){if(!it.plate.art){toast('🖼 '+t('먼저 판에 넣을 그림을 올리세요'));return;}
    it.kind='art';it.plate.tpl='art';
    it.plate.plateOffset=it.settings.offset;it.settings.offset=it.plate.artOffset||'2';
    rebuildArtPlate(it);}
  else{it.kind='plate';it.plate.tpl=it.plate.lastShape||'rect';it.plate.artOffset=it.settings.offset;it.settings.offset=it.plate.plateOffset||'0';rebuildPlate(it);}
  if(it===S){applySettingsToDOM(S);recompute(true);renderPlatePanel();renderItemBar();}
}
// 판 그림 올리기 (현재 아이템이 판일 때)
async function pickPlateArt(){
  if(!S||S.kind!=='plate')return;
  const fs=await openImages(false,'goods-plate-art');if(!fs||!fs[0])return;
  try{const img=await loadImageFile(fs[0]);S.plate.art=img;rebuildPlate(S);recompute(true);renderPlatePanel();}catch(e){}
}
// 가이드 파일(PNG·SVG) → 판 모양. PNG 는 pHYs dpi 로 mm 환산, 없으면 현재 dpi 기준. SVG 는 width/height 가 mm 이면 그대로.
async function pickPlateGuide(){
  if(!S||S.kind!=='plate')return;
  const fs=await openImages(false,'goods-plate-guide');if(!fs||!fs[0])return;
  const f=fs[0];
  try{
    const img=await loadImageFile(f);
    let wmm=null,hmm=null;
    if(/\.svg$/i.test(f.name)){const txt=await f.text();const m1=txt.match(/width="([\d.]+)(mm|cm|px)?"/),m2=txt.match(/height="([\d.]+)(mm|cm|px)?"/);
      if(m1&&m2&&m1[2]==='mm'){wmm=+m1[1];hmm=+m2[1];}else if(m1&&m2&&m1[2]==='cm'){wmm=+m1[1]*10;hmm=+m2[1]*10;}}
    else{const d=await detectDpi(f);if(d&&d>=72){wmm=img.width/d*25.4;hmm=img.height/d*25.4;}}
    if(!wmm){const pxmm=(+$('dpi').value||300)/25.4;wmm=img.width/pxmm;hmm=img.height/pxmm;}
    Object.assign(S.plate,{tpl:'guide',guide:img,w:+wmm.toFixed(2),h:+hmm.toFixed(2),guideName:f.name});
    rebuildPlate(S);recompute(true);renderPlatePanel();
  }catch(e){toast('⚠ '+t('가이드 파일을 읽지 못했어요'));}
}
function setPlateShape(patch){if(!S||S.kind!=='plate')return;Object.assign(S.plate,patch);rebuildPlate(S);recompute(true);renderPlatePanel();}

// ---- 3단계 패널: 판형 아이템이면 '판 모양' 그룹을 칼선 그룹 대신 보여준다 ----
function renderPlatePanel(){
  let box=$('plateGroup');
  const cutGrp=$('offset')&&$('offset').closest('.grp');
  if(!box){box=document.createElement('div');box.className='grp';box.id='plateGroup';if(cutGrp)cutGrp.parentElement.insertBefore(box,cutGrp);}
  const hasPlate=S&&S.plate;const isPlate=hasPlate&&S.kind==='plate';
  box.classList.toggle('hide',!hasPlate);
  if(cutGrp)cutGrp.classList.toggle('hide',!!isPlate);
  const detect=$('bgmode')&&$('bgmode').closest('.grp'),tidy=$('gapClose')&&$('gapClose').closest('.grp');
  if(detect)detect.classList.toggle('hide',!!isPlate);if(tidy)tidy.classList.toggle('hide',!!isPlate);
  if(!hasPlate)return;
  const p=S.plate;const opt=(v,l,cur)=>`<option value="${v}" ${cur===v?'selected':''}>${l}</option>`;
  const slots=p.slotsFrom?slotLayout(S):[];
  box.innerHTML=`<h3>${S.name} — ${t('판')}</h3>
    <div class="hint">${isPlate?t('칼선은 판 모양에서 나와요. 그림은 판 안에 넣고 넘치는 부분은 잘려요.'):t('그림 모양 그대로 칼선을 뽑아요. 여백은 칼선 설정에서.')}</div>
    <div class="types" style="margin:8px 0;grid-template-columns:1fr 1fr 1fr">
      <button data-ptpl="shape" class="${isPlate&&p.tpl!=='guide'?'on':''}"><b>◻</b>${t('규격 도형')}</button>
      <button data-ptpl="guide" class="${isPlate&&p.tpl==='guide'?'on':''}"><b>📄</b>${t('가이드 파일')}</button>
      <button data-ptpl="art" class="${!isPlate?'on':''}"><b>🖼</b>${t('그림 모양')}</button>
    </div>
    ${p.tab?`<div class="row"><span>${t('아래 촉 (바닥판에 꽂힘)')} <small style="color:var(--ink-soft)">${t('폭 × 높이(=바닥판 두께)')}</small></span><span class="v"><input type="number" id="plateTabW" value="${p.tab.w}" step="1"> × <input type="number" id="plateTabH" value="${p.tab.h||3}" step="0.5"> mm</span></div>
      <div class="row"><span>${t('촉 개수')}</span><span class="v"><select id="plateTabN">${[1,2,3,4].map(n=>opt(String(n),n+t('개'),String(p.tab.n||1))).join('')}</select></span></div>
      <div class="row"><span>${t('바닥의 어느 쪽에 서나요')}</span><span class="v"><select id="plateTabEdge">${[['left',t('왼쪽')],['back',t('뒤쪽')],['right',t('오른쪽')],['front',t('앞쪽')]].map(([v,l])=>opt(v,l,p.tab.edge||'left')).join('')}</select></span></div>
      <div class="row"><span>${t('벽끼리 퍼즐 결합')} <span class="tip" data-tip="${t('두 벽이 만나는 옆 가장자리를 손가락처럼 번갈아 돌출·홈으로 잘라 서로 끼워요. 한 벽은 A, 맞은편 벽은 B로 두면 딱 맞물려요. 손가락 수는 양쪽이 같아야 해요.')}">?</span></span><span class="v"><select id="plateCornerPhase">${[['none',t('없음')],['A',t('A (짝수 칸 돌출)')],['B',t('B (홀수 칸 돌출)')]].map(([v,l])=>opt(v,l,(p.corner&&p.corner.phase)||'none')).join('')}</select><select id="plateCornerSide">${[['right',t('오른쪽 끝')],['left',t('왼쪽 끝')]].map(([v,l])=>opt(v,l,(p.corner&&p.corner.side)||'right')).join('')}</select></span></div>
      ${p.corner&&p.corner.phase&&p.corner.phase!=='none'?`<div class="row"><span>${t('손가락 수')}</span><span class="v"><select id="plateCornerN">${[2,3,4,5].map(n=>opt(String(n),n+t('개'),String(p.corner.n||3))).join('')}</select></span></div>`:''}`:''}
    ${p.slotsFrom?`<div class="hint" style="margin:6px 0 2px">${t('꽂히는 아이템의 촉에 맞춰 슬롯을 자동으로 뚫어요')} · ${slots.length}${t('개')}</div>
      ${slots.map(sl=>{const src=project.items.find(x=>x.id===sl.id);const adj=(p.slotAdj||{})[sl.id]||{dx:0,dy:0};if(sl.edgeNotch)return `<div class="row"><span>⊓ ${src?src.name:sl.id} <small style="color:var(--ink-soft)">${t('가장자리 홈')} ${sl.n}${t('개')} · ${sl.w}×${sl.h} · ${({left:t('왼쪽'),back:t('뒤쪽'),right:t('오른쪽'),front:t('앞쪽')})[sl.edge]}</small></span><span class="v">${t('밀기')} <input type="number" data-slotdx="${sl.id}" value="${(sl.edge==='left'||sl.edge==='right')?(adj.dy||0):(adj.dx||0)}" step="1" style="width:52px" data-axis="${(sl.edge==='left'||sl.edge==='right')?'y':'x'}"></span></div>`;
      return `<div class="row"><span>▭ ${src?src.name:sl.id} <small style="color:var(--ink-soft)">${sl.w.toFixed(1)}×${sl.h.toFixed(1)}</small></span><span class="v">x <input type="number" data-slotdx="${sl.id}" value="${adj.dx||0}" step="1" style="width:52px"> y <input type="number" data-slotdy="${sl.id}" value="${adj.dy||0}" step="1" style="width:52px"></span></div>`;}).join('')}
      ${!slots.length?`<div class="hint">${t('촉이 있는 아이템(측면판·캐릭터)이 없어요. 캐릭터는 스탠드(받침 없음)로 올리면 촉이 생겨요.')}</div>`:''}`:''}
    ${p.tpl==='guide'?`<div class="row"><span>📄 ${p.guideName||t('가이드 없음')}</span><button class="chip" id="plateGuidePick">${t('가져오기')}</button></div>
      <div class="row"><span>${t('실제 크기(mm)')}</span><span class="v"><input type="number" id="plateW" value="${p.w}" step="0.5"> × <input type="number" id="plateH" value="${p.h}" step="0.5"></span></div>
      <div class="hint">${t('인쇄소 가이드(PNG/SVG)를 그대로 올려요. 투명한 구멍·슬롯은 그대로 칼선이 돼요. 앱에 내장하지 않으니 규격이 바뀌면 파일만 다시 올리면 돼요.')}</div>`
    :`<div class="row"><span>${t('모양')}</span><span class="v"><select id="plateTpl">${opt('rect',t('사각'),p.tpl)}${opt('rrect',t('둥근 사각'),p.tpl)}${opt('circle',t('원'),p.tpl)}</select></span></div>
      <div class="row"><span>${t('크기(mm)')}</span><span class="v"><input type="number" id="plateW" value="${p.w}" step="0.5"> × <input type="number" id="plateH" value="${p.h}" step="0.5"></span></div>
      ${p.tpl==='rrect'?`<div class="row"><span>${t('모서리(mm)')}</span><span class="v"><input type="number" id="plateR" value="${p.r}" step="0.5"></span></div>`:''}`}
    ${p.noart?`<div class="hint">${t('이 판은 인쇄 없이 재단만 해요.')}</div>`:`<div class="row" style="margin-top:8px"><span>${p.art?'🖼 '+t('판 그림 있음'):t('판에 넣을 그림')}</span><span class="v"><button class="chip" id="plateArtPick">${p.art?t('바꾸기'):t('올리기')}</button>${p.art?`<button class="chip" id="plateArtClear">✕</button>`:''}</span></div>
      ${p.art?`<div class="row"><span>${t('그림 크기')}</span><span class="v"><input type="range" id="plateArtScale" min="0.2" max="1.5" step="0.05" value="${p.artScale||1}"></span></div>`:''}`}`;
  box.querySelectorAll('[data-ptpl]').forEach(b=>b.onclick=()=>{
    if(b.dataset.ptpl==='art'){plateUseArtShape(S,true);return;}
    if(S.kind!=='plate')plateUseArtShape(S,false);
    if(b.dataset.ptpl==='guide'){if(p.guide)setPlateShape({tpl:'guide'});else pickPlateGuide();}else setPlateShape({tpl:p.lastShape||'rect'});});
  box.querySelectorAll('[data-slotdx],[data-slotdy]').forEach(el=>el.onchange=()=>{const id=el.dataset.slotdx||el.dataset.slotdy;p.slotAdj=p.slotAdj||{};p.slotAdj[id]=p.slotAdj[id]||{dx:0,dy:0};const axis=el.dataset.axis||(el.dataset.slotdx?'x':'y');if(axis==='x')p.slotAdj[id].dx=+el.value;else p.slotAdj[id].dy=+el.value;rebuildPlate(S);recompute(true);});
  if($('plateTabW'))$('plateTabW').onchange=()=>{p.tab.w=+$('plateTabW').value;rebuildPlate(S);recompute(true);};
  if($('plateTabH'))$('plateTabH').onchange=()=>{p.tab.h=+$('plateTabH').value;rebuildPlate(S);recompute(true);};
  if($('plateTabEdge'))$('plateTabEdge').onchange=()=>{p.tab.edge=$('plateTabEdge').value;rebuildPlate(S);recompute(true);};
  if($('plateTabN'))$('plateTabN').onchange=()=>{p.tab.n=+$('plateTabN').value;rebuildPlate(S);recompute(true);};
  const cf=$('plateCornerPhase'),cs=$('plateCornerSide'),cn=$('plateCornerN');if(cf){const upd=()=>{p.corner=Object.assign(p.corner||{t:p.tab.t||3,n:3},{phase:cf.value,side:cs.value},cn?{n:+cn.value}:{});rebuildPlate(S);recompute(true);renderPlatePanel();};cf.onchange=upd;cs.onchange=upd;if(cn)cn.onchange=upd;}
  const num=(id,key)=>{const el=$(id);if(el)el.onchange=()=>setPlateShape({[key]:+el.value});};
  num('plateW','w');num('plateH','h');num('plateR','r');
  if($('plateTpl'))$('plateTpl').onchange=()=>{p.lastShape=$('plateTpl').value;setPlateShape({tpl:$('plateTpl').value});};
  if($('plateGuidePick'))$('plateGuidePick').onclick=pickPlateGuide;
  if($('plateArtPick'))$('plateArtPick').onclick=pickPlateArt;
  if($('plateArtClear'))$('plateArtClear').onclick=()=>{p.art=null;rebuildPlate(S);recompute(true);renderPlatePanel();};
  if($('plateArtScale'))$('plateArtScale').oninput=()=>{p.artScale=+$('plateArtScale').value;rebuildPlate(S);recompute(false);};
}

// ---- 제품 프리셋: 아이템 묶음 생성 ----
let ART_DEFAULT_SETTINGS=null; // 처음 화면의 패널 값 = 그림형 기본값 (판형 기본값이 그림형에 새지 않게)
function artDefaults(){if(!ART_DEFAULT_SETTINGS){ART_DEFAULT_SETTINGS={};for(const el of settingControls())if(!PROJECT_SETTING_IDS.has(el.id))ART_DEFAULT_SETTINGS[el.id]=readCtl(el);}return Object.assign({},ART_DEFAULT_SETTINGS);}
const ASSEMBLY={
  spin:{name:'스핀 스탠드',desc:'본체 + 받침대 + 회전 모듈',make(){return [
    {art:true,name:'본체',type:'stand',nb:true,settings:{offset:'2'}},
    {plate:{tpl:'rect',w:70,h:70,r:0,slotsFrom:'auto',slotRow:0.5},name:'받침대'}, // 본체 촉 슬롯이 가운데
    {plate:{tpl:'circle',w:70,h:70,noart:true},name:'회전 모듈'}];}},
  shaker:{name:'쉐이커 키링',desc:'앞판 + 테두리판 + 뒷판 + 파츠',make(){return [
    {plate:{tpl:'rrect',w:60,h:60,r:14},name:'앞판'},
    {plate:{tpl:'rrect',w:60,h:60,r:14},name:'테두리판'},
    {plate:{tpl:'rrect',w:60,h:60,r:14},name:'뒷판'},
    {art:true,name:'파츠',type:'acrylic',settings:{offset:'1'},multi:true}];}},
  diorama:{name:'디오라마 3면',desc:'왼쪽 벽 + 뒷벽 + 바닥판 (+ 캐릭터)',make(){return [
    {plate:{tpl:'rect',w:100,h:100,thick:3,tab:{w:20,h:3,t:3,edge:'left',n:2},corner:{side:'right',phase:'A',n:3,t:3}},name:'왼쪽 벽'},
    {plate:{tpl:'rect',w:100,h:100,thick:3,tab:{w:20,h:3,t:3,edge:'back',n:2},corner:{side:'left',phase:'B',n:3,t:3}},name:'뒷벽'},
    {plate:{tpl:'rect',w:100,h:100,thick:3,slotsFrom:'auto'},name:'바닥판'},
    {art:true,name:'캐릭터 파츠',type:'stand',nb:true,settings:{offset:'2'},multi:true}];}},
  noodle:{name:'누들 스토퍼',desc:'덮개판 + 캐릭터',make(){return [
    {plate:{tpl:'rrect',w:110,h:40,r:10,slotsFrom:'auto',slotRow:0.5},name:'덮개판'},
    {art:true,name:'캐릭터',type:'stand',nb:true,settings:{offset:'2'}}];}},
};
function applyAssemblyPreset(key){
  const def=ASSEMBLY[key];if(!def)return;
  project.kind=key;
  // 비어 있는 아이템(이미지 없음)은 치운다
  const keep=project.items.filter(i=>i.img);
  project.items.length=0;keep.forEach(i=>project.items.push(i));
  const made=[];const group=key+'-'+Date.now();
  for(const spec of def.make()){
    let it;
    if(spec.plate){it=newPlateItem(spec.name,spec.plate);}
    else{it=newItem(spec.name);it.type=spec.type||'acrylic';it.noBase=!!spec.nb;it.settings=Object.assign(artDefaults(),spec.settings||{});it.multi=!!spec.multi;}
    it.role=spec.plate?'plate':'body';it.group=group;project.items.push(it);made.push(it);
  }
  S=null;
  // 판은 바로 합성·계산 (뒤에서부터 → 마지막에 첫 아이템 활성)
  const order=made.slice().sort((a,b)=>(a.plate&&a.plate.slotsFrom?1:0)-(b.plate&&b.plate.slotsFrom?1:0)); // 슬롯 받는 판은 나중에
  for(const it of order)if(it.kind==='plate'){const prev=S;S=it;rebuildPlate(it);computeCore(true);S=prev;}
  S=null;setActiveItem(project.items.indexOf(made[0]));if(S.img){fitAndRender();updateInfo();}
  if($('multiExp'))$('multiExp').value='board';
  renderItemBar();renderPlatePanel();
  toast('▣ '+t(def.name)+' · '+made.length+t('개 아이템'));
}

// ---- 전체 보기에서 드래그 배치 ----
let _boardDrag=null;
function boardPointerDown(e){
  const B=boardSize();const r=view.getBoundingClientRect();const sc=view.width/B.w;
  const x=(e.clientX-r.left)/sc,y=(e.clientY-r.top)/sc;
  const hit=itemsWithImg().slice().reverse().find(it=>x>=it.placement.x&&x<=it.placement.x+it.pW&&y>=it.placement.y&&y<=it.placement.y+it.pH);
  if(!hit)return;
  if(hit!==S){setActiveItem(project.items.indexOf(hit));renderItemBar();}
  _boardDrag={it:hit,ox:x-hit.placement.x,oy:y-hit.placement.y,sc};
  view.classList.add('dragging');
}
function boardPointerMove(e){
  if(!_boardDrag)return;
  const B=boardSize();const r=view.getBoundingClientRect();const sc=_boardDrag.sc;
  const x=(e.clientX-r.left)/sc,y=(e.clientY-r.top)/sc;
  const it=_boardDrag.it;
  it.placement.x=Math.round(Math.max(0,x-_boardDrag.ox));it.placement.y=Math.round(Math.max(0,y-_boardDrag.oy));
  project.sheet.manual=true;
  renderBoard();
}
function boardPointerUp(){if(_boardDrag){_boardDrag=null;view.classList.remove('dragging');renderBoard();}}
