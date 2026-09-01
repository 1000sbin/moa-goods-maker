// ===== 계산 =====
function standHasBase(){return S.type==='stand'&&!S.noBase;}
function baseSrcMode(){ // 'shape' | 'upload' | 'art'
  if(!standHasBase())return 'shape';
  const v=$('baseSrc').value;
  if(v==='upload'&&!S.baseImg)return 'shape'; // 아직 안 올렸으면 도형으로
  return v;
}
function baseStripW(){ // 받침 대지의 가로 크기
  if(baseSrcMode()==='upload')return px(+$('baseUpW').value||55);
  return px(+$('baseW').value);
}
function baseStripH(){ // 받침 대지의 세로 크기
  const m=baseSrcMode();
  if(m==='upload')return Math.max(px(3),baseStripW()*(S.baseImg.height/Math.max(1,S.baseImg.width)));
  if(m==='art'&&S.baseArt)return Math.max(px(3),S.baseArt.comp.maxY-S.baseArt.comp.minY+1);
  return px(+$('baseH').value);
}
const BASE_WALL_MM=1.5; // 슬롯 앞뒤 벽 최소 두께 — 이보다 얇으면 꺾여서 못 씀
function pickBaseComp(comps,labels){ // 받침답게 생긴 조각 고르기 — 납작하고 아래쪽에 있는 것
  if(comps.length<2)return -1;
  let best=-1,bs=-1e9;
  comps.forEach((c,i)=>{
    const w=c.maxX-c.minX+1,h=c.maxY-c.minY+1;
    const ar=w/Math.max(1,h);              // 납작할수록 받침답다
    const low=(c.maxY)/Math.max(1,S.pcH);  // 아래쪽에 있을수록 받침답다
    const s=ar*1.6+low*2.2-(h/Math.max(1,S.pcH))*1.2;
    if(s>bs){bs=s;best=i;}
  });
  return best;
}
function compMask(labels,id){ // 특정 조각만 남긴 마스크
  const m=new Uint8Array(S.pW*S.pcH);
  for(let i=0;i<m.length;i++)if(labels[i]===id)m[i]=1;
  return m;
}
function planBaseArt(comp,labels,charComps,tW,acr){
  // 받침 조각 안에 슬롯을 놓고, 앞뒤 벽이 얇으면 슬롯 주변만 살을 붙일 계획을 세운다.
  const bm=compMask(labels,comp.id);
  const inv=new Uint8Array(S.pW*S.pcH);
  for(let i=0;i<inv.length;i++)inv[i]=bm[i]?0:1;
  const depth=edt2d(inv,S.pW,S.pcH); // 조각 내부에서 바깥까지의 거리 = 그 지점의 살 두께
  const wall=px(BASE_WALL_MM);
  const slotW=tW+px(0.4),slotH=acr;
  const bcx=(comp.minX+comp.maxX)/2;
  // 캐릭터들의 촉 간격을 그대로 유지한 채 받침 가운데에 배치 (그린 대로의 간격으로 서게)
  const cxs=charComps.map(c=>c.tabCx);
  const mid=cxs.length?(Math.min.apply(null,cxs)+Math.max.apply(null,cxs))/2:bcx;
  const rel=cxs.map(x=>x-mid);
  // 슬롯 y: 조각 안에서 살이 가장 두꺼운 줄을 찾는다 (전역 슬라이더 오프셋은 그 뒤에 더함)
  // 충분히 두꺼운 줄들 중에서 가운데에 가까운 줄 (벽 두께 우선)
  const midY=(comp.minY+comp.maxY)/2;
  const rows=[];
  for(let y=comp.minY;y<=comp.maxY;y++){
    let sc=1e9;
    for(let k=0;k<Math.max(1,rel.length);k++){
      const cx=bcx+(rel[k]||0);
      sc=Math.min(sc,slotWallAt(depth,bm,cx,y,slotW,slotH));
    }
    rows.push({y,sc});
  }
  const maxW=rows.reduce((a,r)=>Math.max(a,r.sc),0);
  const good=rows.filter(r=>r.sc>=Math.max(wall,maxW*0.8));
  const pickFrom=good.length?good:rows;
  let bestRow=pickFrom[0];
  for(const r of pickFrom){
    if(!good.length){if(r.sc>bestRow.sc)bestRow=r;}
    else if(Math.abs(r.y-midY)<Math.abs(bestRow.y-midY))bestRow=r;
  }
  const bestY=bestRow.y;
  const yOffG=px(+$('slotOff').value||0);
  const slots=[],boss=[];
  let minWall=1e9,fixed=0;
  (rel.length?rel:[0]).forEach((r,k)=>{
    const ci=charComps.length?charComps[k].__i:0;
    const per=px(((S.slotOffs[ci]||{}).y)||0);
    const cy=bestY+yOffG+per;
    const cx=bcx+r;
    const wv=slotWallAt(depth,bm,cx,cy,slotW,slotH);
    minWall=Math.min(minWall,wv);
    slots.push({i:ci,cx,cy,w:slotW,h:slotH,wall:wv});
    if(wv<wall-0.51){ // 벽이 얇음 → 슬롯 주변만 캡슐로 살 붙이기
      const need=wall-wv;
      boss.push({cx,cy,w:slotW+wall*2,h:slotH+wall*2,grow:need});
      fixed++;
    }
  });
  return {comp,slots,boss,minWall,fixed,bm,
    wMm:tomm(comp.maxX-comp.minX+1),hMm:tomm(comp.maxY-comp.minY+1)};
}
function planBaseUpload(charComps,tW,acr,off,sm){
  // 별도로 올린 받침 그림 → 받침 대지에 배치하고 실루엣 칼선·슬롯을 만든다.
  if(!S.baseImg)return null;
  const sw=Math.round(baseStripW()),sh=Math.round(baseStripH());
  const y0=S.pcH+Math.round(px(4));                 // 받침 대지 시작 y
  const x0=Math.round((S.pW-sw)/2);
  // 여백·둥글리기로 부풀린 칼선이 계산 캔버스 밖으로 잘리면 윤곽이 끊겨 긴 사선이 생긴다.
  // 본체가 S.pad를 두는 것과 같은 이유로 사방에 넉넉한 패딩을 둔다.
  const bp=Math.ceil(Math.max(off,0)+px(+$('cornerRound').value||0)+[0,0,px(0.3),px(0.8),px(1.8),px(3.2)][+$('smooth').value||0]+px(2));
  const W=S.pW+bp*2,H=sh+bp*2;
  const c=document.createElement('canvas');c.width=W;c.height=H;
  const cx2=c.getContext('2d');
  cx2.imageSmoothingEnabled=true;cx2.imageSmoothingQuality='high';
  cx2.drawImage(S.baseImg,x0+bp,bp,sw,sh);
  const d=cx2.getImageData(0,0,W,H).data;
  const th=+$('thresh').value||128; // 감도 슬라이더는 이미 0~254 알파값 (백분율 아님)
  const mode=$('bgmode').value;
  const src=new Uint8Array(W*H);
  for(let i=0;i<W*H;i++){
    const a=d[i*4+3];
    if(a<th){src[i]=0;continue;}
    if(mode==='alpha'){src[i]=1;continue;}
    const lum=d[i*4]*.299+d[i*4+1]*.587+d[i*4+2]*.114; // 흰 배경 모드는 본체와 같은 규칙
    src[i]=lum<240?1:0;
  }
  let any=false;for(let i=0;i<W*H;i++)if(src[i]){any=true;break;}
  if(!any)return null;
  // 조각 bbox
  let mnx=W,mny=H,mxx=-1,mxy=-1;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(src[y*W+x]){if(x<mnx)mnx=x;if(x>mxx)mxx=x;if(y<mny)mny=y;if(y>mxy)mxy=y;}
  // 슬롯 위치: 캐릭터 촉 간격을 유지하고 조각 안에서 살이 가장 두꺼운 줄에
  const inv=new Uint8Array(W*H);
  for(let i=0;i<W*H;i++)inv[i]=src[i]?0:1;
  const depth=edt2d(inv,W,H);
  const wall=px(BASE_WALL_MM),slotW=tW+px(0.4),slotH=acr;
  const bcx=(mnx+mxx)/2;
  const cxs=charComps.map(c2=>c2.tabCx);
  const mid=cxs.length?(Math.min.apply(null,cxs)+Math.max.apply(null,cxs))/2:bcx;
  const rel=cxs.length?cxs.map(x=>x-mid):[0];
  const wallAt=(px2,py2)=>slotWallAtBuf(depth,src,W,H,px2,py2,slotW,slotH);
  // 줄마다 벽 두께를 재고, 충분히 두꺼운 줄들 중에서 가운데에 가까운 줄을 고른다.
  // (강도를 크게 깎아가며 가운데로 가진 않는다 — 벽 두께가 우선)
  const midY=(mny+mxy)/2;
  const rows=[];
  for(let y=mny;y<=mxy;y++){
    let sc=1e9;
    for(const r of rel)sc=Math.min(sc,wallAt(bcx+r,y));
    rows.push({y,sc});
  }
  const maxW=rows.reduce((a,r)=>Math.max(a,r.sc),0);
  const good=rows.filter(r=>r.sc>=Math.max(wall,maxW*0.8));
  const pickFrom=good.length?good:rows;
  let bestRow=pickFrom[0];
  for(const r of pickFrom){
    if(!good.length){if(r.sc>bestRow.sc)bestRow=r;}
    else if(Math.abs(r.y-midY)<Math.abs(bestRow.y-midY))bestRow=r;
  }
  const bestY=bestRow.y;
  const yOffG=px(+$('slotOff').value||0);
  const slots=[],boss=[];
  let minWall=1e9,fixed=0;
  rel.forEach((r,k)=>{
    const ci=charComps.length?charComps[k].__i:0;
    const per=px(((S.slotOffs[ci]||{}).y)||0);
    const cyL=bestY+yOffG+per, cxL=bcx+r;
    const wv=wallAt(cxL,cyL);
    minWall=Math.min(minWall,wv);
    slots.push({i:ci,cx:cxL-bp,cy:cyL-bp+y0,w:slotW,h:slotH,wall:wv}); // 패딩 제거 + 판 좌표로 변환
    if(wv<wall-0.51){boss.push({cx:cxL,cy:cyL,w:slotW+wall*2,h:slotH+wall*2});fixed++;}
  });
  // 칼선: 본체와 같은 다듬기(여백·둥글리기)로 실루엣 윤곽
  let MT=src;
  if(boss.length){
    MT=new Uint8Array(W*H);MT.set(src);
    for(const b of boss){
      const r=b.h/2;
      stampRect(MT,W,H,b.cx-b.w/2+r,b.cy-b.h/2,b.cx+b.w/2-r,b.cy+b.h/2);
      stampCircle(MT,W,H,b.cx-b.w/2+r,b.cy,r);
      stampCircle(MT,W,H,b.cx+b.w/2-r,b.cy,r);
    }
  }
  let D,T;
  if(off<0){D=signedDist2d(MT,W,H);T=off;}
  else{D=edt2d(MT,W,H);T=Math.max(0.75,off);}
  let loops=linkLoops(marchingSquares(D,W,H,T));
  const minP=Math.max(12,off*1.2);
  const smWin=[0,0,px(0.3),px(0.8),px(1.8),px(3.2)][sm]||0;
  loops=loops.filter(l=>l.length>=4&&perim(l)>=minP)
    .map(l=>sm>0?chaikin(l,Math.min(2,sm)):l)
    .map(l=>smWin>1?smoothLoop(l,smWin):l)
    .filter(l=>l.length>=3)
    .map(l=>l.map(p=>[p[0]-bp,p[1]-bp+y0])); // 패딩 제거 + 받침 대지 위치로 이동
  return {loops,slots,boss,minWall,fixed,x0,y0,sw,sh,mask:src,W,H,bp,
    wMm:tomm(mxx-mnx+1),hMm:tomm(mxy-mny+1)};
}
function slotWallAtBuf(depth,bm,W,H,cx,cy,w,h){
  const x0=Math.round(cx-w/2),x1=Math.round(cx+w/2),y0=Math.round(cy-h/2),y1=Math.round(cy+h/2);
  let mn=1e9;
  const at=(x,y)=>{if(x<0||y<0||x>=W||y>=H)return 0;const i=y*W+x;return bm[i]?depth[i]:0;};
  for(let x=x0;x<=x1;x++)mn=Math.min(mn,at(x,y0),at(x,y1));
  for(let y=y0;y<=y1;y++)mn=Math.min(mn,at(x0,y),at(x1,y));
  return mn===1e9?0:mn;
}
function slotWallAt(depth,bm,cx,cy,w,h){ // 슬롯 테두리에서 가장 얇은 벽 두께 (px). 조각 밖이면 0
  const x0=Math.round(cx-w/2),x1=Math.round(cx+w/2),y0=Math.round(cy-h/2),y1=Math.round(cy+h/2);
  let mn=1e9;
  const at=(x,y)=>{
    if(x<0||y<0||x>=S.pW||y>=S.pcH)return 0;
    const i=y*S.pW+x;
    return bm[i]?depth[i]:0; // 조각 밖으로 나간 지점은 벽이 없는 것
  };
  for(let x=x0;x<=x1;x++){mn=Math.min(mn,at(x,y0),at(x,y1));}
  for(let y=y0;y<=y1;y++){mn=Math.min(mn,at(x0,y),at(x1,y));}
  return mn===1e9?0:mn;
}
function personComps(mask){ // '인물' 단위 성분 — 작은 파편(땋은 머리·꼬리·장식 조각)은 가장 가까운 큰 덩어리에 흡수
  const lc=labelComponents(mask,S.pW,S.pcH,Math.round(px(4)*px(4)));
  const comps=lc.comps.map(c=>Object.assign({},c));
  if(comps.length<=1)return {comps,labels:lc.labels};
  const area=c=>(c.maxX-c.minX+1)*(c.maxY-c.minY+1);
  const maxA=Math.max.apply(null,comps.map(area));
  const big=comps.filter(c=>area(c)>=maxA*0.18);
  const small=comps.filter(c=>area(c)<maxA*0.18);
  if(!big.length)return {comps,labels:lc.labels};
  for(const s2 of small){
    const cx=(s2.minX+s2.maxX)/2,cy=(s2.minY+s2.maxY)/2;
    let bb=big[0],bd=1e18;
    for(const b2 of big){
      const dx=Math.max(b2.minX-cx,0,cx-b2.maxX),dy=Math.max(b2.minY-cy,0,cy-b2.maxY);
      const d=dx*dx+dy*dy;
      if(d<bd){bd=d;bb=b2;}
    }
    bb.minX=Math.min(bb.minX,s2.minX);bb.maxX=Math.max(bb.maxX,s2.maxX);
    bb.minY=Math.min(bb.minY,s2.minY);bb.maxY=Math.max(bb.maxY,s2.maxY);
  }
  big.sort((a,b)=>a.minX-b.minX); // 왼쪽부터 인물 1,2,3…
  return {comps:big,labels:lc.labels};
}
function earRadius(){return px((+$('hd').value)/2)+px(+$('wall').value);}
function prepareSource(){
  S._srcStamp=(S._srcStamp||0); // 소스 스탬프 — 아래에서 재생성 시 증가
  S.pxmm=(+$('dpi').value||300)/25.4;
  if(S.plate&&(S.kind==='plate'||S.plate.tpl==='art')&&(S._plateDpi!==S.pxmm||(S.plate.slotsFrom&&S._slotKey!==slotKey(S))))rebuildPlate(S); // 판형·그림 모양 판: dpi·슬롯 짝이 바뀌면 다시 합성
  const off=px(+$('offset').value);
  const offPad=Math.max(0,off); // 마이너스 여백은 안쪽으로 파므로 패딩엔 0으로 취급
  let extra=0;
  if(S.type==='ring_tab')extra=Math.max(extra,earRadius()*1.7);
  if(S.type==='stand')extra=Math.max(extra,px(+$('tabH').value));
  if(S.type==='korotto')extra=Math.max(extra,px(4));
  const offXpx=px(S.imgOffX||0), offYpx=px(S.imgOffY||0);
  const cushion=Math.max(Math.abs(offXpx),Math.abs(offYpx));
  const smLv=+$('smooth').value;
  const closeR=px(Math.max(+$('gapClose').value||0,smLv>=4?(smLv===4?3:6):0))/2; // 클로징(틈 좁히기/둥글리기 4~5) 팽창 반지름
  S.pad=Math.ceil(offPad+6+extra+cushion+closeR+2); // 팽창이 판 가장자리에 눌려 잘리지 않도록
  const baseNeed=standHasBase()?(baseStripW()+px(8)):0;
  S.pW=Math.max(S.W+S.pad*2,Math.ceil(baseNeed));
  S.pcH=S.H+S.pad*2;
  S.pH=S.pcH+(standHasBase()?Math.ceil(px(4)+baseStripH()+px(5)):0); // 받침 아래 5mm 여백 — 잘려 보임 방지
  S.boardOn=$('boardOn').checked&&+$('boardW').value>=10&&+$('boardH').value>=10;
  if(S.boardOn){ // 대지 크기 고정: 문서 = 주문 사이즈 (인쇄소 규격)
    S.pW=Math.max(Math.round(px(+$('boardW').value)),standHasBase()?Math.ceil(baseNeed):0); // 스탠드 받침이 폭보다 넓으면 확장
    S.pcH=Math.round(px(+$('boardH').value));
    S.pH=S.pcH+(standHasBase()?Math.ceil(px(4)+baseStripH()+px(5)):0); // 받침은 대지 아래에 별도 배치 (본체 대지는 지정 크기 유지)
  }
  S.xImg=Math.round((S.pW-S.W)/2)+offXpx;
  S.yImg=(S.boardOn?Math.round((S.pcH-S.H)/2):S.pad)+offYpx;
  const c=document.createElement('canvas');c.width=S.pW;c.height=S.pcH;
  const cx=c.getContext('2d');cx.drawImage(S.img,S.xImg,S.yImg);
  S.srcImageData=cx.getImageData(0,0,S.pW,S.pcH);
}
function buildMask(){
  const th=+$('thresh').value,mode=$('bgmode').value;
  const key=mode+'|'+th+'|'+S.pW+'x'+S.pcH+'|'+(S._srcStamp||0);
  if(S._maskCache&&S._maskCache.key===key)return S._maskCache.mask.slice(); // 감도·모드 불변이면 재사용 (둥글리기 등 조작 시 픽셀 스캔 스킵)
  const d=S.srcImageData.data;
  const m=new Uint8Array(S.pW*S.pcH);
  for(let i=0,p=0;i<d.length;i+=4,p++){
    if(mode==='alpha')m[p]=d[i+3]>=th?1:0;
    else{if(d[i+3]<th){m[p]=0;continue;}const lum=d[i]*.299+d[i+1]*.587+d[i+2]*.114;m[p]=lum<240?1:0;}
  }
  S._maskCache={key,mask:m.slice()};
  return m;
}
function bboxOf(m){let a=S.pW,b=S.pcH,c=0,e=0,f=false;for(let y=0;y<S.pcH;y++)for(let x=0;x<S.pW;x++)if(m[y*S.pW+x]){f=true;if(x<a)a=x;if(x>c)c=x;if(y<b)b=y;if(y>e)e=y;}return f?{minX:a,minY:b,maxX:c,maxY:e}:null;}
let _mcD=null; // morphClose 전용 EDT 스크래치 (내부에서 순차 사용·즉시 폐기라 재사용 안전)
function morphClose(mask,W,H,r){ // 팽창 후 침식: 좁은 만(灣) 홈을 메움. 원본 픽셀은 항상 보존.
  // 캔버스 벽 근처 경계 아티팩트 방지: 반지름+2 가상 배경 테두리를 두르고 계산 (팽창이 벽에 눌려 침식이 못 돌아오는 '들러붙음' 차단)
  const p=Math.ceil(r)+2;
  const W2=W+p*2,H2=H+p*2;
  const pm=new Uint8Array(W2*H2);
  for(let y=0;y<H;y++)pm.set(mask.subarray(y*W,y*W+W),(y+p)*W2+p);
  if(!_mcD||_mcD.length<W2*H2)_mcD=new Float64Array(W2*H2);
  const dOut=edt2d(pm,W2,H2,_mcD);
  const dil=new Uint8Array(W2*H2);
  for(let i=0;i<W2*H2;i++)dil[i]=dOut[i]<=r?1:0;
  const inv=new Uint8Array(W2*H2);
  for(let i=0;i<W2*H2;i++)inv[i]=dil[i]?0:1;
  const dIn=edt2d(inv,W2,H2,_mcD); // dOut은 dil 생성 후 불필요 — 같은 스크래치 재사용
  const out=new Uint8Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const j=(y+p)*W2+(x+p);
    out[y*W+x]=((dil[j]&&dIn[j]>r)||mask[y*W+x])?1:0;
  }
  return out;
}
function floodOutside(mask,W,H){ // 테두리에서 배경 flood — 바깥과 연결된 배경 표시
  const out=new Uint8Array(W*H);
  const qx=new Int32Array(W*H),qy=new Int32Array(W*H);let head=0,tail=0;
  const push=(x,y)=>{const i=y*W+x;if(!mask[i]&&!out[i]){out[i]=1;qx[tail]=x;qy[tail++]=y;}};
  for(let x=0;x<W;x++){push(x,0);push(x,H-1);}
  for(let y=0;y<H;y++){push(0,y);push(W-1,y);}
  while(head<tail){
    const x=qx[head],y=qy[head++];
    if(x>0)push(x-1,y);if(x<W-1)push(x+1,y);
    if(y>0)push(x,y-1);if(y<H-1)push(x,y+1);
  }
  return out;
}
function fillClosingArtifacts(closed,orig,W,H){ // 클로징이 만(灣)의 입구만 막아 생긴 갇힌 구멍을 마저 메움
  // 원본에선 바깥과 연결됐던 영역(origOutside)이 클로징 후 갇혔다면(closedOutside 아님) → 인위적 구멍 → 채움
  const origOut=floodOutside(orig,W,H);
  const closedOut=floodOutside(closed,W,H);
  for(let i=0;i<W*H;i++)
    if(!closed[i]&&!closedOut[i]&&origOut[i])closed[i]=1;
  return closed; // 원본부터 진짜 구멍(도넛)은 origOut=0이라 보존
}
function fillSmallHoles(mask,W,H,maxAreaPx){
  if(maxAreaPx<=0)return {filled:0,total:0};
  const visited=new Uint8Array(W*H);
  const stack=[];
  const idx=(y,x)=>y*W+x;
  const pushIfBgUnvisited=(y,x)=>{const i=idx(y,x);if(!mask[i]&&!visited[i]){visited[i]=1;stack.push(i);}};
  for(let x=0;x<W;x++){pushIfBgUnvisited(0,x);pushIfBgUnvisited(H-1,x);}
  for(let y=0;y<H;y++){pushIfBgUnvisited(y,0);pushIfBgUnvisited(y,W-1);}
  while(stack.length){
    const i=stack.pop();const y=(i/W)|0,x=i%W;
    if(x>0)pushIfBgUnvisited(y,x-1);
    if(x<W-1)pushIfBgUnvisited(y,x+1);
    if(y>0)pushIfBgUnvisited(y-1,x);
    if(y<H-1)pushIfBgUnvisited(y+1,x);
  }
  const holeLabel=new Int32Array(W*H).fill(-1);
  let holeId=0,filled=0;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=idx(y,x);
    if(!mask[i]&&!visited[i]&&holeLabel[i]===-1){
      const compStack=[i];holeLabel[i]=holeId;const pixels=[i];
      while(compStack.length){
        const j=compStack.pop();const yy=(j/W)|0,xx=j%W;
        const nbrs=[];
        if(xx>0)nbrs.push(j-1);if(xx<W-1)nbrs.push(j+1);
        if(yy>0)nbrs.push(j-W);if(yy<H-1)nbrs.push(j+W);
        for(const n of nbrs)if(!mask[n]&&!visited[n]&&holeLabel[n]===-1){holeLabel[n]=holeId;compStack.push(n);pixels.push(n);}
      }
      if(pixels.length<=maxAreaPx){for(const p of pixels)mask[p]=1;filled++;}
      holeId++;
    }
  }
  return {filled,total:holeId};
}

function countStickers(mask,W,H,minAreaPx){
  const label=new Uint8Array(W*H); // 방문 여부만
  let count=0;
  for(let i=0;i<W*H;i++){
    if(mask[i]&&!label[i]){
      const st=[i];label[i]=1;let sz=0;
      while(st.length){
        const j=st.pop();sz++;
        const y=(j/W)|0,x=j%W;
        if(x>0&&mask[j-1]&&!label[j-1]){label[j-1]=1;st.push(j-1);}
        if(x<W-1&&mask[j+1]&&!label[j+1]){label[j+1]=1;st.push(j+1);}
        if(y>0&&mask[j-W]&&!label[j-W]){label[j-W]=1;st.push(j-W);}
        if(y<H-1&&mask[j+W]&&!label[j+W]){label[j+W]=1;st.push(j+W);}
      }
      if(sz>=minAreaPx)count++;
    }
  }
  return count;
}
function korottoFlatten(mask,W,H,bb,flatHpx){
  const yFlat=Math.max(bb.minY+2,bb.maxY-flatHpx);
  let minX=W,maxX=0;
  for(let y=Math.max(bb.minY,Math.floor(yFlat));y<=bb.maxY;y++)
    for(let x=bb.minX;x<=bb.maxX;x++)
      if(mask[y*W+x]){if(x<minX)minX=x;if(x>maxX)maxX=x;}
  if(minX>maxX)return null;
  stampRect(mask,W,H,minX,yFlat,maxX,bb.maxY);
  return {minX,maxX,yFlat};
}
let timer=null;
function recompute(reposition,delay){
  if(reposition)S._srcStamp=(S._srcStamp||0)+1; // 소스가 바뀌는 경로(재배치·이미지 로드·DPI 등)는 마스크 캐시 무효화
  clearTimeout(timer);$('spin').style.display='inline';
  timer=setTimeout(()=>{
    computeCore(reposition);
    $('spin').style.display='none';fitAndRender();updateInfo();
  },delay||30);
}
function computeCore(reposition){
    prepareSource();
    let mask=buildMask();
    S.srcMaskData=mask.slice(); // 보정(틈 좁히기·구멍 메우기·평탄화) 전 원본 실루엣 — 백판·디자인 배경 제거 기준
    const smLevel=+$('smooth').value;
    const smoothCloseMm=smLevel>=4?(smLevel===4?3:6):0; // 둥글리기 4단계=3mm, 5단계=6mm 클로징
    const gapMm=Math.max(+$('gapClose').value||0,smoothCloseMm);
    const closeKey=(S._srcStamp||0)+'|'+S.pW+'x'+S.pcH+'|'+$('thresh').value+'|'+$('bgmode').value+'|'+gapMm+'|'+($('fillHoles').checked?$('fillHolesMax').value:'x');
    if(gapMm>0&&S._closeCache&&S._closeCache.key===closeKey){
      mask=S._closeCache.mask.slice(); // 동일 입력 — 인물별 클로징 결과 재사용 (여백·둥글리기 하위 조작 시 큰 절감)
    }else if(gapMm>0){
      // 인물(연결성분)별로 따로 클로징 — 서로 다른 인물이 붙어버리는 융합 방지
      const r=px(gapMm)/2;
      const lcG=labelComponents(S.srcMaskData,S.pW,S.pcH,4);
      if(lcG.comps.length>1){
        const out=S.srcMaskData.slice();
        for(const c of lcG.comps){
          const m0=Math.ceil(r)+3;
          const x0=Math.max(0,c.minX-m0),y0=Math.max(0,c.minY-m0);
          const x1=Math.min(S.pW-1,c.maxX+m0),y1=Math.min(S.pcH-1,c.maxY+m0);
          const cw2=x1-x0+1,ch2=y1-y0+1;
          const sub=new Uint8Array(cw2*ch2);
          for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)
            if(lcG.labels[y*S.pW+x]===c.id)sub[(y-y0)*cw2+(x-x0)]=1;
          const closedSub=fillClosingArtifacts(morphClose(sub,cw2,ch2,r),sub,cw2,ch2);
          for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)
            if(closedSub[(y-y0)*cw2+(x-x0)])out[y*S.pW+x]=1;
        }
        mask=out;
        S._closeCache={key:closeKey,mask:out.slice()};
      }else{
        mask=morphClose(mask,S.pW,S.pcH,r);
        mask=fillClosingArtifacts(mask,S.srcMaskData,S.pW,S.pcH); // 입구만 막힌 만(灣) → 갇힌 구멍 방지
        S._closeCache={key:closeKey,mask:mask.slice()};
      }
    }
    if($('fillHoles').checked){
      const maxAreaPx=(+$('fillHolesMax').value||0)*S.pxmm*S.pxmm;
      S.holeFillResult=fillSmallHoles(mask,S.pW,S.pcH,maxAreaPx);
    }else S.holeFillResult=null;
    S.korottoComps=null;S.rolyInfo=null;
    if(S.type==='korotto'){
      const lc=personComps(mask);
      S.korottoComps=[];
      for(const c of lc.comps){
        const kf=korottoFlatten(mask,S.pW,S.pcH,c,px(+$('korottoFlat').value));
        if(kf)S.korottoComps.push({comp:c,kf});
      }
    }
    S.artMaskData=mask.slice(); // 화이트 레이어용 (코롯토는 평탄화된 바닥까지 포함)
    S.stickerCount=(S.type==='sheet')?countStickers(mask,S.pW,S.pcH,px(2)*px(2)):0;
    S.rawBbox=bboxOf(mask);
    const bb=S.rawBbox;
    if(!bb){S.loops=[];S.baseLoops=[];S.mainMaskData=null;S.artMaskData=null;return;}
    const cxC=(bb.minX+bb.maxX)/2;
    if(S.type==='ring_hole'){
      const pc2=personComps(S.artMaskData);
      const comps=pc2.comps.length?pc2.comps:[{minX:bb.minX,minY:bb.minY,maxX:bb.maxX,maxY:bb.maxY}];
      const hr=px((+$('hd').value)/2);
      S.holes=comps.map((c,i)=>{ // 인원별 타공 (위쪽 중앙 자동 + 개별 드래그 오프셋)
        const o=S.holeOffs[i]||{x:0,y:0};
        const ax=(c.minX+c.maxX)/2,ay=Math.min(c.minY+hr+px(3.5),(c.minY+c.maxY)/2);
        return {x:ax+px(o.x||0),y:ay+px(o.y||0),ax,ay};
      });
    }
    if(!hasHole())S.holes=[];
    const off=px(+$('offset').value);
    let tabCx=cxC,tabWfinalPx=0;
    S._earStamps=null;
    if(S.type==='ring_tab'){
      const erFinal=earRadius(); // 귀는 여백 팽창 '이후' 형상에 최종 크기로 직접 찍음 — 벽 두께가 여백과 완전 분리
      const pc=personComps(mask);
      const comps=pc.comps.length?pc.comps:[{minX:bb.minX,minY:bb.minY,maxX:bb.maxX,maxY:bb.maxY}];
      S.holes=[];S._earStamps=[];
      S._earClamped=false;
      comps.forEach((c,i)=>{ // 인원별로 각자 고리 — 칼선(아크릴 가장자리) 위에 앉음
        const o=S.earOffs[i]||{x:0,y:0};
        const ax=(c.minX+c.maxX)/2,ay=c.minY-off-erFinal*0.55;
        let ex=ax+px(o.x||0),ey=ay+px(o.y||0);
        const m3=erFinal+3; // 고리가 대지 밖으로 잘리지 않게 안쪽으로 클램프 (그림에 더 깊이 박힘)
        const ex2=Math.min(Math.max(ex,m3),S.pW-m3);
        const ey2=Math.min(Math.max(ey,m3),S.pcH-m3);
        if(ex2!==ex||ey2!==ey)S._earClamped=true;
        ex=ex2;ey=ey2;
        S._earStamps.push({ex,ey,er:erFinal,reachY:c.minY-off+px(2)});
        S.holes.push({x:ex,y:ey,ax,ay});
      });
    }
    S.standComps=null;S._tabStamps=null;
    if(S.type==='stand'){
      const lc=personComps(mask);
      const all=lc.comps.length?lc.comps:[{id:0,minX:bb.minX,minY:bb.minY,maxX:bb.maxX,maxY:bb.maxY}];
      all.forEach((c,i)=>{c.__i=i;});
      // 받침을 그림에서 가져오는 모드: 조각 하나를 받침으로 빼고 나머지에만 촉을 붙인다
      let comps=all,baseIdx=-1;
      S.baseArt=null;S._baseBoss=null;S._baseWarn=null;S.baseUp=null;
      if(baseSrcMode()==='art'){
        if(all.length<2)S._baseWarn='need2';
        else{
          const pick=$('basePick').value;
          baseIdx=(pick==='auto')?pickBaseComp(all,lc.labels):Math.min(all.length-1,Math.max(0,parseInt(pick,10)||0));
          comps=all.filter((c,i)=>i!==baseIdx);
          if(!comps.length){comps=all;baseIdx=-1;S._baseWarn='need2';}
        }
      }
      S.baseCandidates=all.map((c,i)=>({i,wMm:+tomm(c.maxX-c.minX+1).toFixed(1),hMm:+tomm(c.maxY-c.minY+1).toFixed(1)}));
      const tWfinal=px(+$('tabW').value),tH=px(+$('tabH').value),overlap=Math.max(2,px(0.5));
      tabWfinalPx=tWfinal;
      S.tabConnectOK=true;
      S._tabStamps=[]; // 촉은 여백 팽창·필렛이 끝난 뒤 최종 크기로 찍음 (부속 = 설정값 그대로, 본체 옵션과 무연동)
      comps.forEach((c,i)=>{ // 인원별로 각자 촉 (왼쪽부터 1,2,3…)
        const o=S.tabOffs[c.__i]||{x:0,y:0};
        const isOn=all.length>1?((x,y)=>lc.labels[y*S.pW+x]===c.id):((x,y)=>!!mask[y*S.pW+x]);
        const anc=bottomTabAnchor(isOn,S.pW,S.pcH,c,tWfinal); // 발끝이 아니라 촉을 받칠 수 있는 넓은 구간 아래
        c.autoCx=anc.cx;c.autoY=anc.y;
        c.tabCx=c.autoCx+px(o.x||0);
        c.attachY=Math.max(c.minY+px(2),Math.min(c.maxY,anc.y+px(o.y||0))); // 구간의 국소 바닥에서 시작. 위로 드래그하면 엉덩이·몸통 쪽까지
        if(!checkTabOverlap(S.artMaskData,S.pW,S.pcH,c.tabCx,tWfinal,c.attachY-overlap,c.maxY))S.tabConnectOK=false;
        S._tabStamps.push({x0:c.tabCx-tWfinal/2,y0:c.attachY-overlap,x1:c.tabCx+tWfinal/2,y1:c.maxY+off+tH});
      });
      S.standComps=comps;
      if(baseSrcMode()==='upload'){
        S.baseUp=planBaseUpload(comps,tWfinal,px(+$('acr').value),off,+$('smooth').value);
        if(!S.baseUp)S._baseWarn='upEmpty';
      }
      if(baseIdx>=0){
        const plan=planBaseArt(all[baseIdx],lc.labels,comps,tWfinal,px(+$('acr').value));
        S.baseArt=plan;
        if(plan.boss.length)S._baseBoss=plan.boss; // 슬롯 주변 살 붙이기 — 촉과 같은 시점에 찍는다
      }
    }
    S.mainMaskData=mask; // 칼선용 (고리·촉 포함 최종 실루엣)
    const sm=+$('smooth').value;
    let D,T;
    if(off<0){D=signedDist2d(mask,S.pW,S.pcH);T=off;} // 마이너스: 그림 안쪽으로 파고드는 등고선
    else{D=edt2d(mask,S.pW,S.pcH);T=Math.max(0.75,off);}
    if(S._earStamps&&S._earStamps.length){ // 귀 스탬프: 여백 팽창이 끝난 형상에 최종 반지름으로 (여백·틈좁히기와 무연동)
      const MT2=new Uint8Array(S.pW*S.pcH);
      for(let i=0;i<MT2.length;i++)MT2[i]=D[i]<=T?1:0;
      for(const e2 of S._earStamps){
        stampCircle(MT2,S.pW,S.pcH,e2.ex,e2.ey,e2.er);
        stampRect(MT2,S.pW,S.pcH,e2.ex-e2.er*0.65,e2.ey,e2.ex+e2.er*0.65,e2.reachY);
      }
      D=edt2d(MT2,S.pW,S.pcH);T=0.5;
    }
    const fil=px(+$('cornerRound').value||0); // 꼭지점 최소 반경 (칼날이 굴러갈 수 있는 곡률)
    if(fil>=1){
      let MT=new Uint8Array(S.pW*S.pcH);
      for(let i=0;i<MT.length;i++)MT[i]=D[i]<=T?1:0; // 오프셋 결과를 이진화
      const filKey=(S._srcStamp||0)+'|'+S.pW+'x'+S.pcH+'|'+$('thresh').value+'|'+$('bgmode').value+'|'+$('gapClose').value+'|'+$('smooth').value+'|'+$('offset').value+'|'+fil.toFixed(2)+'|'+($('fillHoles').checked?$('fillHolesMax').value:'x')
        +'|'+S.type+'|'+$('hd').value+'|'+$('wall').value+'|'+JSON.stringify(S.earOffs||{}); // 귀는 필렛 '입력'에 포함 — 부속 크기·위치 변경 시 캐시 무효화
      if(S._filCache&&S._filCache.key===filKey)MT=S._filCache.mask.slice();
      else{
        MT=filletMask(MT,S.pW,S.pcH,fil); // 인물별 꼭지점 둥글리기 (인물 간 융합 방지)
        S._filCache={key:filKey,mask:MT.slice()};
      }
      D=edt2d(MT,S.pW,S.pcH);T=0.5; // 필렛된 형상 기준으로 등고선 재정의 (이후 이격 보증도 이 D 기준)
    }
    if((S._tabStamps&&S._tabStamps.length)||(S._baseBoss&&S._baseBoss.length)){ // 촉·받침 살: 여백·둥글리기·필렛이 끝난 형상에 최종 크기로
      const MT3=new Uint8Array(S.pW*S.pcH);
      for(let i=0;i<MT3.length;i++)MT3[i]=D[i]<=T?1:0;
      for(const t2 of (S._tabStamps||[]))stampRect(MT3,S.pW,S.pcH,t2.x0,t2.y0,t2.x1,t2.y1);
      for(const b2 of (S._baseBoss||[])){ // 캡슐(양끝 둥근 사각) — 각지지 않게
        const r=b2.h/2;
        stampRect(MT3,S.pW,S.pcH,b2.cx-b2.w/2+r,b2.cy-b2.h/2,b2.cx+b2.w/2-r,b2.cy+b2.h/2);
        stampCircle(MT3,S.pW,S.pcH,b2.cx-b2.w/2+r,b2.cy,r);
        stampCircle(MT3,S.pW,S.pcH,b2.cx+b2.w/2-r,b2.cy,r);
      }
      D=edt2d(MT3,S.pW,S.pcH);T=0.5;
    }
    if(S.plate&&S.plate.tpl==='art'&&S.plate.slotsFrom&&typeof slotLayout==='function'){ // 그림 모양 판: 촉 슬롯은 여백·둥글리기가 끝난 최종 형상에 뚫는다 (여백이 슬롯을 메우지 않게)
      const MT4=new Uint8Array(S.pW*S.pcH);
      for(let i=0;i<MT4.length;i++)MT4[i]=D[i]<=T?1:0;
      for(const sl of slotLayout(S)){if(sl.edgeNotch)continue;
        const x0=Math.round(S.xImg+px(sl.cx-(sl.w+0.1)/2)),x1=Math.round(S.xImg+px(sl.cx+(sl.w+0.1)/2)),y0=Math.round(S.yImg+px(sl.cy-(sl.h+0.1)/2)),y1=Math.round(S.yImg+px(sl.cy+(sl.h+0.1)/2));
        for(let y=Math.max(0,y0);y<Math.min(S.pcH,y1);y++)for(let x=Math.max(0,x0);x<Math.min(S.pW,x1);x++)MT4[y*S.pW+x]=0;}
      D=edt2d(MT4,S.pW,S.pcH);T=0.5;S._slotKey=slotKey(S);
    }
    let loops=linkLoops(marchingSquares(D,S.pW,S.pcH,T));
    const minP=Math.max(12,off*1.2);
    loops=loops.filter(l=>l.length>=4&&perim(l)>=minP).map(l=>(sm>0||fil>=1)?chaikin(l,Math.max(sm>0?Math.min(2,sm):0,fil>=1?2:0)):l); // 필렛 시엔 각지게여도 계단 정리
    const smWin=[0,0,px(0.3),px(0.8),px(1.8),px(3.2)][sm]||0;
    const protect=hasHole()&&S.holes.length?S.holes.map(h=>({x:h.x,y:h.y,
      r:(S.type==='ring_tab'?earRadius()+px(1):px((+$('hd').value)/2)+off+px(1))})):null; // 고리 벽(최종 크기)/타공+여백 보호 반경
    S._fitProtect=protect||[]; // 피팅(앵커 최소화 포함)에서도 부속 주변은 정밀 유지
    if(smWin>1)loops=loops.map(l=>smoothLoop(l,smWin,protect,(fil>=1?T:off)>px(0.8)||fil>=1?D:null,S.pW,fil>=1?0.4:Math.max(1,off*0.8))); // 이동평균 + 이격 보증 (필렛 시 필렛 형상 기준)
    loops=loops.map(untwistLoop); // 최종 안전망 — 자기교차(꼬임) 혹 제거로 단순 루프 보증
    if(loopsCrossEachOther(loops)){ // 둥글리기가 좁은 간격의 이웃 루프를 서로 겹치게 부풀린 경우 → 합집합으로 재추출
      const m2=scanlineFill(loops,S.pW,S.pcH);
      const D2=edt2d(m2,S.pW,S.pcH);
      loops=linkLoops(marchingSquares(D2,S.pW,S.pcH,0.5)).filter(l=>l.length>=4&&perim(l)>=minP);
      loops=loops.map(l=>chaikin(l,1)).map(l=>smoothLoop(l,3)).map(untwistLoop);
      toast('✂️ '+t('겹친 칼선을 하나로 합쳤어요'));
    }
    if(S.type==='stand'&&S.standComps&&tabWfinalPx>0){
      // 여백/둥글리기가 촉 끝을 둥글게 만드는 건 어쩔 수 없는 성질이라, 각 인원의 촉 아랫부분만 각진 사각형으로 갈아끼움
      loops=loops.map(l=>{
        const i=loopCompIdx(l,S.standComps);if(i<0)return l;
        const c=S.standComps[i];
        return spliceSharpTab(l,c.tabCx-tabWfinalPx/2,c.tabCx+tabWfinalPx/2,c.maxY+off);
      });
    }
    S.rolyInfo=null;
    if(S.type==='korotto'&&S.korottoComps&&S.korottoComps.length){
      const comps=S.korottoComps.map(k=>k.comp);
      if($('korottoMode').value==='roly'){
        // 인원별 바닥을 둥근 원호로 — 반지름은 그 인원의 무게중심에서 역산
        const byComp=new Map();
        for(const l of loops){const i=loopCompIdx(l,comps);if(i<0)continue;if(!byComp.has(i))byComp.set(i,[]);byComp.get(i).push(l);}
        const out=loops.slice(),info=[];
        for(const [ci,ls] of byComp){
          const r=planRoly(ls,S.korottoComps[ci],off);
          if(!r)continue;
          ls.forEach((l,j)=>{const idx=out.indexOf(l);if(idx>=0)out[idx]=r.loops[j];});
          info.push(r);
        }
        loops=out;
        if(info.length)S.rolyInfo=info;
      }else{
        // 인원별 바닥을 각각 평평하게 갈아끼움
        loops=loops.map(l=>{
          const i=loopCompIdx(l,comps);if(i<0)return l;
          const k=S.korottoComps[i];
          const yThresh=(k.kf.yFlat+k.comp.maxY)/2;
          return spliceSharpTab(l,k.kf.minX-off,k.kf.maxX+off,yThresh,px(+$('korottoRad').value||0));
        });
      }
    }
    S.loops=loops;
    S.baseLoops=[];
    if(S.type==='stand'&&S.noBase){ /* 받침 없이 — 촉만 */ }
    else if(S.type==='stand'&&S.baseUp){ // 별도로 올린 받침 그림
      S.slotRects=[];
      for(const l of S.baseUp.loops)S.baseLoops.push(l);
      for(const s2 of S.baseUp.slots){
        S.slotRects.push({i:s2.i,cx:s2.cx,cy:s2.cy,w:s2.w,h:s2.h});
        S.baseLoops.push(rectLoop(s2.cx,s2.cy,s2.w,s2.h));
      }
    }
    else if(S.type==='stand'&&S.baseArt){ // 받침은 그림 조각의 칼선이 그대로 쓰이고, 슬롯만 뚫는다
      S.slotRects=[];
      for(const s2 of S.baseArt.slots){
        S.slotRects.push({i:s2.i,cx:s2.cx,cy:s2.cy,w:s2.w,h:s2.h});
        S.baseLoops.push(rectLoop(s2.cx,s2.cy,s2.w,s2.h));
      }
    }else if(S.type==='stand'&&S.standComps){
      const baseW=px(+$('baseW').value),baseH=px(+$('baseH').value),acr=px(+$('acr').value),tW=px(+$('tabW').value);
      const baseCY=S.pcH+px(4)+baseH/2;
      const bShape=$('baseShape').value;
      S.slotRects=[];
      // 받침 겹침 그룹핑 (좌→우) — 겹치거나 1mm 이내로 붙으면 하나의 받침으로 병합
      const groups=[];
      S.standComps.forEach((c,ci)=>{
        const L=c.tabCx-baseW/2,R=c.tabCx+baseW/2;
        const g=groups[groups.length-1];
        if(g&&L<=g.R+px(1)){g.R=Math.max(g.R,R);g.slots.push({cx:c.tabCx,i:ci});}
        else groups.push({L,R,slots:[{cx:c.tabCx,i:ci}]});
      });
      for(const g of groups){
        const gcx=(g.L+g.R)/2,gw=g.R-g.L;
        if(g.slots.length>1){ // 병합 받침: 알약형(타원 모드)/둥근사각(사각 모드) 하나로
          const r=bShape==='ellipse'?baseH/2:px(+$('baseRad').value||0);
          S.baseLoops.push(roundedRectLoop(gcx,baseCY,gw,baseH,r));
        }else{
          if(bShape==='ellipse')S.baseLoops.push(ellipseLoop(gcx,baseCY,gw/2,baseH/2));
          else S.baseLoops.push(roundedRectLoop(gcx,baseCY,gw,baseH,px(+$('baseRad').value||0)));
        }
        const slotLim=Math.max(0,baseH/2-acr/2-px(1.5)); // 앞뒤 벽 최소 1.5mm 보장
        for(const sl2 of g.slots){ // 슬롯은 각 촉 위치에 — 전역 슬라이더 + 개별 드래그 오프셋
          const yOff=px((+$('slotOff').value||0)+((S.slotOffs[sl2.i]||{}).y||0));
          const slotY=baseCY+Math.max(-slotLim,Math.min(slotLim,yOff));
          S.slotRects=S.slotRects||[];
          S.slotRects.push({i:sl2.i,cx:sl2.cx,cy:slotY,w:tW+px(0.4),h:acr});
          S.baseLoops.push(rectLoop(sl2.cx,slotY,tW+px(0.4),acr));
        }
      }
    }
}

function smoothLoop(loop,winPx,protect,D,W,minD){ // 균일 리샘플 + 원형 이동평균. protect=[{x,y,r}] 원형 유지, D+minD 주면 이격 보증(원위치 방향 클램프)
  if(winPx<=1||loop.length<8)return loop;
  const pts=(loop.length>2&&loop[0][0]===loop[loop.length-1][0]&&loop[0][1]===loop[loop.length-1][1])?loop.slice(0,-1):loop.slice();
  const rs=[];const step=1;let acc=0;rs.push([pts[0][0],pts[0][1]]);
  for(let i=1;i<=pts.length;i++){
    let a=[...pts[i-1]];const b=pts[i%pts.length];
    let seg=Math.hypot(b[0]-a[0],b[1]-a[1]);
    while(acc+seg>=step){
      const t=(step-acc)/seg;
      const nx=a[0]+(b[0]-a[0])*t,ny=a[1]+(b[1]-a[1])*t;
      rs.push([nx,ny]);a=[nx,ny];seg=Math.hypot(b[0]-a[0],b[1]-a[1]);acc=0;
    }
    acc+=seg;
  }
  const n=rs.length;if(n<8)return loop;
  const half=Math.max(1,Math.round(winPx/2));
  const F=10; // 보호 경계 페더(px)
  const H2=D?Math.floor(D.length/W):0;
  const sampD=D?((x,y)=>{
    x=Math.max(0,Math.min(W-1.001,x));y=Math.max(0,Math.min(H2-1.001,y));
    const x0=x|0,y0=y|0,fx=x-x0,fy=y-y0,i=y0*W+x0;
    return D[i]*(1-fx)*(1-fy)+D[i+1]*fx*(1-fy)+D[i+W]*(1-fx)*fy+D[i+W+1]*fx*fy;
  }):null;
  const out=[];
  for(let i=0;i<n;i++){
    let sx=0,sy=0,c=0;
    for(let k=-half;k<=half;k++){const q=rs[(i+k+n)%n];sx+=q[0];sy+=q[1];c++;}
    let ax=sx/c,ay=sy/c;
    if(protect&&protect.length){ // 타공·고리 주변은 원형 보존 — 벽 두께 사수
      let w=1;
      for(const pr of protect){
        const d=Math.hypot(rs[i][0]-pr.x,rs[i][1]-pr.y);
        w=Math.min(w,Math.max(0,Math.min(1,(d-pr.r)/F)));
      }
      ax=rs[i][0]+(ax-rs[i][0])*w;ay=rs[i][1]+(ay-rs[i][1])*w;
    }
    if(sampD&&minD&&sampD(ax,ay)<minD){
      // 그림 침범: 원위치(rs, 항상 이격 만족) 방향으로 스무딩 양을 줄여 클램프
      // — 기울기 밀기와 달리 반대편으로 넘어갈 수 없어 패스 꼬임이 원천 차단됨
      const ox=rs[i][0],oy=rs[i][1];
      let lo=0,hi=1,bx=ox,by=oy;
      for(let it=0;it<7;it++){
        const mid=(lo+hi)/2;
        const mx=ox+(ax-ox)*mid,my=oy+(ay-oy)*mid;
        if(sampD(mx,my)>=minD){lo=mid;bx=mx;by=my;}
        else hi=mid;
      }
      ax=bx;ay=by;
    }
    out.push([ax,ay]);
  }
  out.push(out[0]);
  return out;
}
function scanlineFill(loops,W,H){ // even-odd 스캔라인 래스터화 — 루프 집합 → 이진 마스크
  const m=new Uint8Array(W*H);
  const rows=Array.from({length:H},()=>[]);
  for(const l of loops){
    const pts=(l.length>2&&l[0][0]===l[l.length-1][0]&&l[0][1]===l[l.length-1][1])?l.slice(0,-1):l;
    const n=pts.length;
    for(let i=0;i<n;i++){
      const a=pts[i],b=pts[(i+1)%n];
      if(a[1]===b[1])continue;
      const yMin=Math.min(a[1],b[1]),yMax=Math.max(a[1],b[1]);
      const y0=Math.max(0,Math.ceil(yMin-0.5)),y1=Math.min(H-1,Math.floor(yMax-0.5+0.9999));
      for(let y=y0;y<=y1;y++){
        const yc=y+0.5;
        if((a[1]<=yc&&b[1]>yc)||(b[1]<=yc&&a[1]>yc))
          rows[y].push(a[0]+(yc-a[1])*(b[0]-a[0])/(b[1]-a[1]));
      }
    }
  }
  for(let y=0;y<H;y++){
    const xs=rows[y];if(xs.length<2)continue;
    xs.sort((a,b)=>a-b);
    for(let k=0;k+1<xs.length;k+=2){
      const x0=Math.max(0,Math.ceil(xs[k]-0.5)),x1=Math.min(W-1,Math.floor(xs[k+1]-0.5));
      for(let x=x0;x<=x1;x++)m[y*W+x]=1;
    }
  }
  return m;
}
function loopsCrossEachOther(loops){ // 서로 다른 루프 간 교차 여부 (공간 해시)
  if(loops.length<2)return false;
  const cell=14,map=new Map();
  const inter=(p,p2,q,q2)=>{
    const d1x=p2[0]-p[0],d1y=p2[1]-p[1],d2x=q2[0]-q[0],d2y=q2[1]-q[1];
    const den=d1x*d2y-d1y*d2x;if(Math.abs(den)<1e-12)return false;
    const t=((q[0]-p[0])*d2y-(q[1]-p[1])*d2x)/den;
    const u=((q[0]-p[0])*d1y-(q[1]-p[1])*d1x)/den;
    return t>0.001&&t<0.999&&u>0.001&&u<0.999;
  };
  const segs=[];
  loops.forEach((l,li)=>{
    const pts=(l.length>2&&l[0][0]===l[l.length-1][0]&&l[0][1]===l[l.length-1][1])?l.slice(0,-1):l;
    const n=pts.length;
    for(let i=0;i<n;i++){
      const a=pts[i],b=pts[(i+1)%n],id=segs.length;
      segs.push({a,b,li});
      const x0=Math.floor(Math.min(a[0],b[0])/cell),x1=Math.floor(Math.max(a[0],b[0])/cell);
      const y0=Math.floor(Math.min(a[1],b[1])/cell),y1=Math.floor(Math.max(a[1],b[1])/cell);
      for(let cx=x0;cx<=x1;cx++)for(let cy=y0;cy<=y1;cy++){
        const k=cx+'_'+cy;
        if(!map.has(k))map.set(k,[]);
        map.get(k).push(id);
      }
    }
  });
  for(const arr of map.values()){
    for(let i=0;i<arr.length;i++)for(let j2=i+1;j2<arr.length;j2++){
      const A=segs[arr[i]],B=segs[arr[j2]];
      if(A.li===B.li)continue;
      if(inter(A.a,A.b,B.a,B.b))return true;
    }
  }
  return false;
}
function filletOneMask(sub,cw,ch,fil){ // 단일 성분 필렛: V홈 클로징(fil) + 스파이크 오프닝(fil/2, 머리끝 보존) + 입구 좁은 홈 메우기
  const sub0=sub.slice();
  let MT=fillClosingArtifacts(morphClose(sub,cw,ch,fil),sub0,cw,ch);
  const inv=new Uint8Array(MT.length);
  for(let i=0;i<MT.length;i++)inv[i]=MT[i]?0:1;
  const invC=morphClose(inv,cw,ch,Math.max(1,fil*0.5)); // 바깥 뾰족점은 절반 반경만 — 인쇄소가 문제 삼는 건 주로 안쪽 V
  for(let i=0;i<MT.length;i++)MT[i]=invC[i]?0:1;
  const bigR=Math.max(fil*3,px(2.5));
  const big=morphClose(MT,cw,ch,bigR);
  const bay=new Uint8Array(MT.length);
  let has=0;
  for(let i=0;i<MT.length;i++){bay[i]=(big[i]&&!MT[i])?1:0;has+=bay[i];}
  if(has){
    // 스위치백 홈 판별: '입구 폭' 기준 — 좁은 입구(≤2.6×fil)로 들어가는 주머니만 메움.
    // 얕고 넓은 물결 굴곡(머리 웨이브)은 입구가 넓어 보존됨
    const lcB=labelComponents(bay,cw,ch,4);
    const mouth=new Float64Array(lcB.comps.length+1);
    for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
      const i=y*cw+x,id=lcB.labels[i];
      if(!id)continue;
      const nOut=(x>0&&!big[i-1]&&!MT[i-1])||(x<cw-1&&!big[i+1]&&!MT[i+1])||(y>0&&!big[i-cw]&&!MT[i-cw])||(y<ch-1&&!big[i+cw]&&!MT[i+cw]);
      if(nOut)mouth[id]++;
    }
    for(let i=0;i<MT.length;i++){
      const id=lcB.labels[i];
      if(id&&mouth[id]>0&&mouth[id]<=fil*2.6)MT[i]=1;
    }
  }
  return MT;
}
function filletMask(MT,W,H,fil){ // 꼭지점 둥글리기 — 인물(연결 성분)별로 각자 적용해 인물 간 융합·다리 방지
  const lcF=labelComponents(MT,W,H,4);
  if(lcF.comps.length<=1)return filletOneMask(MT,W,H,fil);
  const out=new Uint8Array(MT.length);
  const m0=Math.ceil(Math.max(fil*3,px(2.5)))+3;
  for(const cc of lcF.comps){
    const x0=Math.max(0,cc.minX-m0),y0=Math.max(0,cc.minY-m0);
    const x1=Math.min(W-1,cc.maxX+m0),y1=Math.min(H-1,cc.maxY+m0);
    const cw=x1-x0+1,ch=y1-y0+1;
    const sub=new Uint8Array(cw*ch);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)
      if(lcF.labels[y*W+x]===cc.id)sub[(y-y0)*cw+(x-x0)]=1;
    const fs2=filletOneMask(sub,cw,ch,fil);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)
      if(fs2[(y-y0)*cw+(x-x0)])out[y*W+x]=1;
  }
  return out;
}
// CMYK PSD 라이터 — 모아 굿즈메이커용 (레이어: RGBA ImageData → CMYK 4채널+알파, 반전 저장)
// CMYK PSD 라이터 — Adobe Photoshop File Formats Specification 기준 직접 구현
function writeCmykPsd(opt){
  const {width:W,height:H,dpi=300,layers=[]}=opt;
  const chunks=[];
  const push=b=>chunks.push(b);
  const be16=v=>{const b=new Uint8Array(2);b[0]=v>>8&255;b[1]=v&255;return b;};
  const be32=v=>{const b=new Uint8Array(4);b[0]=v>>>24;b[1]=v>>>16&255;b[2]=v>>>8&255;b[3]=v&255;return b;};
  const ascii=s=>new Uint8Array([...s].map(c=>c.charCodeAt(0)));
  // ---- RGBA → CMYK(반전)+A 플레인 ----
  function planesOf(img){
    const n=img.width*img.height,d=img.data;
    const A=new Uint8Array(n),C=new Uint8Array(n),M=new Uint8Array(n),Y=new Uint8Array(n),K=new Uint8Array(n);
    for(let i=0;i<n;i++){
      const r=d[i*4]/255,g=d[i*4+1]/255,b=d[i*4+2]/255;
      A[i]=d[i*4+3];
      const k=1-Math.max(r,g,b);
      let c=0,m=0,y=0;
      if(k<1){c=(1-r-k)/(1-k);m=(1-g-k)/(1-k);y=(1-b-k)/(1-k);}
      C[i]=Math.round(255*(1-c));M[i]=Math.round(255*(1-m));
      Y[i]=Math.round(255*(1-y));K[i]=Math.round(255*(1-k));
    }
    return {A,C,M,Y,K};
  }
  // ---- Header ----
  push(ascii('8BPS'));push(be16(1));push(new Uint8Array(6));
  push(be16(4));push(be32(H));push(be32(W));push(be16(8));push(be16(4)); // 4ch, depth8, CMYK
  push(be32(0)); // color mode data
  // ---- Image resources: 1005 ResolutionInfo ----
  const res=[];
  const fixed=v=>be32(Math.round(v*65536));
  const r1005=[fixed(dpi),be16(1),be16(1),fixed(dpi),be16(1),be16(1)];
  const rlen=r1005.reduce((a,b)=>a+b.length,0);
  res.push(ascii('8BIM'),be16(1005),be16(0),be32(rlen),...r1005);
  if(rlen%2)res.push(new Uint8Array(1));
  const resTotal=res.reduce((a,b)=>a+b.length,0);
  push(be32(resTotal));res.forEach(push);
  // ---- Layer & mask ----
  const layerParts=[];
  const lp=b=>layerParts.push(b);
  lp(be16(layers.length));
  const chanDatas=[];
  for(const L of layers){
    const img=L.imageData;
    const {A,C,M,Y,K}=planesOf(img);
    const top=L.top|0,left=L.left|0,bottom=top+img.height,right=left+img.width;
    lp(be32(top));lp(be32(left));lp(be32(bottom));lp(be32(right));
    const chans=[[-1,A],[0,C],[1,M],[2,Y],[3,K]];
    lp(be16(chans.length));
    for(const [id,plane] of chans){
      lp(be16(id&0xffff));lp(be32(2+plane.length)); // compression(2)+raw
      chanDatas.push(plane);
    }
    lp(ascii('8BIM'));lp(ascii('norm'));
    lp(new Uint8Array([255,0,0,0])); // opacity, clipping, flags, filler
    // extra: mask(0) + blending ranges(0) + pascal name + luni
    const nameAscii='layer';
    const pas=new Uint8Array(1+nameAscii.length);pas[0]=nameAscii.length;
    for(let i=0;i<nameAscii.length;i++)pas[1+i]=nameAscii.charCodeAt(i);
    const pasPadded=new Uint8Array(Math.ceil(pas.length/4)*4);pasPadded.set(pas);
    const uname=L.name||'layer';
    const uni=[be32(uname.length)];
    for(const ch of uname)uni.push(be16(ch.charCodeAt(0)));
    const uniBody=concat(uni);
    const luniLen=uniBody.length;
    const luni=concat([ascii('8BIM'),ascii('luni'),be32(luniLen),uniBody, (luniLen%2? new Uint8Array(1):new Uint8Array(0))]);
    const extra=concat([be32(0),be32(0),pasPadded,luni]);
    lp(be32(extra.length));lp(extra);
  }
  // channel image data (레이어 순서대로, 채널마다 compression0 + raw)
  for(const plane of chanDatas){lp(be16(0));lp(plane);}
  let layerInfo=concat(layerParts);
  if(layerInfo.length%2)layerInfo=concat([layerInfo,new Uint8Array(1)]);
  const lm=concat([be32(layerInfo.length),layerInfo,be32(0)]); // + global mask 0
  push(be32(lm.length));push(lm);
  // ---- Composite (흰 배경 위 레이어 합성) ----
  const comp={width:W,height:H,data:new Uint8ClampedArray(W*H*4).fill(255)};
  for(const L of layers){
    const img=L.imageData,ox=L.left|0,oy=L.top|0;
    for(let y=0;y<img.height;y++){
      const ty=oy+y;if(ty<0||ty>=H)continue;
      for(let x=0;x<img.width;x++){
        const tx=ox+x;if(tx<0||tx>=W)continue;
        const si=(y*img.width+x)*4,di=(ty*W+tx)*4;
        const a=img.data[si+3]/255;
        if(a<=0)continue;
        for(let c2=0;c2<3;c2++)comp.data[di+c2]=Math.round(img.data[si+c2]*a+comp.data[di+c2]*(1-a));
        comp.data[di+3]=255;
      }
    }
  }
  const cp=planesOf(comp);
  push(be16(0)); // raw
  push(cp.C);push(cp.M);push(cp.Y);push(cp.K);
  function concat(arr){
    const t=arr.reduce((a,b)=>a+b.length,0);
    const o=new Uint8Array(t);let p=0;
    for(const b of arr){o.set(b,p);p+=b.length;}
    return o;
  }
  return concat(chunks).buffer;
}


function untwistLoop(loop){ // 자기교차(꼬임) 제거 — 교차로 생긴 작은 혹/니들을 잘라내 단순 루프 보증
  let pts=(loop.length>2&&loop[0][0]===loop[loop.length-1][0]&&loop[0][1]===loop[loop.length-1][1])?loop.slice(0,-1):loop.slice();
  const inter=(p,p2,q,q2)=>{
    const d1x=p2[0]-p[0],d1y=p2[1]-p[1],d2x=q2[0]-q[0],d2y=q2[1]-q[1];
    const den=d1x*d2y-d1y*d2x;if(Math.abs(den)<1e-12)return null;
    const t=((q[0]-p[0])*d2y-(q[1]-p[1])*d2x)/den;
    const u=((q[0]-p[0])*d1y-(q[1]-p[1])*d1x)/den;
    if(t<=0.001||t>=0.999||u<=0.001||u>=0.999)return null;
    return [p[0]+d1x*t,p[1]+d1y*t];
  };
  let guard=0;
  while(guard++<12){
    const n=pts.length;if(n<4)break;
    // 공간 해시로 근접 세그먼트 쌍만 검사
    const cell=12,map=new Map();
    for(let i=0;i<n;i++){
      const a=pts[i],b=pts[(i+1)%n];
      const x0=Math.floor(Math.min(a[0],b[0])/cell),x1=Math.floor(Math.max(a[0],b[0])/cell);
      const y0=Math.floor(Math.min(a[1],b[1])/cell),y1=Math.floor(Math.max(a[1],b[1])/cell);
      for(let cx=x0;cx<=x1;cx++)for(let cy=y0;cy<=y1;cy++){
        const k=cx+'_'+cy;
        if(!map.has(k))map.set(k,[]);
        map.get(k).push(i);
      }
    }
    let hit=null;
    outer:
    for(const arr of map.values()){
      for(let a2=0;a2<arr.length&&!hit;a2++)for(let b2=a2+1;b2<arr.length;b2++){
        const i=Math.min(arr[a2],arr[b2]),j=Math.max(arr[a2],arr[b2]);
        if(j-i<2||(i===0&&j===n-1))continue; // 인접 세그먼트 제외
        const X=inter(pts[i],pts[(i+1)%n],pts[j],pts[(j+1)%n]);
        if(X){hit={i,j,X};break outer;}
      }
    }
    if(!hit)break;
    // 교차점 기준 두 갈래 중 짧은 쪽(혹)을 제거
    const {i,j,X}=hit;
    const inside=pts.slice(i+1,j+1);   // i+1..j
    const outside=pts.slice(j+1).concat(pts.slice(0,i+1)); // j+1..i
    const plen=a2=>{let s2=0;for(let k2=1;k2<a2.length;k2++)s2+=Math.hypot(a2[k2][0]-a2[k2-1][0],a2[k2][1]-a2[k2-1][1]);return s2;};
    pts=(plen(inside)<=plen(outside))?outside.concat([X]):inside.concat([X]);
  }
  pts.push(pts[0]);
  return pts;
}
function shapeLoop(){ // 현재 설정 기준 도형 오버레이 루프 (px 좌표)
  if(!$('shapeOn').checked||!S.img)return null;
  if(!S.shapePlaced){ // 처음 켜면 그림 중앙
    const bb=S.rawBbox;
    S.shapeX=bb?(bb.minX+bb.maxX)/2:S.pW/2;
    S.shapeY=bb?(bb.minY+bb.maxY)/2:S.pcH/2;
    S.shapePlaced=true;
  }
  const sw=px(+$('shapeW').value),sh=px(+$('shapeH').value),sr=px(+$('shapeR').value),kind=$('shapeKind').value;
  if(kind==='circle'){const r=Math.min(sw,sh)/2;return ellipseLoop(S.shapeX,S.shapeY,r,r);}
  if(kind==='ellipse')return ellipseLoop(S.shapeX,S.shapeY,sw/2,sh/2);
  if(kind==='rrect')return roundedRectLoop(S.shapeX,S.shapeY,sw,sh,sr);
  return rectLoop(S.shapeX,S.shapeY,sw,sh);
}
