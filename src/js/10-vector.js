// ===== Schneider 곡선 피팅 (Graphics Gems FitCurves) — 진짜 앵커 최소화 =====
const V={sub:(a,b)=>[a[0]-b[0],a[1]-b[1]],add:(a,b)=>[a[0]+b[0],a[1]+b[1]],scale:(a,k)=>[a[0]*k,a[1]*k],
  dot:(a,b)=>a[0]*b[0]+a[1]*b[1],len:a=>Math.hypot(a[0],a[1]),
  norm:a=>{const l=Math.hypot(a[0],a[1])||1e-9;return [a[0]/l,a[1]/l];}};
function bezierPoint(b,t){ // b=[p0,c1,c2,p3]
  const u=1-t;
  return [u*u*u*b[0][0]+3*u*u*t*b[1][0]+3*u*t*t*b[2][0]+t*t*t*b[3][0],
          u*u*u*b[0][1]+3*u*u*t*b[1][1]+3*u*t*t*b[2][1]+t*t*t*b[3][1]];
}
function chordParams(pts,first,last){
  const u=[0];
  for(let i=first+1;i<=last;i++)u.push(u[u.length-1]+V.len(V.sub(pts[i],pts[i-1])));
  const total=u[u.length-1]||1e-9;
  return u.map(v=>v/total);
}
function generateBezier(pts,first,last,uPrime,tHat1,tHat2){
  const n=last-first+1;
  const A=[];
  for(let i=0;i<n;i++){
    const u=uPrime[i],b1=3*u*(1-u)*(1-u),b2=3*u*u*(1-u);
    A.push([V.scale(tHat1,b1),V.scale(tHat2,b2)]);
  }
  let C00=0,C01=0,C11=0,X0=0,X1=0;
  const p0=pts[first],p3=pts[last];
  for(let i=0;i<n;i++){
    C00+=V.dot(A[i][0],A[i][0]);C01+=V.dot(A[i][0],A[i][1]);C11+=V.dot(A[i][1],A[i][1]);
    const u=uPrime[i],u1=1-u;
    const base=[p0[0]*(u1*u1*u1+3*u*u1*u1)+p3[0]*(3*u*u*u1+u*u*u),
                p0[1]*(u1*u1*u1+3*u*u1*u1)+p3[1]*(3*u*u*u1+u*u*u)];
    const tmp=V.sub(pts[first+i],base);
    X0+=V.dot(A[i][0],tmp);X1+=V.dot(A[i][1],tmp);
  }
  const detC0C1=C00*C11-C01*C01;
  const detC0X=C00*X1-C01*X0, detXC1=X0*C11-X1*C01;
  let a1=detC0C1===0?0:detXC1/detC0C1, a2=detC0C1===0?0:detC0X/detC0C1;
  const segLen=V.len(V.sub(p3,p0)),eps=1e-6*segLen;
  if(!isFinite(a1)||!isFinite(a2)||a1<eps||a2<eps){a1=a2=segLen/3;} // 퇴화 시 휴리스틱
  const maxA=segLen*1.2; // 노이즈 구간에서 최소제곱 알파 폭주 방지 — 핸들이 구간을 넘어 꼬이는 것 차단
  if(a1>maxA)a1=maxA;
  if(a2>maxA)a2=maxA;
  return [p0,V.add(p0,V.scale(tHat1,a1)),V.add(p3,V.scale(tHat2,a2)),p3];
}
function maxErrorOf(pts,first,last,bez,u){
  let maxD=0,split=Math.floor((last-first+1)/2)+first;
  for(let i=first+1;i<last;i++){
    const p=bezierPoint(bez,u[i-first]);
    const d=(p[0]-pts[i][0])**2+(p[1]-pts[i][1])**2;
    if(d>maxD){maxD=d;split=i;}
  }
  return {err:Math.sqrt(maxD),split};
}
function reparam(pts,first,last,u,bez){ // Newton-Raphson 1스텝
  const out=[];
  for(let i=first;i<=last;i++){
    const t=u[i-first],p=pts[i];
    const q=bezierPoint(bez,t);
    const d1=[3*((bez[1][0]-bez[0][0])*(1-t)*(1-t)+2*(bez[2][0]-bez[1][0])*(1-t)*t+(bez[3][0]-bez[2][0])*t*t),
              3*((bez[1][1]-bez[0][1])*(1-t)*(1-t)+2*(bez[2][1]-bez[1][1])*(1-t)*t+(bez[3][1]-bez[2][1])*t*t)];
    const num=(q[0]-p[0])*d1[0]+(q[1]-p[1])*d1[1];
    const den=d1[0]*d1[0]+d1[1]*d1[1];
    out.push(den===0?t:Math.max(0,Math.min(1,t-num/den)));
  }
  return out;
}
function fitCubicRec(pts,first,last,tHat1,tHat2,tol,out,depth){
  if(last-first===1){ // 점 2개 → 직선
    const p0=pts[first],p3=pts[last],d=V.len(V.sub(p3,p0))/3;
    const t=V.norm(V.sub(p3,p0));
    out.push([p0,V.add(p0,V.scale(t,d)),V.sub(p3,V.scale(t,d)),p3]);return;
  }
  let u=chordParams(pts,first,last);
  let bez=generateBezier(pts,first,last,u,tHat1,tHat2);
  let {err,split}=maxErrorOf(pts,first,last,bez,u);
  if(err<tol){out.push(bez);return;}
  if(err<tol*4&&depth<4){ // 재매개화 시도
    for(let k=0;k<4;k++){
      u=reparam(pts,first,last,u,bez);
      bez=generateBezier(pts,first,last,u,tHat1,tHat2);
      const r=maxErrorOf(pts,first,last,bez,u);err=r.err;split=r.split;
      if(err<tol){out.push(bez);return;}
    }
  }
  if(depth>28){out.push(bez);return;} // 안전장치
  const tC=V.norm(V.sub(pts[split-1],pts[split+1])); // 분할점 중심 접선
  fitCubicRec(pts,first,split,tHat1,tC,tol,out,depth+1);
  fitCubicRec(pts,split,last,V.scale(tC,-1),tHat2,tol,out,depth+1);
}
function fitChain(pts,tol,t1,t2){ // 열린 사슬 피팅 → 세그먼트 목록
  const out=[];
  const tHat1=t1||V.norm(V.sub(pts[1],pts[0]));
  const tHat2=t2||V.norm(V.sub(pts[pts.length-2],pts[pts.length-1]));
  fitCubicRec(pts,0,pts.length-1,tHat1,tHat2,tol,out,0);
  return out;
}
function toBezierKnots(rawPts,denseRef){ // 코너 감지 → 사슬별 Schneider 피팅 → knot (진짜 최소 앵커, denseRef=충실도 기준 촘촘 루프)
  const n=rawPts.length;
  if(n<3)return rawPts.map(q=>({linked:false,points:[q[0],q[1],q[0],q[1],q[0],q[1]]}));
  let smLv=3;try{smLv=+$('smooth').value||0;}catch(e){}
  // 화면=파일 보증: 둥글리기 낮음(디테일 모드)에선 오차를 절반으로 조여 화면 그대로 저장
  // 허용오차는 mm 기준 고정 — 굿즈가 커져도(=dpi가 낮아도) 실물 이탈이 일정하게 유지됨
  const tolMm=S.anchorMin?0.21:(smLv<=2?0.038:0.064); // 300dpi 기준 2.5 / 0.45 / 0.75px 과 동등
  const tol=Math.max(0.35,px(tolMm)); // 하한 0.35px — 초고해상도에서 과도한 앵커 폭증 방지
  // 코너 감지 (45°+) — ±2.5px 아크 창의 접선으로 판단 (여백 0의 미세 지그재그 각도 노이즈 무시)
  const arcPt=(idx,dir)=>{ // idx에서 dir 방향으로 아크 길이 2.5px 지점
    let acc=0,i2=idx;
    for(let g=0;g<n;g++){
      const nx=(i2+dir+n)%n;
      acc+=Math.hypot(rawPts[nx][0]-rawPts[i2][0],rawPts[nx][1]-rawPts[i2][1]);
      i2=nx;
      if(acc>=2.5||i2===idx)break;
    }
    return rawPts[i2];
  };
  const corners=[];
  for(let i=0;i<n;i++){
    const pb=arcPt(i,-1),p1=rawPts[i],pf=arcPt(i,1);
    const a1=Math.atan2(p1[1]-pb[1],p1[0]-pb[0]),a2=Math.atan2(pf[1]-p1[1],pf[0]-p1[0]);
    let da=Math.abs(a2-a1);if(da>Math.PI)da=2*Math.PI-da;
    if(da>Math.PI/4)corners.push(i);
  }
  // 인접 코너 군집은 각도 최대점 하나만 — 군집 기준은 아크 거리(px). 진짜 코너들(멀리 떨어짐)은 각자 유지
  if(corners.length>1){
    const cum=new Float64Array(n+1); // 누적 아크 길이
    for(let i2=0;i2<n;i2++){
      const a2=rawPts[i2],b2=rawPts[(i2+1)%n];
      cum[i2+1]=cum[i2]+Math.hypot(b2[0]-a2[0],b2[1]-a2[1]);
    }
    const total=cum[n];
    const turnAt=i2=>{
      const pb=arcPt(i2,-1),p1=rawPts[i2],pf=arcPt(i2,1);
      const a1=Math.atan2(p1[1]-pb[1],p1[0]-pb[0]),a2=Math.atan2(pf[1]-p1[1],pf[0]-p1[0]);
      let da=Math.abs(a2-a1);if(da>Math.PI)da=2*Math.PI-da;return da;
    };
    const keep=[];
    let run=[corners[0]];
    for(let c=1;c<=corners.length;c++){
      const cur=corners[c%corners.length];
      const prev=run[run.length-1];
      const gapPx=c<corners.length?(cum[cur]-cum[prev]+total)%total:1e9;
      if(gapPx<=3)run.push(cur);
      else{
        let best=run[0],bv=-1;
        for(const r2 of run){const v=turnAt(r2);if(v>bv){bv=v;best=r2;}}
        keep.push(best);
        run=[cur];
      }
    }
    // 첫 군집과 마지막 군집이 랩어라운드로 붙어있으면 병합
    if(keep.length>1){
      const gapWrap=(cum[keep[0]]-cum[keep[keep.length-1]]+total)%total;
      if(gapWrap<=3){
        const a3=keep[0],b3=keep.pop();
        keep[0]=turnAt(a3)>=turnAt(b3)?a3:b3;
      }
    }
    corners.length=0;corners.push(...[...new Set(keep)].sort((a2,b2)=>a2-b2));
  }
  // 분할점: 코너들, 없으면 인위적 2분할 (부드러운 이음)
  let cuts=corners.length?corners:[0,Math.floor(n/2)];
  if(cuts.length===1)cuts=[cuts[0],(cuts[0]+Math.floor(n/2))%n];
  cuts=[...new Set(cuts)].sort((a,b)=>a-b);
  const isCorner=new Set(corners);
  const segsAll=[]; // {bez, startIdx(원점 인덱스)}
  for(let c=0;c<cuts.length;c++){
    const a=cuts[c],b=cuts[(c+1)%cuts.length];
    const chain=[];
    let i=a;
    while(true){chain.push(rawPts[i]);if(i===b)break;i=(i+1)%n;}
    if(chain.length<2)continue;
    // 직선 사슬(판·촉·슬롯의 곧은 변): 곡선 피팅 대신 직선 세그먼트 — 2점 사슬에서 접선 추정이 뒤틀려 핸들이 튀는 것을 막는다
    {const p0=chain[0],p3=chain[chain.length-1];const L=Math.hypot(p3[0]-p0[0],p3[1]-p0[1]);
      let straight=L>0;
      if(straight&&chain.length>2){const nx=(p3[1]-p0[1])/L,ny=-(p3[0]-p0[0])/L;for(let q=1;q<chain.length-1;q++){if(Math.abs((chain[q][0]-p0[0])*nx+(chain[q][1]-p0[1])*ny)>tol){straight=false;break;}}}
      const lin=(a0,a3)=>[a0,[a0[0]+(a3[0]-a0[0])/3,a0[1]+(a3[1]-a0[1])/3],[a0[0]+(a3[0]-a0[0])*2/3,a0[1]+(a3[1]-a0[1])*2/3],a3];
      if(straight){segsAll.push(lin(p0,p3));continue;}
      // 다각형 사슬(판·촉·슬롯: 곧은 변이 RDP 로 2점으로 줄고 꼭짓점마다 크게 꺾임): 곡선 피팅의 접선 추정이 뒤틀리므로 변마다 직선으로.
      // 원·곡선(꼭짓점마다 조금씩 고르게 꺾임)은 그대로 곡선 피팅 — 판정: 점이 성기고(평균 6px+) 안쪽 꼭짓점 전부가 '거의 직진(<4°)' 또는 '진짜 꺾임(>=25°)'
      let arc=0;for(let q=1;q<chain.length;q++)arc+=Math.hypot(chain[q][0]-chain[q-1][0],chain[q][1]-chain[q-1][1]);
      if(arc/(chain.length-1)>6){
        let poly=true;
        for(let q=1;q<chain.length-1&&poly;q++){const a=chain[q-1],b=chain[q],c2=chain[q+1];
          const a1=Math.atan2(b[1]-a[1],b[0]-a[0]),a2=Math.atan2(c2[1]-b[1],c2[0]-b[0]);let da=Math.abs(a2-a1);if(da>Math.PI)da=2*Math.PI-da;
          if(da>=4*Math.PI/180&&da<25*Math.PI/180)poly=false;}
        if(poly){for(let q=1;q<chain.length;q++)segsAll.push(lin(chain[q-1],chain[q]));continue;}}}
    // 이음 접선: 코너면 사슬 방향, 부드러우면 이웃 중앙차분
    const tanAt=(idx,into)=>{ // into=true: 사슬로 들어가는 방향
      if(isCorner.has(idx))return null; // fitChain 기본(사슬 끝 방향) 사용
      const pPrev=rawPts[(idx-1+n)%n],pNext=rawPts[(idx+1)%n];
      const t=V.norm(V.sub(pNext,pPrev));
      return into?t:V.scale(t,-1);
    };
    const segs=fitChain(chain,tol,tanAt(a,true),tanAt(b,false));
    for(const sg of segs)segsAll.push(sg);
  }
  // 세그먼트 → knot (이음 앵커에 in/out 결합)
  const m=segsAll.length,knots=[];
  if(!m)return rawPts.map(q=>({linked:false,points:[q[0],q[1],q[0],q[1],q[0],q[1]]}));
  for(let i=0;i<m;i++){
    const prev=segsAll[(i-1+m)%m],cur=segsAll[i];
    const anchor=cur[0];
    const inn=prev[2],out2=cur[1];
    // linked: in-out이 앵커 기준 반대 방향으로 정렬돼 있으면 부드러움
    const v1=V.norm(V.sub(anchor,inn)),v2=V.norm(V.sub(out2,anchor));
    const linked=V.dot(v1,v2)>0.7;
    knots.push({linked,points:[inn[0],inn[1],anchor[0],anchor[1],out2[0],out2[1]]});
  }
  return fixCurls(knots,denseRef);
}
function segmentSamples(a,b,N){ // 큐빅 세그먼트 샘플
  const P=a.points,Q=b.points,out=[];
  for(let k=0;k<=N;k++){
    const t=k/N,u=1-t;
    out.push([u*u*u*P[2]+3*u*u*t*P[4]+3*u*t*t*Q[0]+t*t*t*Q[2],
              u*u*u*P[3]+3*u*u*t*P[5]+3*u*t*t*Q[1]+t*t*t*Q[3]]);
  }
  return out;
}
function segmentHasLoop(a,b){ // 세그먼트 내부 자기교차(컬) 검사
  const pts=segmentSamples(a,b,14);
  const inter=(p,p2,q,q2)=>{
    const d1x=p2[0]-p[0],d1y=p2[1]-p[1],d2x=q2[0]-q[0],d2y=q2[1]-q[1];
    const den=d1x*d2y-d1y*d2x;if(Math.abs(den)<1e-12)return false;
    const t=((q[0]-p[0])*d2y-(q[1]-p[1])*d2x)/den;
    const u=((q[0]-p[0])*d1y-(q[1]-p[1])*d1x)/den;
    return t>0.001&&t<0.999&&u>0.001&&u<0.999;
  };
  for(let i=0;i<pts.length-1;i++)for(let j2=i+2;j2<pts.length-1;j2++)
    if(inter(pts[i],pts[i+1],pts[j2],pts[j2+1]))return true;
  return false;
}
function fixCurls(knots,denseRef){ // 피팅 결과에서 고리(컬)·오버슈트 제거 — 핸들 감쇠 → 코너/직선 강등
  const m=knots.length;
  // 1) 이음 급반전: in/out 핸들이 90°+ 꺾이면 코너로 강등 (컬의 씨앗)
  for(let i=0;i<m;i++){
    const P=knots[i].points;
    const vinx=P[2]-P[0],viny=P[3]-P[1],voutx=P[4]-P[2],vouty=P[5]-P[3];
    const li=Math.hypot(vinx,viny),lo=Math.hypot(voutx,vouty);
    if(li<0.3&&lo<0.3)continue;
    const dot=(vinx*voutx+viny*vouty)/((li||1e-9)*(lo||1e-9));
    if(dot<0.1){knots[i]={linked:false,points:[P[2],P[3],P[2],P[3],P[2],P[3]]};}
  }
  // 1.5) cusp 후보 정밀 검사: in/out 핸들이 어중간히 꺾인 앵커 주변의 초미세 고리 → 코너 강등
  //     (일반 검사 샘플 사이·앵커 초근접에 숨는 미세 꼬임 저격 — 최소화 모드의 성긴 앵커에서 발생)
  {
    const interX=(p,p2,q,q2)=>{
      const d1x=p2[0]-p[0],d1y=p2[1]-p[1],d2x=q2[0]-q[0],d2y=q2[1]-q[1];
      const den=d1x*d2y-d1y*d2x;if(Math.abs(den)<1e-12)return false;
      const t=((q[0]-p[0])*d2y-(q[1]-p[1])*d2x)/den;
      const u=((q[0]-p[0])*d1y-(q[1]-p[1])*d1x)/den;
      return t>0.0001&&t<0.9999&&u>0.0001&&u<0.9999;
    };
    for(let i=0;i<m;i++){
      const P=knots[i].points;
      const vinx=P[2]-P[0],viny=P[3]-P[1],voutx=P[4]-P[2],vouty=P[5]-P[3];
      const l1=Math.hypot(vinx,viny),l2=Math.hypot(voutx,vouty);
      if(l1<0.3||l2<0.3)continue;
      const dot=(vinx*voutx+viny*vouty)/(l1*l2);
      if(dot>=0.55)continue;
      const s1=segmentSamples(knots[(i-1+m)%m],knots[i],32);
      const s2=segmentSamples(knots[i],knots[(i+1)%m],32);
      let cross=false;
      for(let x=0;x<s1.length-1&&!cross;x++)for(let y2=0;y2<s2.length-1;y2++){
        if(x===s1.length-2&&y2===0)continue; // 공유 앵커에 직접 닿는 쌍만 제외
        if(interX(s1[x],s1[x+1],s2[y2],s2[y2+1])){cross=true;break;}
      }
      if(cross)knots[i]={linked:false,points:[P[2],P[3],P[2],P[3],P[2],P[3]]};
    }
  }
  // 0) 충실도(튜브) 검사: 곡선이 원본 폴리라인에서 멀리 이탈(오버슈트)하면 교정
  //    — 오차 검사는 데이터 점 위치에서만 이뤄져, 앵커가 성긴 구간의 '사이'에서 곡선이 크게 벗어날 수 있음
  const damp=(a,b,f)=>{const P=a.points,Q=b.points;
    P[4]=P[2]+(P[4]-P[2])*f;P[5]=P[3]+(P[5]-P[3])*f;
    Q[0]=Q[2]+(Q[0]-Q[2])*f;Q[1]=Q[3]+(Q[1]-Q[3])*f;};
  const straighten=(a,b)=>{const P=a.points,Q=b.points;
    P[4]=P[2]+(Q[2]-P[2])/3;P[5]=P[3]+(Q[3]-P[3])/3;
    Q[0]=Q[2]-(Q[2]-P[2])/3;Q[1]=Q[3]-(Q[3]-P[3])/3;
    a.linked=false;b.linked=false;};
  if(denseRef&&denseRef.length>8){
    const cell=6,grid=new Map();
    const dpts=(denseRef.length>2&&denseRef[0][0]===denseRef[denseRef.length-1][0]&&denseRef[0][1]===denseRef[denseRef.length-1][1])?denseRef.slice(0,-1):denseRef;
    const N2=dpts.length;
    dpts.forEach((q,qi)=>{
      const k=Math.floor(q[0]/cell)+'_'+Math.floor(q[1]/cell);
      if(!grid.has(k))grid.set(k,[]);
      grid.get(k).push({x:q[0],y:q[1],i:qi});
    });
    const segDist=(x,y,i0)=>{ // 점 → dpts[i0]~dpts[i0+1] 선분 거리
      const a2=dpts[i0],b2=dpts[(i0+1)%N2];
      const dx=b2[0]-a2[0],dy=b2[1]-a2[1],L2=dx*dx+dy*dy||1e-9;
      let tt=((x-a2[0])*dx+(y-a2[1])*dy)/L2;tt=Math.max(0,Math.min(1,tt));
      return Math.hypot(x-(a2[0]+dx*tt),y-(a2[1]+dy*tt));
    };
    const distToRef=(x,y)=>{ // 최근접 점의 앞뒤 '선분'까지 거리. 창을 점증 확장 — 큰 이탈에도 참조점 확보 (교정 사다리의 전제)
      let md=1e18,ref=null;
      const cx=Math.floor(x/cell),cy=Math.floor(y/cell);
      for(let rad=1;rad<=10&&!ref;rad++){
        for(let dx2=-rad;dx2<=rad;dx2++)for(let dy2=-rad;dy2<=rad;dy2++){
          if(Math.max(Math.abs(dx2),Math.abs(dy2))!==rad&&rad>1)continue; // 바깥 링만 추가 검사
          const arr=grid.get((cx+dx2)+'_'+(cy+dy2));
          if(!arr)continue;
          for(const q of arr){const d=(x-q.x)**2+(y-q.y)**2;if(d<md){md=d;ref=q;}}
        }
        if(ref&&rad>=2)break; // 찾은 뒤 한 링 더 보고 종료 (경계 오차 방지)
      }
      if(!ref)return {d:99,ref:null};
      const d=Math.min(segDist(x,y,ref.i),segDist(x,y,(ref.i-1+N2)%N2));
      return {d,ref};
    };
    const refTan=i0=>{ // 원본 루프의 국소 접선
      const a2=dpts[(i0-2+N2)%N2],b2=dpts[(i0+2)%N2];
      const l2=Math.hypot(b2[0]-a2[0],b2[1]-a2[1])||1e-9;
      return [(b2[0]-a2[0])/l2,(b2[1]-a2[1])/l2];
    };
    let smLv2=3;try{smLv2=+$('smooth').value||0;}catch(e){}
    const tubeBase=Math.max(1.1,(S.anchorMin?2.5:(smLv2<=2?0.45:0.75))*2.5); // 허용 관 반경 — 디테일 모드(둥글리기≤2)에선 더 좁게
    const zones=(typeof S!=='undefined'&&S._fitProtect)?S._fitProtect:[]; // 부속(귀·타공) 주변은 최소화 중에도 좁은 관 — 고리 벽이 찌그러지지 않게
    let i=0,guard=0;
    // 가드 상한을 '진입 시점'에 고정 — 루프 안 splice로 knots가 커지면 상한도 같이 커져 종료가 안 되던 문제
    const guardMax=knots.length*3+60, maxKnots=knots.length*3+120;
    while(i<knots.length&&guard++<guardMax&&knots.length<maxKnots){
      const a=knots[i],b=knots[(i+1)%knots.length];
      const smp=segmentSamples(a,b,10);
      let worst=0,wref=null;
      for(const q of smp){const r2=distToRef(q[0],q[1]);if(r2.d>worst){worst=r2.d;wref=r2.ref;}}
      let tube=tubeBase;
      if(zones.length){
        const mx=(a.points[2]+b.points[2])/2,my=(a.points[3]+b.points[3])/2;
        for(const z of zones){
          if(Math.hypot(mx-z.x,my-z.y)<=z.r+8){tube=Math.min(tube,1.8);break;}
        }
      }
      if(worst<=tube){i++;continue;}
      if((a._split||0)<3&&wref){ // ① 부드러운 교정: 최악 지점의 원본 점에 앵커 삽입 (접선 유지 → 곡률 보존, 세그당 3회까지)
        const t2=refTan(wref.i);
        const P=a.points,Q=b.points;
        const cl=Math.hypot(wref.x-P[2],wref.y-P[3]),cr=Math.hypot(Q[2]-wref.x,Q[3]-wref.y);
        const h=Math.max(1,Math.min(cl,cr)/3);
        P[4]=P[2]+(P[4]-P[2])*0.6;P[5]=P[3]+(P[5]-P[3])*0.6; // 과팽창 핸들 완화
        Q[0]=Q[2]+(Q[0]-Q[2])*0.6;Q[1]=Q[3]+(Q[1]-Q[3])*0.6;
        a._split=(a._split||0)+1;
        knots.splice(i+1,0,{linked:true,points:[wref.x-t2[0]*h,wref.y-t2[1]*h,wref.x,wref.y,wref.x+t2[0]*h,wref.y+t2[1]*h]});
        continue; // 같은 i(앞 절반) 재검사
      }
      if(!a._d1){damp(a,b,0.5);a._d1=true;continue;} // ② 감쇠
      if(!a._d2){damp(a,b,0.5);a._d2=true;continue;}
      straighten(a,b);i++; // ③ 최후: 직선
    }
  }
  for(let i=0;i<m;i++){
    const a=knots[i],b=knots[(i+1)%m];
    for(let at=0;at<3&&segmentHasLoop(a,b);at++){
      if(at<2)damp(a,b,0.5);else straighten(a,b);
    }
  }
  // 3) 세그먼트 간 교차(컬이 이웃 곡선을 넘어감): 관련 양쪽 감쇠 → 직선화
  const inter2=(p,p2,q,q2)=>{
    const d1x=p2[0]-p[0],d1y=p2[1]-p[1],d2x=q2[0]-q[0],d2y=q2[1]-q[1];
    const den=d1x*d2y-d1y*d2x;if(Math.abs(den)<1e-12)return false;
    const t=((q[0]-p[0])*d2y-(q[1]-p[1])*d2x)/den;
    const u=((q[0]-p[0])*d1y-(q[1]-p[1])*d1x)/den;
    return t>0.02&&t<0.98&&u>0.02&&u<0.98;
  };
  for(let round=0;round<3;round++){
    const boxes=[];
    for(let i=0;i<m;i++){
      const smp=segmentSamples(knots[i],knots[(i+1)%m],10);
      let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
      for(const q of smp){if(q[0]<x0)x0=q[0];if(q[0]>x1)x1=q[0];if(q[1]<y0)y0=q[1];if(q[1]>y1)y1=q[1];}
      boxes.push({smp,x0,y0,x1,y1});
    }
    let found=false;
    for(let a2=0;a2<m;a2++)for(let b2=a2+1;b2<m;b2++){
      const adjF=(b2===a2+1),adjW=(a2===0&&b2===m-1); // 이웃 쌍: 공유 앵커 부근 샘플만 제외하고 검사 (좁은 홈의 꼬집힘 컬 감지)
      const A=boxes[a2],B=boxes[b2];
      if(A.x1<B.x0||B.x1<A.x0||A.y1<B.y0||B.y1<A.y0)continue;
      let cross=false;
      const nA=A.smp.length-1,nB=B.smp.length-1;
      for(let i2=0;i2<nA&&!cross;i2++){
        for(let j2=0;j2<nB;j2++){
          // 이웃 쌍은 공유 앵커에 '직접 닿는' 미니세그 쌍만 제외 — 앵커 바로 옆 꼬집힘 컬도 잡음
          if(adjF&&i2===nA-1&&j2===0)continue;
          if(adjW&&i2===0&&j2===nB-1)continue;
          if(inter2(A.smp[i2],A.smp[i2+1],B.smp[j2],B.smp[j2+1])){cross=true;break;}
        }
      }
      if(cross){
        found=true;
        if(round<2){damp(knots[a2],knots[(a2+1)%m],0.4);damp(knots[b2],knots[(b2+1)%m],0.4);}
        else{straighten(knots[a2],knots[(a2+1)%m]);straighten(knots[b2],knots[(b2+1)%m]);}
      }
    }
    if(!found)break;
  }
  return knots;
}
function loopToBezierPath(l){ // 곡선 knot들로 구성된 PSD 패스
  return {open:false,operation:'combine',fillRule:'even-odd',knots:toBezierKnots(loopForPath(l),l)};
}
function circleToBezierPath(cx,cy,r){ // 4-knot 큐빅 베지어 원
  const c=r*0.5522847498;
  const k=(ax,ay,ix,iy,ox,oy)=>({linked:true,points:[ix,iy,ax,ay,ox,oy]});
  return {open:false,operation:'combine',fillRule:'even-odd',knots:[
    k(cx,cy-r, cx-c,cy-r, cx+c,cy-r),
    k(cx+r,cy, cx+r,cy-c, cx+r,cy+c),
    k(cx,cy+r, cx+c,cy+r, cx-c,cy+r),
    k(cx-r,cy, cx-r,cy+c, cx-r,cy-c),
  ]};
}
function offsetMask(m,W,H,dpx){ // 마스크 확장(+)/축소(−)
  if(Math.abs(dpx)<0.5)return m;
  const o=new Uint8Array(W*H);
  if(dpx>0){
    const D=edt2d(m,W,H);
    for(let i=0;i<W*H;i++)o[i]=D[i]<=dpx?1:0;
  }else{
    const inv=new Uint8Array(W*H);
    for(let i=0;i<W*H;i++)inv[i]=m[i]?0:1;
    const D=edt2d(inv,W,H);
    for(let i=0;i<W*H;i++)o[i]=(m[i]&&D[i]>-dpx)?1:0;
  }
  return o;
}
function keepCustomColors(){ // 스티커·시트 대지 = 업로드한 색 그대로 / 아크릴 계열 화이트 = 흰 잉크 의미라 레이어 색으로 통일
  return !!S.customWhite&&(S.type==='sticker'||S.type==='sheet');
}
function isStickerType(){return S.type==='sticker'||S.type==='sheet';}
function fullCutRect(){ // 스티커: 대지 외곽 완칼 (문서 좌표). 아크릴은 없음
  if(!isStickerType()||!docWantsMain())return null;
  return {x:0,y:0,w:S.pW,h:S.pcH};
}
function rectToBezierPath(x,y,w,h){ // 4-knot 직선 사각 (PSD 벡터 패스)
  const k=(ax,ay)=>({linked:true,points:[ax,ay,ax,ay,ax,ay]});
  return {open:false,operation:'combine',fillRule:'even-odd',knots:[k(x,y),k(x+w,y),k(x+w,y+h),k(x,y+h)]};
}
function whiteBaseMask(){ // 화이트/대지의 기준 이진 마스크 (스티커 = 대지 전체 > 커스텀 > 원본 실루엣)
  if(isStickerType()){const m=new Uint8Array(S.pW*S.pcH);m.fill(1);return m;} // 대지 전체가 배경
  const cw=customWhiteAlpha();
  let m;
  if(cw){
    m=new Uint8Array(S.pW*S.pcH);
    for(let i=0;i<m.length;i++)m[i]=cw[i*4+3]>=128?1:0;
  }else{
    const src=S.srcMaskData||S.artMaskData;
    if(!src)return src;
    if(!(S.baseArt&&S.baseArt.slots.length))return src;
    m=new Uint8Array(src.length);m.set(src);
  }
  // 받침 슬롯은 뚫리는 구멍이라 화이트를 깔면 안 된다
  if(S.baseArt&&S.baseArt.slots.length){
    for(const s2 of S.baseArt.slots){
      const x0=Math.round(s2.cx-s2.w/2),x1=Math.round(s2.cx+s2.w/2);
      const y0=Math.round(s2.cy-s2.h/2),y1=Math.round(s2.cy+s2.h/2);
      for(let y=Math.max(0,y0);y<=Math.min(S.pcH-1,y1);y++)
        for(let x=Math.max(0,x0);x<=Math.min(S.pW-1,x1);x++)m[y*S.pW+x]=0;
    }
  }
  return m;
}
function whiteHasGradient(){ // 화이트에 중간 농도(그라데이션)가 있는지 — 있으면 벡터 변환이 손실됨
  if(isStickerType()&&!S.customWhite)return false;
  let data=customWhiteAlpha();
  if(!data&&$('bgmode').value==='alpha'&&S.img){
    const t=document.createElement('canvas');t.width=S.pW;t.height=S.pcH;
    const tctx=t.getContext('2d');tctx.drawImage(S.img,S.xImg,S.yImg,S.W,S.H);
    data=tctx.getImageData(0,0,S.pW,S.pcH).data;
  }
  if(!data)return false;
  let mid=0,on=0;
  for(let i=0;i<S.pW*S.pcH;i++){const a=data[i*4+3];if(a>0){on++;if(a>16&&a<240)mid++;}}
  return on>0&&mid/on>0.05; // 중간 농도 픽셀 5% 초과 → 그라데이션으로 판정 (AA 가장자리는 미달)
}
function whiteSimplifyEffective(){ // '단순'은 큰 굿즈에서 실물 이탈이 커지므로 자동 억제
  if(!$('whiteSimplify')||$('whiteSimplify').value!=='simple')return false;
  const artMm=S.rawBbox?tomm(Math.max(S.rawBbox.maxX-S.rawBbox.minX,S.rawBbox.maxY-S.rawBbox.minY)):0;
  return artMm<=100; // 10cm 이하에서만 단순 (그 이상은 단순 이탈이 0.3mm를 넘음)
}
function baseUpWhiteLoops(){ // 업로드 받침의 화이트 윤곽 (본체와 같은 규칙: 알파 실루엣 + 여백, 슬롯은 구멍)
  const b=S.baseUp;
  if(!b)return [];
  const W=b.W,H=b.H;
  let m=new Uint8Array(W*H);m.set(b.mask);
  const wOff=px(+$('whiteOff').value||0);
  if(Math.abs(wOff)>=0.5)m=offsetMask(m,W,H,wOff);
  for(const s2 of b.slots){ // 슬롯 구멍 — 마스크는 패딩 좌표계라 bp만큼 되돌린다
    const x0=Math.round(s2.cx+b.bp-s2.w/2),x1=Math.round(s2.cx+b.bp+s2.w/2);
    const y0=Math.round(s2.cy-b.y0+b.bp-s2.h/2),y1=Math.round(s2.cy-b.y0+b.bp+s2.h/2);
    for(let y=Math.max(0,y0);y<=Math.min(H-1,y1);y++)
      for(let x=Math.max(0,x0);x<=Math.min(W-1,x1);x++)m[y*W+x]=0;
  }
  const D=edt2d(m,W,H);
  return linkLoops(marchingSquares(D,W,H,0.5))
    .filter(l=>l.length>=4&&perim(l)>=8)
    .map(l=>smoothLoop(chaikin(l,2),2))
    .filter(l=>l.length>=3)
    .map(l=>l.map(p=>[p[0]-b.bp,p[1]-b.bp+b.y0]));
}
function whitePreviewCanvas(){ // 미리보기 = 실제 내보낼 형상. 벡터 형식이면 진짜 베지어 패스를 그려 단순/정밀 차이가 보이게
  const fmt=$('whiteFormat').value;
  if(isStickerType())return whiteLayerCanvas(); // 배경은 인쇄색 그대로 대지 전체
  const vecOK=(fmt==='vector'||fmt==='auto')&&!whiteHasGradient()&&!keepCustomColors();
  if(!vecOK)return whiteLayerCanvas($('whiteCol').value); // 래스터 지정·그라데이션: 렌더 그대로
  const loops=whiteVectorLoops();
  if(!loops.length)return whiteLayerCanvas($('whiteCol').value);
  const dr1=docRect();
  const c=document.createElement('canvas');c.width=dr1.w;c.height=dr1.h;
  const ctx=c.getContext('2d');
  ctx.translate(-dr1.x,-dr1.y);
  ctx.fillStyle=$('whiteCol').value;
  ctx.beginPath();
  withWhiteFit(()=>{
    for(const l of loops){
      const k=toBezierKnots(loopForPath(l),l);
      if(k.length<2)continue;
      const P=q=>q.points,n=k.length;
      ctx.moveTo(P(k[0])[2],P(k[0])[3]);
      for(let i=0;i<n;i++){
        const a=P(k[i]),b=P(k[(i+1)%n]);
        ctx.bezierCurveTo(a[4],a[5],b[0],b[1],b[2],b[3]);
      }
      ctx.closePath();
    }
  });
  ctx.fill('evenodd');
  return c;
}
function withWhiteFit(fn){ // 화이트 벡터 단순화: '단순'이면 앵커 최소화 기준으로 피팅
  const sv=S.anchorMin,sp=S._fitProtect;
  if(whiteSimplifyEffective()){S.anchorMin=true;S._fitProtect=[];}
  try{return fn();}finally{S.anchorMin=sv;S._fitProtect=sp;}
}
function whiteVectorLoops(){ // 화이트/대지 실루엣의 벡터 윤곽 (구멍 포함, even-odd용) — 칼선과 동일한 다듬기 후 반환
  if(isStickerType()){const W=S.pW,H=S.pcH;return [[[0,0],[W,0],[W,H],[0,H]]];} // 배경 = 대지 사각
  let m=whiteBaseMask();
  if(!m)return [];
  const wOff=px(+$('whiteOff').value||0);
  if(Math.abs(wOff)>=0.5)m=offsetMask(m,S.pW,S.pcH,wOff);
  const D=edt2d(m,S.pW,S.pcH);
  let loops=linkLoops(marchingSquares(D,S.pW,S.pcH,0.5));
  loops=loops.filter(l=>l.length>=4&&perim(l)>=8)
    .map(l=>smoothLoop(chaikin(l,2),2)) // 픽셀 계단만 제거(2px 고정). mm로 크게 잡으면 볼록한 디테일이 갉여 그림과 어긋남
    .filter(l=>l.length>=3);
  if(!docWantsMain())loops=[];
  return loops.concat(docWantsBase()?baseUpWhiteLoops():[]);
}
function shiftPath(p,dx,dy){ // PSD 패스를 대지 원점 기준으로 이동
  if(!dx&&!dy)return p;
  return Object.assign({},p,{knots:p.knots.map(k=>Object.assign({},k,{
    points:k.points.map((v,i)=>i%2===0?v-dx:v-dy)}))});
}
function buildCutBezierPaths(){ // 칼선 전체 → PSD 벡터 패스 목록 (도형 오버레이 제외)
  const R=docRect(),paths=[];
  if(docWantsMain())for(const l of S.loops)paths.push(shiftPath(loopToBezierPath(l),R.x,R.y));
  if(docWantsBase())for(const l of S.baseLoops)paths.push(shiftPath(loopToBezierPath(l),R.x,R.y));
  if(hasHole()&&docWantsMain()){const hr=px((+$('hd').value)/2);for(const h of S.holes)paths.push(shiftPath(circleToBezierPath(h.x,h.y,hr),R.x,R.y));}
  const fr=fullCutRect();if(fr)paths.push(shiftPath(rectToBezierPath(fr.x,fr.y,fr.w,fr.h),R.x,R.y)); // 대지 외곽 완칼
  return paths;
}
function knotsToSvgD(knots){ // 베지어 knot → SVG C 경로
  const n=knots.length;if(!n)return '';
  const P=k=>k.points;
  let d=`M${P(knots[0])[2].toFixed(2)},${P(knots[0])[3].toFixed(2)}`;
  for(let i=0;i<n;i++){
    const a=P(knots[i]),b=P(knots[(i+1)%n]);
    d+=` C${a[4].toFixed(2)},${a[5].toFixed(2)} ${b[0].toFixed(2)},${b[1].toFixed(2)} ${b[2].toFixed(2)},${b[3].toFixed(2)}`;
  }
  return d+' Z';
}
function svgPaths(){ // 현재 아이템·대지의 패스 본문 (래퍼 없음) — 합본에서 아이템마다 이어붙임
  const col=$('cutcol').value,w=px(+$('cutw').value).toFixed(2);let p='';
  const poly=l=>knotsToSvgD(toBezierKnots(loopForPath(l),l));
  if(docWantsMain())for(const l of S.loops)p+=`<path d="${poly(l)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linejoin="round"/>\n`;
  if(docWantsBase())for(const l of S.baseLoops)p+=`<path d="${poly(l)}" fill="none" stroke="${col}" stroke-width="${w}"/>\n`;
  if(hasHole()&&docWantsMain())for(const h of S.holes)p+=`<circle cx="${h.x.toFixed(2)}" cy="${h.y.toFixed(2)}" r="${px((+$('hd').value)/2).toFixed(2)}" fill="none" stroke="${col}" stroke-width="${w}"/>\n`;
  const sl=docWantsMain()?shapeLoop():null;
  if(sl)p+=`<path d="${poly(sl)}" fill="none" stroke="${$('shapeCol').value}" stroke-width="${w}"/>\n`;
  const fr=fullCutRect();if(fr)p+=`<rect id="fullcut" x="${fr.x}" y="${fr.y}" width="${fr.w}" height="${fr.h}" fill="none" stroke="${col}" stroke-width="${w}"/><!-- 대지 외곽 완칼 -->\n`;
  if($('whiteLayer').checked&&(isStickerType()||$('whiteFormat').value==='vector')&&!whiteHasGradient()&&!keepCustomColors()){ // 스티커 배경(단색)은 항상 사각 면으로
    const wl3=whiteVectorLoops();
    if(wl3.length){
      let d3='';
      for(const l of wl3){
        const knots=withWhiteFit(()=>toBezierKnots(loopForPath(l),l));
        if(knots.length<2)continue;
        const P=k2=>k2.points,n2=knots.length;
        d3+='M'+P(knots[0])[2].toFixed(2)+' '+P(knots[0])[3].toFixed(2);
        for(let i=0;i<n2;i++){
          const a=P(knots[i]),b=P(knots[(i+1)%n2]);
          d3+='C'+a[4].toFixed(2)+' '+a[5].toFixed(2)+' '+b[0].toFixed(2)+' '+b[1].toFixed(2)+' '+b[2].toFixed(2)+' '+b[3].toFixed(2);
        }
        d3+='Z';
      }
      p+=`<g id="white"><path d="${d3}" fill="${isStickerType()?$('whiteInkCol').value:$('whiteCol').value}" fill-rule="evenodd" opacity="0.9"/><!-- 화이트(백판) — 인쇄소 별색으로 교체 --></g>\n`;
    }
  }
  return p;
}
function buildSvgString(){
  const R=docRect();const col=$('cutcol').value;const p=svgPaths();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${R.w}" height="${R.h}" viewBox="${R.x} ${R.y} ${R.w} ${R.h}">\n<!-- 칼선(cut) stroke=${col} → 인쇄소 별색으로 교체 -->\n${p}</svg>`;
}
$('expSvg').onclick=()=>{
  if(multiBoardMode()){exportSvgBoard();return;}
  const parts=exportParts();
  if(parts.length>1){ // 별도 대지: 본체·받침 각각 파일로
    for(const p2 of parts){
      const s2=withDoc(p2,()=>buildSvgString());
      saveBlob(new Blob([s2],{type:'image/svg+xml'}),'굿즈_칼선_'+p2.name+'.svg');
    }
    return;
  }
  saveBlob(new Blob([buildSvgString()],{type:'image/svg+xml'}),'칼선.svg');};

$('expPsd').onclick=async()=>{
  $('psdWarn').style.display='none';
  let agPsd;try{agPsd=await loadAgPsd();}catch(_){
    showExpWarn('PSD 생성 모듈을 불러오지 못했어요(인터넷 필요). 대신 PNG 묶음 ZIP을 이용해 주세요.');return;}
  if(multiBoardMode()){exportPsdBoard(agPsd);return;} // 여러 아이템 한 대지
  for(const part of exportParts())withDoc(part,()=>{ // 동기 — withDoc은 즉시 복원되므로 await를 안에 두면 안 됨
  const R=docRect();
  const suffix=part.name?'_'+part.name:'';
  const dctx=layerCanvas('design').getContext('2d'),cctx=layerCanvas('cut').getContext('2d');
  const dr=designRect(); // 그림 + 업로드 받침 대지를 합친 영역 (받침 그림이 잘리지 않게)
  const design=dctx.getImageData(dr.x-R.x,dr.y-R.y,dr.w,dr.h); // 대지 안에서 left/top으로 정위치
  const cut=cctx.getImageData(0,0,R.w,R.h);
  if($('psdColorMode').value==='cmyk'){ // CMYK 문서: 자체 라이터 (픽셀 레이어 — 벡터 패스는 SVG 병행)
    const layersC=[{name:'디자인',left:dr.x-R.x,top:dr.y-R.y,imageData:design},{name:'칼선',left:0,top:0,imageData:cut}];
    if($('whiteLayer').checked){
      const wctx2=whiteLayerCanvas().getContext('2d');
      layersC.push({name:'화이트',left:0,top:0,imageData:wctx2.getImageData(0,0,R.w,R.h)});
    }
    const bufC=writeCmykPsd({width:R.w,height:R.h,dpi:+$('dpi').value||300,layers:layersC});
    saveBlob(new Blob([bufC],{type:'image/vnd.adobe.photoshop'}),'굿즈_칼선_CMYK'+suffix+'.psd');
    return;
  }
  const emptyPx={width:1,height:1,data:new Uint8ClampedArray(4)}; // 패스 전용 투명 레이어
  const backingAsArtPsd=keepCustomColors()&&$('whiteLayer').checked;
  const children=[
    {name:'칼선 패스 (벡터)',imageData:emptyPx,vectorMask:{paths:buildCutBezierPaths()}},
    {name:'칼선',imageData:cut}];
  const slp=shapeLoop();
  if(slp&&docWantsMain())children.unshift({name:'도형 패스 (벡터)',imageData:emptyPx,vectorMask:{paths:[shiftPath(loopToBezierPath(slp),R.x,R.y)]}});
  if($('whiteLayer').checked){
    const wctx=whiteLayerCanvas().getContext('2d');
    children.push({name:backingAsArtPsd?'대지 (인쇄물)':'화이트',imageData:wctx.getImageData(0,0,R.w,R.h)});
    const wFmt2=$('whiteFormat').value;
    const wl=(whiteHasGradient()||keepCustomColors()||wFmt2==='raster')?[]:whiteVectorLoops(); // 그라데이션·컬러 커스텀·래스터 지정은 패스 생략
    if(wl.length)children.unshift({name:'화이트 패스 (벡터)',imageData:emptyPx,
      vectorMask:{paths:withWhiteFit(()=>wl.map(l=>shiftPath(loopToBezierPath(l),R.x,R.y)))}}); // 화이트 단순화 설정 반영 피팅
  }
  if(!backingAsArtPsd)children.push({name:'디자인',left:dr.x-R.x,top:dr.y-R.y,imageData:design}); // 그림+받침 대지 영역만 차지
  const psd={width:R.w,height:R.h,children};
  const dpiV=+$('dpi').value||300;
  psd.imageResources={resolutionInfo:{horizontalResolution:dpiV,horizontalResolutionUnit:'PPI',widthUnit:'Millimeters',
    verticalResolution:dpiV,verticalResolutionUnit:'PPI',heightUnit:'Millimeters'}}; // 해상도 유지 — 포토샵에서 실물 mm로 열림
  try{const buf=agPsd.writePsd(psd);saveBlob(new Blob([buf],{type:'image/vnd.adobe.photoshop'}),'굿즈_칼선'+suffix+'.psd');}
  catch(err){showExpWarn('PSD 생성 중 오류: '+err.message);}
  });
};
$('whiteLayer').onchange=()=>{$('whiteOpts').style.display=$('whiteLayer').checked?'block':'none';updWhiteFitNote();};
$('whitePreview').onchange=()=>{S._whitePrevC=($('whitePreview').checked&&S.img)?whitePreviewCanvas():null;render();};
function applyBaseArtUI(){
  const nb=S.type==='stand'&&S.noBase;
  const m=nb?'none':$('baseSrc').value;
  $('baseSrc').closest('label').style.display=nb?'none':'flex';
  $('baseUpBox').classList.toggle('hide',m!=='upload');
  $('baseArtBox').classList.toggle('hide',m!=='art');
  const shape=(m==='shape');
  for(const id of ['baseShapeRow','baseWRow','baseHRow'])$(id).style.display=shape?'flex':'none';
  $('baseRadRow').style.display=(shape&&$('baseShape').value==='rect')?'flex':'none';
  $('acr').closest('label').style.display=nb?'none':'flex';
  const so=$('slotOff'); // 슬라이더는 label 밖에 있어서 직전 라벨을 같이 숨긴다
  so.style.display=nb?'none':'';
  if(so.previousElementSibling)so.previousElementSibling.style.display=nb?'none':'flex';
  $('baseImgClear').classList.toggle('hide',!S.baseImg);
  $('baseImgPick').textContent=S.baseImg?t('🖼 받침 그림 바꾸기'):t('🖼 받침 그림 올리기');
}
function updBaseUpNote(){
  const n=$('baseUpNote');if(!n)return;
  if(baseSrcMode()!=='upload'&&$('baseSrc').value!=='upload'){n.innerHTML='';return;}
  if(!S.baseImg){n.innerHTML=t('받침으로 쓸 그림을 올려주세요. 투명 PNG면 그 실루엣대로 칼선이 나와요.');return;}
  if(S._baseWarn==='upEmpty'){n.innerHTML=`<b style="color:#ff2d55">⚠ ${t('받침 그림에서 실루엣을 못 찾았어요. 투명 배경인지 확인해 주세요.')}</b>`;return;}
  const b=S.baseUp;
  if(!b){n.innerHTML='';return;}
  const lines=[`${t('받침')} <b>${b.wMm.toFixed(1)}×${b.hMm.toFixed(1)}mm</b> · ${t('슬롯')} <b>${b.slots.length}${t('개')}</b> · ${t('앞뒤 벽')} <b>${tomm(b.minWall).toFixed(2)}mm</b>`];
  if(b.fixed)lines.push(`<b style="color:#c85b7c">⚡ ${t('받침이 얇아서 슬롯 주변')} ${b.fixed}${t('곳에 살을 붙였어요')}</b>`);
  else if(tomm(b.minWall)<BASE_WALL_MM*1.2)lines.push(`<span style="color:#c85b7c">${t('벽이 아슬아슬해요 — 아크릴 두께를 줄이거나 받침을 두껍게 그려주세요.')}</span>`);
  else lines.push(`<b style="color:#2e9e5b">✓ ${t('벽 두께 충분')}</b>`);
  n.innerHTML=lines.join('<br>');
}
function updBasePickOptions(){
  const sel=$('basePick');if(!sel)return;
  const cands=S.baseCandidates||[];
  const key=cands.map(c=>c.i+':'+c.wMm+'x'+c.hMm).join(',');
  if(S._bpKey===key)return;
  S._bpKey=key;
  const cur=sel.value;
  sel.innerHTML='<option value="auto">'+t('자동 인식')+'</option>'
    +cands.map(c=>`<option value="${c.i}">${t('조각')} ${c.i+1} (${c.wMm}×${c.hMm}mm)</option>`).join('');
  sel.value=[...sel.options].some(o=>o.value===cur)?cur:'auto';
}
function updBaseArtNote(){
  const n=$('baseArtNote');if(!n)return;
  if($('baseSrc').value!=='art'||S.type!=='stand'||S.noBase){n.innerHTML='';return;}
  updBasePickOptions();
  if(S._baseWarn==='need2'){
    n.innerHTML=`<b style="color:#ff2d55">⚠ ${t('떨어져 있는 조각이 하나뿐이라 받침으로 쓸 조각이 없어요. 받침을 캐릭터와 떨어뜨려 같이 그려주세요.')}</b>`;
    return;
  }
  const b=S.baseArt;
  if(!b){n.innerHTML=t('그림을 올리면 받침으로 쓸 조각을 찾아요.');return;}
  const lines=[`${t('받침 조각')} <b>${b.wMm.toFixed(1)}×${b.hMm.toFixed(1)}mm</b> · ${t('슬롯')} <b>${b.slots.length}${t('개')}</b> · ${t('앞뒤 벽')} <b>${tomm(b.minWall).toFixed(2)}mm</b>`];
  if(b.fixed)lines.push(`<b style="color:#c85b7c">⚡ ${t('받침이 얇아서 슬롯 주변')} ${b.fixed}${t('곳에 살을 붙였어요')}</b>`);
  else if(tomm(b.minWall)<BASE_WALL_MM*1.2)lines.push(`<span style="color:#c85b7c">${t('벽이 아슬아슬해요 — 아크릴 두께를 줄이거나 받침을 두껍게 그려주세요.')}</span>`);
  else lines.push(`<b style="color:#2e9e5b">✓ ${t('벽 두께 충분')}</b>`);
  n.innerHTML=lines.join('<br>');
}
function updWhiteFitNote(){ // 실제로 내보낼 화이트가 그림과 얼마나 어긋나는지 실측해서 보여줌
  const n=$('whiteFitNote');if(!n)return;
  if(!($('whiteLayer').checked&&S.img&&S.srcMaskData)){n.innerHTML='';S._wfKey=null;return;}
  const key=[S.pW,S.pcH,S._srcStamp||0,$('whiteOff').value,$('whiteFormat').value,$('whiteSimplify').value,
             $('thresh').value,$('bgmode').value,S.customWhite?1:0].join('|');
  if(S._wfKey===key){n.innerHTML=S._wfHtml||'';return;}
  let html='';
  try{
    const c=whitePreviewCanvas(); // 미리보기 = 실제 내보낼 형상
    const d=c.getContext('2d').getImageData(0,0,S.pW,S.pcH).data;
    const m=S.srcMaskData,W=S.pW,H=S.pcH;
    let art=0,miss=0,over=0,edge=0;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const p=y*W+x,a=m[p]?1:0,v=d[p*4+3]>=128?1:0;
      if(a){
        art++;
        if(!v)miss++;
        if(!m[p-1]||!m[p+1]||y===0||!m[p-W]||y===H-1||!m[p+W])edge++; // 실루엣 경계 픽셀 ≈ 둘레
      }else if(v)over++;
    }
    const mm2=1/(S.pxmm*S.pxmm);
    const missMm=miss*mm2,overMm=over*mm2;
    const periMm=tomm(edge); // 경계 픽셀 수 → 대략적 둘레
    const avg=periMm>0?(missMm+overMm)/periMm:0; // 평균 어긋난 폭
    const wOff=+$('whiteOff').value||0;
    const big=avg>=0.06;
    const col=big?'#c85b7c':'#2e9e5b';
    html=`<b style="color:${col}">${t('화이트 ↔ 그림')} ${t('평균')} ${avg.toFixed(3)}mm</b>`
       +` · ${t('빠짐')} ${missMm.toFixed(1)}mm² · ${t('넘침')} ${overMm.toFixed(1)}mm²`
       +` (${t('그림의')} ${(100*(miss+over)/Math.max(1,art)).toFixed(2)}%)`;
    if(Math.abs(wOff)>=0.05)html+=`<br>${t('화이트 여백')} <b>${wOff>0?'+':''}${wOff.toFixed(1)}mm</b> ${t('설정 때문이에요. 그림과 똑같이 맞추려면 0으로 두세요.')}`;
    else if(big)html+=`<br>${t('여백은 0인데도 벌어져 있어요 — 화이트 형식을 래스터로 바꾸면 그림과 픽셀 단위로 일치해요.')}`;
  }catch(err){html='';}
  S._wfKey=key;S._wfHtml=html;
  n.innerHTML=html;
}
function updWhiteSimplifyNote(){
  const n=$('whiteSimplifyNote');if(!n)return;
  const on=$('whiteSimplify').value==='simple'&&S.img&&!whiteSimplifyEffective();
  n.style.display=on?'block':'none';
}
$('whiteSimplify').onchange=()=>{updWhiteSimplifyNote();updWhiteFitNote();if($('whitePreview').checked&&S.img){S._whitePrevC=whitePreviewCanvas();render();}};
$('whiteFormat').onchange=()=>{if($('whitePreview').checked&&S.img){S._whitePrevC=whitePreviewCanvas();render();}updWhiteFitNote();};
$('whiteOff').onchange=()=>{if($('whitePreview').checked&&S.img){S._whitePrevC=whitePreviewCanvas();render();}updWhiteFitNote();};
$('whiteOff').oninput=()=>{$('whiteOffV').textContent=(+$('whiteOff').value).toFixed(1);};
function updateWhiteLabels(){ // 스티커 계열이면 '배경'(대지 전체)으로 표기·항목 전환
  const st=(S.type==='sticker'||S.type==='sheet');
  $('whiteTitle').textContent=st?t('배경'):t('화이트 레이어');
  $('whiteToggleTxt').textContent=st?t('배경 인쇄'):t('화이트 레이어 추가');
  $('whiteOffLabel').textContent=t('화이트 여백(mm)');
  const hide=(el,on)=>{if(el)el.classList.toggle('hide',on);};
  hide($('whiteOffLabel').closest('label'),st);hide($('whiteOff'),st);hide($('whiteFormat').closest('label'),st);hide($('whiteSimplifyRow'),st);hide($('whiteColRow'),st);
  hide($('whiteFitNote'),st);hide($('whiteSimplifyNote'),st);
  const inkLbl=$('whiteInkCol').closest('label');if(inkLbl&&inkLbl.firstChild&&inkLbl.firstChild.nodeType===3)inkLbl.firstChild.textContent=(st?t('배경 색'):t('레이어 색'))+' ';
  $('whiteUpBtn').textContent=st?t('🎨 배경 파일 올리기'):t('직접 만든 화이트 불러오기');
  $('whiteUpClear').textContent=st?t('✕ 단색으로'):t('✕ 자동으로');
  const note=$('whiteBgNote');if(note)note.classList.toggle('hide',!st);
}
$('whiteUpBtn').onclick=async()=>{
  const fs=await openImages(false,'goods-white');
  if(!fs||!fs[0])return;
  try{
    const img=await loadImageFile(fs[0]);
    S.customWhite=img;S._cwCache=null;
    if(isStickerType()&&S.img&&!$('boardOn').checked){ // 스티커 배경 파일 = 대지 크기. 자르지 않고 대지를 파일에 맞춘다
      $('boardOn').checked=true;$('boardW').value=tomm(img.width).toFixed(1);$('boardH').value=tomm(img.height).toFixed(1);
      for(const id of ['boardOn','boardW','boardH'])settingBag(id)[id]=readCtl($(id));
      recompute(true);
    }
    let name='🎨 '+fs[0].name;
    if(S.img&&(img.width!==S.W||img.height!==S.H))name+=' · '+t('크기가 원본과 달라요 — 원본 위치에 맞춰 늘려 써요');
    if(S.img&&S.pW){ // 판독 확인: 불투명 영역 비율 — 0%면 파일을 못 읽은 것
      const cwd=customWhiteAlpha();const tot=S.pW*S.pcH;const on=(S._cwCache&&S._cwCache.on)||0;
      name+=' · '+t('불투명')+' '+(on?Math.max(1,Math.round(on/tot*100)):0)+'%';
      if(!on)name+=' ⚠ '+t('화이트를 읽지 못했어요 — 투명 PNG인지, 파일이 너무 크지 않은지 확인하세요');
    }
    $('whiteUpName').textContent=name;
    $('whiteUpRow').classList.remove('hide');$('whiteUpRow').style.display='flex';
    if(!$('whiteLayer').checked){$('whiteLayer').checked=true;$('whiteLayer').onchange();}
  }catch(err){}
};
$('whiteUpClear').onclick=()=>{S.customWhite=null;S._cwCache=null;$('whiteUpRow').style.display='none';$('whiteUpRow').classList.add('hide');};
