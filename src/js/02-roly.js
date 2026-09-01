// ===== 오뚝이(roly-poly) 무게중심 · 바닥 원호 =====
// 아크릴은 두께가 균일하니 무게중심 = 잘린 도형의 면적 중심. 두께는 안정성 계산에서 상쇄돼 무관하다.
function polyMoment(pts){ // shoelace — 면적과 1차 모멘트 (감김 방향 무관하게 절대면적 + 중심 반환)
  let A=0,mx=0,my=0;
  for(let i=0,n=pts.length;i<n;i++){
    const a=pts[i],b=pts[(i+1)%n];
    const cr=a[0]*b[1]-b[0]*a[1];
    A+=cr; mx+=(a[0]+b[0])*cr; my+=(a[1]+b[1])*cr;
  }
  A/=2;
  if(Math.abs(A)<1e-9)return {A:0,cx:0,cy:0};
  return {A:Math.abs(A),cx:mx/(6*A),cy:my/(6*A)};
}
function pointInPoly(x,y,pts){
  let inside=false;
  for(let i=0,n=pts.length,j=n-1;i<n;j=i++){
    const xi=pts[i][0],yi=pts[i][1],xj=pts[j][0],yj=pts[j][1];
    if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
  }
  return inside;
}
function loopsCentroid(loops){ // 루프 집합 → 면적·무게중심. 내부 구멍(타공·팔틈)은 중첩 깊이로 판별해 빼줌
  const ps=loops.map(l=>{
    const closed=l.length>2&&l[0][0]===l[l.length-1][0]&&l[0][1]===l[l.length-1][1];
    return closed?l.slice(0,-1):l;
  }).filter(p=>p.length>=3);
  if(!ps.length)return null;
  const ms=ps.map(polyMoment);
  let A=0,mx=0,my=0;
  for(let i=0;i<ps.length;i++){
    let depth=0;
    for(let j=0;j<ps.length;j++){
      if(i===j||ms[j].A<=ms[i].A)continue; // 자기보다 큰 루프만 감쌀 수 있음
      if(pointInPoly(ps[i][0][0],ps[i][0][1],ps[j]))depth++;
    }
    const s=(depth%2===0)?1:-1;
    A+=s*ms[i].A; mx+=s*ms[i].A*ms[i].cx; my+=s*ms[i].A*ms[i].cy;
  }
  if(A<=1e-9)return null;
  return {A,cx:mx/A,cy:my/A};
}
function rolyHalfW(xL,xR,arcCx){return Math.max(Math.abs(xL-arcCx),Math.abs(xR-arcCx));}
function rolyRmin(xL,xR,arcCx){ // 기하 하한 — 이보다 작으면 원호가 바닥 폭을 못 덮어 끝에서 접선이 수직으로 서고 언더컷이 생김
  return rolyHalfW(xL,xR,arcCx)*1.02;
}
function rolyFilletR(xL,xR,arcCx,cornerR,room){ // 원호 끝 ↔ 측벽 코너를 둥글릴 반지름 (기하 한계로 제한)
  // 필렛 반지름은 바닥이 파이는 깊이의 하한이 된다(깊이 ≥ r). 세로 여유가 좁으면 반드시 같이 줄여야 함.
  const w=rolyHalfW(xL,xR,arcCx);
  return Math.max(0,Math.min(cornerR||0,(xR-xL)*0.25,w*0.5,(room||Infinity)*0.55));
}
function rolyDepth(xL,xR,arcCx,R,r){ // 측벽에서 바닥이 파이는 깊이. r=0이면 통상 sagitta와 같다
  const w=rolyHalfW(xL,xR,arcCx),a=R-r,b=w-r;
  return R-Math.sqrt(Math.max(0,a*a-b*b));
}
function rolyTiltDeg(xL,xR,arcCx,R,r){ // 접지점이 원호를 벗어나기 전 최대 기울기 (넘어가면 필렛에 얹혀 넘어짐)
  const w=rolyHalfW(xL,xR,arcCx);
  return Math.asin(Math.max(0,Math.min(1,(w-r)/Math.max(1e-6,R-r))))*180/Math.PI;
}
function rolyRfloor(xL,xR,arcCx,sagMax,r){ // 바닥 폭을 'sagMax 깊이 안에서' 덮는 최소 반지름
  // 반지름이 작을수록 원호는 반원에 가까워져 바닥이 깊게 파인다 → 얕게 덮으려면 반지름을 키워야 한다.
  // 필렛이 있으면 측벽 쪽이 더 깊게 파이므로 깊이는 수식으로 두고 반지름만 이분탐색 (깊이는 R에 단조감소).
  const w=rolyHalfW(xL,xR,arcCx),s=Math.max(0.5,sagMax);
  let lo=Math.max(w*1.02,r+1),hi=Math.max(lo*2,w*200+s);
  if(rolyDepth(xL,xR,arcCx,lo,r)<=s)return Math.max(lo,rolyRmin(xL,xR,arcCx));
  for(let i=0;i<60;i++){const m=(lo+hi)/2;if(rolyDepth(xL,xR,arcCx,m,r)>s)lo=m;else hi=m;}
  return Math.max(hi,rolyRmin(xL,xR,arcCx));
}
function spliceArcBottom(loopClosed,xL,xR,yThresh,R,arcCx,cornerR){ // 바닥 직선을 원호로 갈아끼움 (최저점이 arcCx에 접함, 양끝은 필렛)
  const closed=loopClosed.length>1&&loopClosed[0][0]===loopClosed[loopClosed.length-1][0]&&loopClosed[0][1]===loopClosed[loopClosed.length-1][1];
  const loop=closed?loopClosed.slice(0,-1):loopClosed.slice();
  const n=loop.length;
  if(n<4)return loopClosed;
  const inTab=loop.map(p=>p[1]>yThresh);
  let start=-1,end=-1;
  for(let i=0;i<n;i++){
    if(inTab[i]&&!inTab[(i-1+n)%n])start=i;
    if(inTab[i]&&!inTab[(i+1)%n])end=i;
  }
  if(start<0||end<0)return loopClosed; // 바닥 돌출부를 못 찾으면 원본 그대로 (내부 구멍 루프가 여기로 옴)
  let bottomY=-1e9;
  for(let i=start;;i=(i+1)%n){bottomY=Math.max(bottomY,loop[i][1]);if(i===end)break;}
  const before=loop[(start-1+n)%n],after=loop[(end+1)%n];
  const fromRight=Math.abs(before[0]-xR)<Math.abs(before[0]-xL); // 진행 방향 감지 (spliceSharpTab과 동일 이유)
  const x1=fromRight?xR:xL, x2=fromRight?xL:xR;
  const Rr=Math.max(R,rolyRmin(xL,xR,arcCx),1);
  const cy=bottomY-Rr;
  const r=Math.min(rolyFilletR(xL,xR,arcCx,cornerR),Rr*0.4);
  const arcPts=(px_,py_,rad,a0,a1)=>{ // 표준 각도(0=+x, y는 화면 아래) 기준 원호 샘플
    const N=Math.max(4,Math.min(96,Math.round(Math.abs(a1-a0)*180/Math.PI*1.5)));
    const o=[];
    for(let k=0;k<=N;k++){const a=a0+(a1-a0)*k/N;o.push([px_+rad*Math.cos(a),py_+rad*Math.sin(a)]);}
    return o;
  };
  // 측벽(수직)과 큰 원호에 동시에 접하는 작은 원 → 코너가 각지지 않게. sgn은 도형 내부 방향.
  const side=(xw,sgn)=>{
    const fcx=xw+sgn*r, rad=Rr-r, dx=fcx-arcCx, s2=rad*rad-dx*dx;
    if(r<=0.5||s2<=0){
      const yy=cy+Math.sqrt(Math.max(0,Rr*Rr-(xw-arcCx)*(xw-arcCx)));
      return {wall:[xw,yy],fil:[],aBig:Math.atan2(yy-cy,xw-arcCx)};
    }
    const fcy=cy+Math.sqrt(s2);
    const L=Math.hypot(dx,fcy-cy);
    const aBig=Math.atan2((fcy-cy)/L,dx/L);              // 두 원의 중심을 잇는 방향 = 접점 방향
    return {wall:[xw,fcy],fil:arcPts(fcx,fcy,r,Math.atan2(0,xw-fcx),aBig),aBig};
  };
  const sL=side(xL,1), sR=side(xR,-1);
  let path=sL.fil.length?sL.fil.slice():[sL.wall];
  // 최저점(각도 π/2)을 기준으로 두 구간으로 나눠 샘플 — 접지점이 정확히 arcCx 아래에 놓이게
  const aBot=Math.PI/2;
  if((sL.aBig-aBot)*(sR.aBig-aBot)<0){
    path=path.concat(arcPts(arcCx,cy,Rr,sL.aBig,aBot).slice(1));
    path=path.concat(arcPts(arcCx,cy,Rr,aBot,sR.aBig).slice(1));
  }else path=path.concat(arcPts(arcCx,cy,Rr,sL.aBig,sR.aBig).slice(1));
  const rf=sR.fil.slice().reverse();
  path=path.concat(rf.length?rf.slice(1):[sR.wall]);
  if(fromRight)path.reverse();
  const repl=[[x1,before[1]]].concat(path,[[x2,after[1]]]);
  const out=[];
  let i=(end+1)%n;
  while(i!==start){out.push(loop[i]);i=(i+1)%n;}
  const finalLoop=out.concat(repl);
  finalLoop.push(finalLoop[0]);
  return finalLoop;
}
function rolyMarginTarget(){ // 흔들림 세기 1~10 → 안정 여유 45%~12% (여유가 작을수록 크고 느리게 흔들림)
  const sway=Math.max(1,Math.min(10,+$('rolySway').value||5));
  return 0.45-(sway-1)*(0.33/9);
}
function planRoly(ls,k,off){ // 한 인원의 루프들 → 바닥 원호 반지름·무게중심 확정
  const xL=k.kf.minX-off, xR=k.kf.maxX+off;
  let bottomY=-1e9;
  for(const l of ls)for(const p of l)if(p[1]>bottomY)bottomY=p[1];
  // 원호가 파고들 수 있는 세로 여유 = 평탄 밴드 + 여백. 이 위쪽은 캐릭터 실루엣이라 건드리면 안 됨.
  const wallRoom=Math.max(px(1),bottomY-k.kf.yFlat);
  const sagMax=wallRoom*0.72;
  // 갈아끼우는 구간은 원호가 실제로 파고드는 깊이보다 높아야 한다.
  // 낮으면 측벽이 구간 위로 삐져나가 경로가 되돌아 접힌다(자기교차).
  const threshFor=d=>bottomY-Math.min(wallRoom*0.92,d+Math.max(px(1.2),wallRoom*0.08));
  let yThresh=threshFor(wallRoom*0.45);
  const flat=ls.map(l=>spliceSharpTab(l,xL,xR,yThresh,0));
  let cen=loopsCentroid(flat);
  if(!cen)return null;
  const manual=$('rolyManual').checked;
  const mT=rolyMarginTarget();
  const inset=(xR-xL)*0.15;
  const bandH=Math.max(1,k.comp.maxY-k.kf.yFlat);
  const cornerR=px(+$('korottoRad').value||0);
  let R=0,arcCx=cen.cx,cur=flat,rFloor=0,byWidth=false,fil=0;
  // 바닥을 원호로 깎으면 하단 모서리 살이 사라져 무게중심이 올라간다 → 3회 수렴 (실측 2회에 안정)
  for(let it=0;it<3;it++){
    const h=bottomY-cen.cy;
    arcCx=Math.max(xL+inset,Math.min(xR-inset,cen.cx));
    fil=rolyFilletR(xL,xR,arcCx,cornerR,sagMax);
    const rStable=h/Math.max(0.05,1-mT);             // 자동 복원 조건에서 나온 하한
    const rDepth=rolyRfloor(xL,xR,arcCx,sagMax,fil); // 바닥 폭을 얕게 덮기 위한 하한
    const rHard=rolyRfloor(xL,xR,arcCx,wallRoom*0.9,fil); // 기하 한계 — 더 작으면 바닥이 통째로 깎임
    rFloor=Math.max(rStable,rDepth);
    byWidth=rDepth>rStable;                          // 바닥이 넓어 흔들림 세기보다 폭이 반지름을 지배
    R=manual?Math.max(px(+$('rolyR').value||52),rolyRmin(xL,xR,arcCx),rHard):rFloor;
    yThresh=threshFor(rolyDepth(xL,xR,arcCx,R,fil));
    cur=ls.map(l=>spliceArcBottom(l,xL,xR,yThresh,R,arcCx,fil)); // 이미 제한된 값을 그대로 전달
    const c2=loopsCentroid(cur);
    if(!c2)break;
    cen=c2;
  }
  fil=Math.min(fil,R*0.4);
  const h=bottomY-cen.cy;
  const margin=(R-h)/R;                                   // 자동 복원 조건: 무게중심이 원호 중심보다 낮아야 (h<R)
  const tilt=rolyTiltDeg(xL,xR,arcCx,R,fil);
  const sag=rolyDepth(xL,xR,arcCx,R,fil);                 // 측벽에서 바닥이 파이는 깊이
  return {loops:cur,R,h,margin,tilt,sag,fil,bandH,sagMax,wallRoom,yThresh,rFloor,byWidth,arcCx,bottomY,xL,xR,cx:cen.cx,cy:cen.cy,
    lean:Math.abs(cen.cx-arcCx),
    ok:margin>0.02, sagOK:sag<=sagMax*1.05, tiltOK:tilt>=8};
}
