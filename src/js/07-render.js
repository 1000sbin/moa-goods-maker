// ===== 렌더 =====
function hasHole(){return S.type==='ring_hole'||S.type==='ring_tab';}
function fitAndRender(){if(project.ui.view==='board'){renderBoard();return;}const maxW=Math.min(view.parentElement.clientWidth-4,900);S.scale=Math.min(1,maxW/S.pW);
  view.width=Math.round(S.pW*S.scale);view.height=Math.round(S.pH*S.scale);render();}
function checker(ctx,w,h){const s=12;const dark=document.body.classList.contains('dark');const a=dark?'#24242a':'#f4f4f6',b=dark?'#1e1e23':'#fff';for(let y=0;y<h;y+=s)for(let x=0;x<w;x+=s){ctx.fillStyle=((x/s+y/s)&1)?a:b;ctx.fillRect(x,y,s,s);}}
function strokeLoop(ctx,l,sc){
  if((S.anchorMin||S.showAnchors)&&l.length>8){ // 앵커 최소화·앵커 표시 중: 내보내기와 동일한 피팅 곡선으로 미리보기 (화면=파일)
    try{
      const k=l._fk||(l._fk=toBezierKnots(loopForPath(l),l));
      if(k.length>1){
        ctx.beginPath();
        ctx.moveTo(k[0].points[2]*sc,k[0].points[3]*sc);
        for(let i=0;i<k.length;i++){
          const a=k[i].points,b=k[(i+1)%k.length].points;
          ctx.bezierCurveTo(a[4]*sc,a[5]*sc,b[0]*sc,b[1]*sc,b[2]*sc,b[3]*sc);
        }
        ctx.closePath();ctx.stroke();
        if(S.showAnchors)drawAnchors(ctx,k,sc);
        return;
      }
    }catch(e){}
  }
  ctx.beginPath();ctx.moveTo(l[0][0]*sc,l[0][1]*sc);for(let i=1;i<l.length;i++)ctx.lineTo(l[i][0]*sc,l[i][1]*sc);ctx.closePath();ctx.stroke();
}
function drawAnchors(ctx,knots,sc){ // 앵커 미리보기: 원=부드러움, 사각형=각진 코너
  ctx.save();
  for(const kn of knots){
    const x=kn.points[2]*sc,y=kn.points[3]*sc;
    ctx.beginPath();
    if(kn.linked!==false){
      ctx.arc(x,y,3,0,Math.PI*2);
      ctx.fillStyle='#fff';ctx.fill();
      ctx.lineWidth=1.6;ctx.strokeStyle='#c2185b';ctx.stroke();
    }else{
      ctx.rect(x-3,y-3,6,6);
      ctx.fillStyle='#c2185b';ctx.fill();
      ctx.lineWidth=1.2;ctx.strokeStyle='#fff';ctx.stroke();
    }
  }
  ctx.restore();
}
function holeClearOK(h){if(S.type==='ring_tab')return true;const hr=px((+$('hd').value)/2);let md=1e9;for(const lp of S.loops)for(const p of lp){const d=Math.hypot(p[0]-h.x,p[1]-h.y);if(d<md)md=d;}return md>=hr+px(1.5);}
function render(){
  if(project.ui.view==='board'){renderBoard();return;}
  if(project.ui.view==='final'){renderFinal();return;}
  vctx.clearRect(0,0,view.width,view.height);checker(vctx,view.width,view.height);
  const gdx=(S._imgDragPreview?S._imgDragPreview.dx:0)*S.scale,gdy=(S._imgDragPreview?S._imgDragPreview.dy:0)*S.scale;
  if(S._imgDragPreview)vctx.globalAlpha=0.85;
  vctx.drawImage(S.img,S.xImg*S.scale+gdx,S.yImg*S.scale+gdy,S.W*S.scale,S.H*S.scale);
  if(S.baseUp&&S.baseImg){ // 별도로 올린 받침 그림도 받침 대지에 (미리보기 = 내보내기와 같게)
    const b=S.baseUp;
    vctx.drawImage(S.baseImg,b.x0*S.scale,b.y0*S.scale,b.sw*S.scale,b.sh*S.scale);
  }
  vctx.globalAlpha=1;
  if($('whitePreview').checked&&S._whitePrevC&&!S._imgDragPreview){ // 화이트 미리보기 — 그림 '위'에 반투명 오버레이
    vctx.globalAlpha=0.45;
    vctx.drawImage(S._whitePrevC,0,0,S.pW*S.scale,S.pH*S.scale);
    vctx.globalAlpha=1;
  }
  // (이미지 고스트 중 칼선 알파는 paintCut 내부에서 설정, 아래 복원)
  const lw=Math.max(1.5,px(+$('cutw').value)*S.scale),col=$('cutcol').value;
  vctx.lineJoin='round';vctx.lineCap='round';vctx.strokeStyle=col;vctx.lineWidth=lw;
  for(const l of S.loops)strokeLoop(vctx,l,S.scale);
  const baseWarn=S.type==='stand'&&!S.tabConnectOK;
  if(baseWarn){vctx.strokeStyle='#ff2d55';}
  for(const l of S.baseLoops)strokeLoop(vctx,l,S.scale);
  if(baseWarn){vctx.strokeStyle=col;} // 원래 색으로 복원(이후 타공 렌더링에 영향 없도록)
  if(hasHole()){const hr=px((+$('hd').value)/2)*S.scale;
    for(const h of S.holes){
      const ok=holeClearOK(h);
      vctx.strokeStyle=ok?col:'#ff2d55';vctx.lineWidth=lw;
      vctx.beginPath();vctx.arc(h.x*S.scale,h.y*S.scale,hr,0,7);vctx.stroke();
      const hx=h.x*S.scale,hy=h.y*S.scale;vctx.strokeStyle=ok?'rgba(236,0,140,.5)':'#ff2d55';vctx.lineWidth=1;
      vctx.beginPath();vctx.moveTo(hx-6,hy);vctx.lineTo(hx+6,hy);vctx.moveTo(hx,hy-6);vctx.lineTo(hx,hy+6);vctx.stroke();
    }
    // 선택된 타공/고리: 점선 링
    const selKindHere=S.type==='ring_hole'?'hole':'ear';
    if(S.selKind===selKindHere&&S.selSet.size){
      vctx.strokeStyle='#3b82d6';vctx.lineWidth=1.5;vctx.setLineDash([5,4]);
      const rr=(S.type==='ring_hole'?px((+$('hd').value)/2):earRadius())*S.scale+7;
      for(const i of S.selSet){const h=S.holes[i];if(!h)continue;
        vctx.beginPath();vctx.arc(h.x*S.scale,h.y*S.scale,rr,0,7);vctx.stroke();}
      vctx.setLineDash([]);
    }}
  if(S.type==='stand'&&S.moveTabMode&&S.standComps){ // 촉 핸들 (다중 선택 시각화)
    const tH=px(+$('tabH').value);
    S.standComps.forEach((c,i)=>{
      const hx2=c.tabCx*S.scale,hy2=(c.maxY+tH/2)*S.scale;
      const sel=S.selKind==='tab'&&S.selSet.has(i);
      vctx.beginPath();vctx.arc(hx2,hy2,8,0,7);
      vctx.fillStyle=sel?'rgba(59,130,214,.85)':'rgba(255,255,255,.85)';vctx.fill();
      vctx.strokeStyle='#3b82d6';vctx.lineWidth=1.5;
      if(sel)vctx.setLineDash([4,3]);
      vctx.stroke();vctx.setLineDash([]);
    });
  }
  if(S.type==='korotto'&&S.rolyInfo)drawRolyMarks();
  const sl=shapeLoop();
  if(sl){vctx.strokeStyle=$('shapeCol').value;vctx.lineWidth=lw;strokeLoop(vctx,sl,S.scale);}
}
function drawRolyMarks(){ // 무게중심 · 접지점 · 바닥선
  const s=S.scale;
  for(const r of S.rolyInfo){
    const bad=!r.ok;
    const col=bad?'#ff2d55':'#3b82d6';
    vctx.save();
    vctx.strokeStyle=col;vctx.lineWidth=1.2;vctx.setLineDash([5,4]);
    vctx.beginPath();vctx.moveTo(r.arcCx*s,(r.cy-14/s)*s);vctx.lineTo(r.arcCx*s,r.bottomY*s);vctx.stroke(); // 수직 균형선
    vctx.beginPath();vctx.moveTo((r.xL-4)*s,r.bottomY*s);vctx.lineTo((r.xR+4)*s,r.bottomY*s);vctx.stroke(); // 바닥(접지)선
    vctx.setLineDash([]);
    const cx=r.cx*s,cy=r.cy*s;
    vctx.beginPath();vctx.arc(cx,cy,7,0,7);
    vctx.fillStyle='rgba(255,255,255,.9)';vctx.fill();vctx.strokeStyle=col;vctx.lineWidth=1.6;vctx.stroke();
    vctx.beginPath();vctx.moveTo(cx-7,cy);vctx.lineTo(cx+7,cy);vctx.moveTo(cx,cy-7);vctx.lineTo(cx,cy+7);vctx.stroke(); // 무게중심 십자
    vctx.beginPath();vctx.arc(r.arcCx*s,r.bottomY*s,3,0,7);vctx.fillStyle=col;vctx.fill(); // 접지점
    vctx.restore();
  }
}
function countAnchors(){ // 내보내기 패스의 총 앵커 수 (피팅 캐시 l._fk 공유 — 렌더·카운트 중복 제거)
  if(!S.img||!S.loops)return 0;
  const fit=l=>(l._fk||(l._fk=toBezierKnots(loopForPath(l),l)));
  let n=0;
  for(const l of S.loops)n+=fit(l).length;
  for(const l of S.baseLoops)n+=fit(l).length;
  if(hasHole())n+=S.holes.length*4;
  const sl=shapeLoop();
  if(sl)n+=toBezierKnots(loopForPath(sl),sl).length;
  return n;
}
function updateInfo(){
  const sil=S.rawBbox?` · ${t('그림 영역')} <b>${tomm(S.rawBbox.maxX-S.rawBbox.minX).toFixed(1)}×${tomm(S.rawBbox.maxY-S.rawBbox.minY).toFixed(1)}mm</b>`:'';
  S._whitePrevC=($('whitePreview').checked&&S.img)?whitePreviewCanvas():null;
  if(typeof updWhiteSimplifyNote==='function')updWhiteSimplifyNote();
  const dpiTag=(S.dpiDetected&&+$('dpi').value===S.dpiDetected)?` <span style="color:#c85b7c">(${t('자동 감지')})</span>`:'';
  {
    let touch=false;
    if(S.boardOn){
      const m2=2;
      for(const l of S.loops.concat(S.baseLoops))for(const p2 of l){
        if(p2[0]<m2||p2[1]<m2||p2[0]>S.pW-m2||p2[1]>S.pcH-m2){touch=true;break;}
      }
    }
    const bw=$('boardWarn');
    if(S._earClamped){
      bw.textContent=t('대지 공간이 부족해서 고리를 안쪽으로 옮겼어요. 고리가 그림에 깊이 박혔다면 대지를 키우거나 그림을 아래로 드래그해보세요.');
      bw.style.display='block';
    }else if(touch){
      bw.textContent=t('대지가 작아서 칼선·부속이 잘릴 수 있어요. 대지를 키우거나 그림 실물 크기를 줄여보세요.');
      bw.style.display='block';
    }else bw.style.display='none';
  }
  if(S.rawBbox&&document.activeElement!==$('targetW')&&document.activeElement!==$('targetH')){
    $('targetW').value=tomm(S.rawBbox.maxX-S.rawBbox.minX).toFixed(1);
    $('targetH').value=tomm(S.rawBbox.maxY-S.rawBbox.minY).toFixed(1);
  }
  const rotTag=(+S.rot)?` · ${t('회전')} <b>${(+S.rot).toFixed(1).replace(/\.0$/,'')}°</b> <span style="opacity:.6">(${S.oW}×${S.oH}px → ${S.W}×${S.H}px)</span>`:'';
  $('sizeInfo').innerHTML=`${t('원본')} <b>${S.W}×${S.H}px</b> · ${t('실물 약')} <b>${tomm(S.W).toFixed(1)}×${tomm(S.H).toFixed(1)}mm</b>${sil} @ ${$('dpi').value}dpi${dpiTag}${rotTag}`;
  const parts=[`${t('칼선 조각')} <b>${S.loops.length+S.baseLoops.length}</b>`,`${t('여백')} <b>${(+$('offset').value).toFixed(1)}mm</b>`];
  { // 굿즈 실물 크기 — 진짜 칼선(각 조각의 bbox) 기준
    const dim=l=>{
      let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
      for(const p2 of l){if(p2[0]<x0)x0=p2[0];if(p2[0]>x1)x1=p2[0];if(p2[1]<y0)y0=p2[1];if(p2[1]>y1)y1=p2[1];}
      return `${tomm(x1-x0).toFixed(1)}×${tomm(y1-y0).toFixed(1)}`;
    };
    const main=S.loops.map(dim);
    const shown=main.slice(0,3).join(' / ')+(main.length>3?' …':'');
    if(main.length)parts.splice(1,0,`${t('굿즈 실물')} <b>${shown}mm</b>`+(S.baseLoops.length?` · ${t('받침')} <b>${S.baseLoops.map(dim).join(' / ')}mm</b>`:''));
  }
  if(hasHole())parts.push(`${t('타공')} <b>⌀${(+$('hd').value).toFixed(1)}mm</b>`);
  if(S.type==='stand'){
    if(S.noBase)parts.push(`<b>${t('받침 없이')}</b>`);
    else if(S.baseUp)parts.push(`${t('받침')} <b>${t('별도 그림')} ${S.baseUp.wMm.toFixed(1)}×${S.baseUp.hMm.toFixed(1)}mm</b>`);
    else if(S.baseArt)parts.push(`${t('받침')} <b>${t('그림에서')} ${S.baseArt.wMm.toFixed(1)}×${S.baseArt.hMm.toFixed(1)}mm</b>`);
    else parts.push(`${t('받침')} <b>${$('baseW').value}×${$('baseH').value}mm</b>`);
    if(S.standComps&&S.standComps.length>1)parts.push(`${t('인원')} <b>${S.standComps.length}</b>`);
  }
  if(S.holeFillResult){
    const h=S.holeFillResult;
    if(h.total===0)parts.push(t('메울 내부 구멍 없음'));
    else parts.push(`${t('구멍')} <b>${h.filled}/${h.total}${t('개')}</b> ${t('메움')}`+(h.filled<h.total?` (<b style="color:#c85b7c">${t('큰 구멍이 남아있어요 — 기준값을 올려보세요')}</b>)`:''));
  }
  if(S.type==='sheet'){
    parts.unshift(`${t('스티커')} <b>${S.stickerCount}${t('개')}</b> ${t('감지')}`);
    if(S.loops.length<S.stickerCount)parts.push(`<b style="color:#c85b7c">${t('일부가 여백 때문에 합쳐졌어요 — 여백을 줄여보세요')}</b>`);
  }
  if(S.type==='korotto'){
    parts.push(`${t('바닥 평면')} <b>${$('korottoFlat').value}mm</b>`);
    if(S.korottoComps&&S.korottoComps.length>1)parts.push(`${t('인원')} <b>${S.korottoComps.length}</b>`);
    if(S.rolyInfo&&S.rolyInfo.length){
      const r=S.rolyInfo.reduce((a,b)=>b.margin<a.margin?b:a); // 가장 불안정한 인원 기준
      parts.push(`${t('바닥 반지름')} <b>${tomm(r.R).toFixed(0)}mm</b>`);
      parts.push(`${t('무게중심 높이')} <b>${tomm(r.h).toFixed(1)}mm</b>`);
      parts.push(r.ok?`${t('자동 복원')} <b style="color:#2e9e5b">O</b> · ${t('여유')} <b>${Math.round(r.margin*100)}%</b>`
                    :`<b style="color:#ff2d55">⚠ ${t('무게중심이 원호 중심보다 높아 안 돌아와요')}</b>`);
      parts.push(`${t('최대 흔들림')} <b>${r.tilt.toFixed(0)}°</b>`);
    }
  }
  updRolyStat();
  updWhiteFitNote();
  updBaseArtNote();updBaseUpNote();
  if($('shapeOn').checked)parts.push(`${t('도형')} <b>${$('shapeW').value}×${$('shapeH').value}mm</b>`);
  $('anchorInfo').textContent='⚓ '+t('칼선 앵커')+' '+countAnchors()+t('개');
  $('stageInfo').innerHTML=parts.join(' · ')+(S.type==='stand'&&!S.tabConnectOK?` · <b style="color:#ff2d55">⚠ ${t('촉이 그림과 안 이어질 수 있어요, 위치를 조정해보세요')}</b>`:'');
}
function updRolyStat(){
  const box=$('rolyStat'),fix=$('rolyFix');
  if(!box)return;
  if(!(S.type==='korotto'&&$('korottoMode').value==='roly')){box.innerHTML='';fix.classList.add('hide');return;}
  const info=S.rolyInfo;
  if(!info||!info.length){box.textContent=t('바닥을 둥글게 깎아 흔들리다 제자리로 돌아오게 만들어요. 이미지를 올리면 무게중심을 재서 반지름을 잡아줘요.');fix.classList.add('hide');return;}
  const r=info.reduce((a,b)=>b.margin<a.margin?b:a);
  const lines=[`${t('무게중심 높이')} ${tomm(r.h).toFixed(1)}mm · ${t('바닥 반지름')} ${tomm(r.R).toFixed(0)}mm · ${t('바닥 볼록')} ${tomm(r.sag).toFixed(1)}mm · ${t('최대 흔들림')} ${r.tilt.toFixed(0)}°`];
  if(r.fil>0.5)lines.push(`${t('원호 끝 라운드')} ${tomm(r.fil).toFixed(1)}mm`);
  else lines.push(`<b style="color:#c85b7c">${t('원호 끝이 각져요 — 바닥 모서리 라운드를 올려보세요')}</b>`);
  const warn=[];
  if(!r.ok)warn.push(t('무게중심이 원호 중심보다 높아 안 돌아와요'));
  if(!r.sagOK)warn.push(t('원호가 바닥 평면보다 깊어 발이 깎일 수 있어요'));
  if(!r.tiltOK)warn.push(t('바닥이 좁아 거의 흔들리지 않아요'));
  if(r.lean>px(1.5))warn.push(t('무게중심이 좌우로 치우쳐 기울어진 채로 서요'));
  const fixable=!r.ok||!r.sagOK||!r.tiltOK;
  if(warn.length){
    lines.push('<b style="color:#ff2d55">⚠ '+warn.join(' / ')+'</b>');
    fix.classList.toggle('hide',!fixable);
  }else{
    lines.push(`<b style="color:#2e9e5b">✓ ${t('자동 복원')} ${t('여유')} ${Math.round(r.margin*100)}%</b>`);
    if(r.byWidth&&!$('rolyManual').checked)lines.push(t('바닥이 넓어서 흔들림 세기보다 바닥 폭이 반지름을 결정했어요.'));
    fix.classList.add('hide');
  }
  box.innerHTML=lines.join('<br>');
}
function rolyAutoFix(){ // 경고 원인을 한 번에 해소
  const info=S.rolyInfo;if(!info||!info.length)return;
  const manual=$('rolyManual').checked;
  let flatMm=+$('korottoFlat').value,rMm=+$('rolyR').value;
  const changed=[];
  for(const r of info){
    // 반지름 부족(복원 불가 / 원호가 너무 깊음) → 계산된 권장 반지름으로. 자동 모드는 이미 권장값이라 손댈 게 없음.
    if(manual&&(!r.ok||!r.sagOK)){
      const need=Math.ceil(tomm(r.rFloor));
      if(need>rMm){rMm=Math.min(600,need);changed.push(t('바닥 반지름'));}
    }
    // 바닥이 좁아 안 흔들림 → 평탄 밴드를 키우면 스캔 범위가 넓어져 바닥 폭도 같이 늘어남
    if(!r.tiltOK||(!manual&&!r.sagOK)){
      const need=Math.min(30,Math.max(flatMm+3,Math.ceil(tomm(r.sag)/0.8)+1));
      if(need>flatMm){flatMm=need;changed.push(t('바닥 평면'));}
    }
  }
  if(!changed.length){toast('🍓 '+t('더 보정할 게 없어요'));return;}
  $('korottoFlat').value=flatMm;$('korottoFlatV').textContent=flatMm;
  $('rolyR').value=rMm;
  toast('⚡ '+[...new Set(changed)].join(' · ')+' '+t('보정했어요'));
  recompute(true);
}

// ===== 완성 미리보기 =====
// 투명 아크릴(또는 스티커 종이) 위에 화이트와 그림을 얹은 '실물' 느낌. 칼선·앵커는 그리지 않는다.
// 판 = 최종 실루엣 마스크(mainMaskData) · 받침 = baseLoops · 화이트 = whiteLayerCanvas · 그림 = S.img
function loopPath(ctx,l,sc){ctx.moveTo(l[0][0]*sc,l[0][1]*sc);for(let i=1;i<l.length;i++)ctx.lineTo(l[i][0]*sc,l[i][1]*sc);ctx.closePath();}
function renderFinal(){
  const sc=S.scale,W=view.width,H=view.height;
  vctx.setTransform(1,0,0,1,0,0);vctx.clearRect(0,0,W,H);checker(vctx,W,H);
  if(!S.img||!S.loops.length)return;
  const isSt=(S.type==='sticker'||S.type==='sheet');
  const whiteOn=$('whiteLayer').checked;
  const plate=()=>{vctx.beginPath();for(const l of S.loops)loopPath(vctx,l,sc);for(const l of S.baseLoops)loopPath(vctx,l,sc);};
  // 그림자
  vctx.save();vctx.translate(2,5);vctx.fillStyle='rgba(0,0,0,.20)';vctx.filter='blur(6px)';plate();vctx.fill('evenodd');vctx.restore();
  if(isSt){ // 스티커: 대지(종이) 전체에 배경, 스티커는 반칼 자국, 대지 외곽 완칼
    const bw=S.pW*sc,bh=S.pcH*sc;
    vctx.fillStyle='rgba(0,0,0,.10)';vctx.fillRect(3,4,bw,bh);
    if(whiteOn){const wc=whiteLayerCanvas();vctx.drawImage(wc,0,0,wc.width*sc,wc.height*sc);}
    else{vctx.fillStyle='rgba(255,255,255,.18)';vctx.fillRect(0,0,bw,bh);}
    vctx.drawImage(S.img,S.xImg*sc,S.yImg*sc,S.W*sc,S.H*sc);
    vctx.save();plate();vctx.strokeStyle='rgba(0,0,0,.18)';vctx.lineWidth=1;vctx.setLineDash([3,3]);vctx.stroke();vctx.restore();
    vctx.strokeStyle='rgba(0,0,0,.25)';vctx.lineWidth=1;vctx.strokeRect(.5,.5,bw-1,bh-1);
  }else{ // 아크릴: 유리질 판
    vctx.save();plate();vctx.clip('evenodd');
    vctx.fillStyle='rgba(232,240,248,.82)';vctx.fillRect(0,0,W,H); // 반투명 유리 바탕 (체커가 살짝 비침)
    const g=vctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'rgba(255,255,255,.55)');g.addColorStop(.45,'rgba(200,218,236,.15)');g.addColorStop(1,'rgba(255,255,255,.4)');
    vctx.fillStyle=g;vctx.fillRect(0,0,W,H);
    // 안쪽 베벨(두께감): 판 가장자리 안쪽에 어두운 띠
    plate();vctx.strokeStyle='rgba(90,120,150,.28)';vctx.lineWidth=8;vctx.stroke();plate();vctx.strokeStyle='rgba(255,255,255,.55)';vctx.lineWidth=3;vctx.stroke();
    if(whiteOn){const wc=whiteLayerCanvas('#ffffff');vctx.globalAlpha=.96;vctx.drawImage(wc,0,0,wc.width*sc,wc.height*sc);vctx.globalAlpha=1;}
    vctx.globalAlpha=whiteOn?1:.62; // 화이트 없으면 그림이 비쳐 보임
    vctx.drawImage(S.img,S.xImg*sc,S.yImg*sc,S.W*sc,S.H*sc);vctx.globalAlpha=1;
    if(S.baseUp&&S.baseImg){const b=S.baseUp;vctx.drawImage(S.baseImg,b.x0*sc,b.y0*sc,b.sw*sc,b.sh*sc);}
    vctx.restore();
    // 단면(가장자리) + 하이라이트
    vctx.save();plate();vctx.strokeStyle='rgba(95,125,160,.9)';vctx.lineWidth=2.2;vctx.stroke();vctx.restore();
    // 타공: 뚫린 구멍 (체커가 보임) + 고리
    if(hasHole())for(const h of S.holes){
      const r=px((+$('hd').value)/2)*sc;
      vctx.save();vctx.beginPath();vctx.arc(h.x*sc,h.y*sc,r,0,7);vctx.clip();checker(vctx,W,H);vctx.restore();
      vctx.beginPath();vctx.arc(h.x*sc,h.y*sc,r,0,7);vctx.strokeStyle='rgba(95,125,160,.9)';vctx.lineWidth=1.8;vctx.stroke();
    }
    // 도형(집게·자석 자리)
    const sl=shapeLoop();if(sl){vctx.beginPath();loopPath(vctx,sl,sc);vctx.fillStyle='rgba(120,120,130,.35)';vctx.fill();vctx.strokeStyle='rgba(90,90,100,.7)';vctx.lineWidth=1;vctx.stroke();}
  }
  const info=$('stageInfo');
  if(info)info.innerHTML=`${t('완성 미리보기')} · ${isSt?(whiteOn?(keepCustomColors()?t('배경 파일'):t('흰 대지')):t('투명 스티커')):(whiteOn?t('3T 투명 아크릴 · 화이트 있음'):t('3T 투명 아크릴 · 화이트 없음 (그림이 비쳐요)'))}`;
}
function setFinalView(on){
  project.ui.view=on?'final':'draft';
  if(S.img){fitAndRender();if(!on)updateInfo();}
  renderItemBar();
}
