// ===== 검증된 알고리즘 =====
const INF=1e20;
function dt1d(f,n,d,v,z){let k=0;v[0]=0;z[0]=-INF;z[1]=INF;for(let q=1;q<n;q++){let s=((f[q]+q*q)-(f[v[k]]+v[k]*v[k]))/(2*q-2*v[k]);while(s<=z[k]){k--;s=((f[q]+q*q)-(f[v[k]]+v[k]*v[k]))/(2*q-2*v[k]);}k++;v[k]=q;z[k]=s;z[k+1]=INF;}k=0;for(let q=0;q<n;q++){while(z[k+1]<q)k++;d[q]=(q-v[k])*(q-v[k])+f[v[k]];}}
// 유클리드 거리 변환 — Felzenszwalb & Huttenlocher (2012) 2패스 포물선 하한 포락선 방식 참고 구현
function edt2d(mask,W,H,outBuf){const d=(outBuf&&outBuf.length>=W*H)?outBuf:new Float64Array(W*H);for(let i=0;i<W*H;i++)d[i]=mask[i]?0:INF;const m=Math.max(W,H);const f=new Float64Array(m),o=new Float64Array(m),v=new Int32Array(m),z=new Float64Array(m+1);for(let x=0;x<W;x++){for(let y=0;y<H;y++)f[y]=d[y*W+x];dt1d(f,H,o,v,z);for(let y=0;y<H;y++)d[y*W+x]=o[y];}for(let y=0;y<H;y++){for(let x=0;x<W;x++)f[x]=d[y*W+x];dt1d(f,W,o,v,z);for(let x=0;x<W;x++)d[y*W+x]=o[x];}for(let i=0;i<W*H;i++)d[i]=Math.sqrt(d[i]);return d;}
function signedDist2d(mask,W,H){
  const dOut=edt2d(mask,W,H); // 배경→그림 거리 (그림 위=0)
  const inv=new Uint8Array(W*H);
  for(let i=0;i<W*H;i++)inv[i]=mask[i]?0:1;
  const dIn=edt2d(inv,W,H);   // 그림→배경 거리 (배경 위=0)
  const sd=new Float64Array(W*H);
  for(let i=0;i<W*H;i++)sd[i]=mask[i]?-dIn[i]:dOut[i];
  return sd;
}
// Marching Squares 등고선 추출 (표준 알고리즘) — 안장점은 셀 중앙값으로 판정, 행 캐리로 최적화
function marchingSquares(D,W,H,T){const s=[];const ip=(x1,y1,v1,x2,y2,v2)=>{const t=(T-v1)/(v2-v1);return[x1+t*(x2-x1),y1+t*(y2-y1)];};
for(let y=0;y<H-1;y++){
  const r0=y*W,r1=r0+W;
  let tl=D[r0],bl=D[r1]; // 행 캐리: 이전 셀의 tr/br 재사용
  let bitL=(tl<T?8:0)|(bl<T?1:0);
  for(let x=0;x<W-1;x++){
    const tr=D[r0+x+1],br=D[r1+x+1];
    const bitR=(tr<T?4:0)|(br<T?2:0);
    const i=bitL|bitR;
    if(i!==0&&i!==15){
      const tp=()=>ip(x,y,tl,x+1,y,tr),rt=()=>ip(x+1,y,tr,x+1,y+1,br),bt=()=>ip(x+1,y+1,br,x,y+1,bl),lf=()=>ip(x,y+1,bl,x,y,tl);
      switch(i){case 1:s.push([lf(),bt()]);break;case 2:s.push([bt(),rt()]);break;case 3:s.push([lf(),rt()]);break;case 4:s.push([tp(),rt()]);break;case 5:{const c5=(tl+tr+br+bl)/4;if(c5<T){s.push([tp(),lf()]);s.push([bt(),rt()]);}else{s.push([tp(),rt()]);s.push([lf(),bt()]);}break;}case 6:s.push([tp(),bt()]);break;case 7:s.push([tp(),lf()]);break;case 8:s.push([tp(),lf()]);break;case 9:s.push([tp(),bt()]);break;case 10:{const c10=(tl+tr+br+bl)/4;if(c10<T){s.push([tp(),rt()]);s.push([lf(),bt()]);}else{s.push([tp(),lf()]);s.push([bt(),rt()]);}break;}case 11:s.push([tp(),rt()]);break;case 12:s.push([lf(),rt()]);break;case 13:s.push([bt(),rt()]);break;case 14:s.push([lf(),bt()]);break;}
    }
    tl=tr;bl=br;bitL=(bitR&4?8:0)|(bitR&2?1:0);
  }
}
return s;}
function linkLoops(segs){const key=p=>`${Math.round(p[0]*1000)}_${Math.round(p[1]*1000)}`;const nx=new Map(),pts=new Map();const add=(a,b)=>{const ka=key(a);if(!nx.has(ka))nx.set(ka,[]);nx.get(ka).push({pt:b,key:key(b)});pts.set(ka,a);pts.set(key(b),b);};for(const s of segs){add(s[0],s[1]);add(s[1],s[0]);}const used=new Set();const eid=(a,b)=>a<b?a+'|'+b:b+'|'+a;const loops=[];for(const[sk,sp]of pts){for(const nb of nx.get(sk)||[]){if(used.has(eid(sk,nb.key)))continue;const lp=[sp];used.add(eid(sk,nb.key));let nk=nb.key,np=nb.pt;lp.push(np);let g=0;while(nk!==sk&&g++<segs.length*2+10){let mv=false;for(const c of nx.get(nk)||[]){if(used.has(eid(nk,c.key)))continue;used.add(eid(nk,c.key));nk=c.key;np=c.pt;lp.push(np);mv=true;break;}if(!mv)break;}loops.push(lp);}}return loops;}
function perim(l){let s=0;for(let i=1;i<l.length;i++)s+=Math.hypot(l[i][0]-l[i-1][0],l[i][1]-l[i-1][1]);return s;}
function chaikin(loop,iter){let p=loop.slice();const c=p.length>2;for(let k=0;k<iter;k++){const o=[];const n=p.length-(c?1:0);for(let i=0;i<n;i++){const a=p[i],b=p[(i+1)%p.length];o.push([a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25]);o.push([a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75]);}if(c)o.push(o[0]);p=o;}return p;}
function stampCircle(m,W,H,cx,cy,r){const r2=r*r;for(let y=Math.max(0,cy-r|0);y<=Math.min(H-1,cy+r);y++)for(let x=Math.max(0,cx-r|0);x<=Math.min(W-1,cx+r);x++){const dx=x-cx,dy=y-cy;if(dx*dx+dy*dy<=r2)m[y*W+x]=1;}}
function stampRect(m,W,H,x0,y0,x1,y1){for(let y=Math.max(0,y0|0);y<=Math.min(H-1,y1);y++)for(let x=Math.max(0,x0|0);x<=Math.min(W-1,x1);x++)m[y*W+x]=1;}
function roundedRectLoop(cx,cy,w,h,r){const p=[];const x0=cx-w/2,y0=cy-h/2,x1=cx+w/2,y1=cy+h/2;r=Math.min(r,w/2,h/2);const arc=(ax,ay,a0,a1)=>{const N=8;for(let i=0;i<=N;i++){const a=a0+(a1-a0)*i/N;p.push([ax+r*Math.cos(a),ay+r*Math.sin(a)]);}};arc(x1-r,y0+r,-Math.PI/2,0);arc(x1-r,y1-r,0,Math.PI/2);arc(x0+r,y1-r,Math.PI/2,Math.PI);arc(x0+r,y0+r,Math.PI,Math.PI*1.5);p.push(p[0]);return p;}
function rectLoop(cx,cy,w,h){const x0=cx-w/2,y0=cy-h/2,x1=cx+w/2,y1=cy+h/2;return[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]];}
function ellipseLoop(cx,cy,rx,ry){const p=[];const N=64;for(let i=0;i<=N;i++){const a=i/N*Math.PI*2;p.push([cx+rx*Math.cos(a),cy+ry*Math.sin(a)]);}return p;}
function labelComponents(mask,W,H,minArea){ // 4방향 연결성분 (다인 이미지 분리)
  const lab=new Int32Array(W*H);let id=0;const comps=[];
  const qx=new Int32Array(W*H),qy=new Int32Array(W*H);
  for(let y0=0;y0<H;y0++)for(let x0=0;x0<W;x0++){
    const i0=y0*W+x0;
    if(!mask[i0]||lab[i0])continue;
    id++;let head=0,tail=0;qx[tail]=x0;qy[tail++]=y0;lab[i0]=id;
    let a=0,mnx=x0,mny=y0,mxx=x0,mxy=y0;
    while(head<tail){
      const x=qx[head],y=qy[head++];a++;
      if(x<mnx)mnx=x;if(x>mxx)mxx=x;if(y<mny)mny=y;if(y>mxy)mxy=y;
      if(x>0){const j=y*W+x-1;if(mask[j]&&!lab[j]){lab[j]=id;qx[tail]=x-1;qy[tail++]=y;}}
      if(x<W-1){const j=y*W+x+1;if(mask[j]&&!lab[j]){lab[j]=id;qx[tail]=x+1;qy[tail++]=y;}}
      if(y>0){const j=(y-1)*W+x;if(mask[j]&&!lab[j]){lab[j]=id;qx[tail]=x;qy[tail++]=y-1;}}
      if(y<H-1){const j=(y+1)*W+x;if(mask[j]&&!lab[j]){lab[j]=id;qx[tail]=x;qy[tail++]=y+1;}}
    }
    if(a>=minArea)comps.push({id,minX:mnx,minY:mny,maxX:mxx,maxY:mxy,area:a});
  }
  comps.sort((a2,b2)=>((a2.minX+a2.maxX)-(b2.minX+b2.maxX))); // 왼쪽부터 1번
  return {labels:lab,comps};
}
function loopCompIdx(l,comps){ // 루프가 어느 컴포넌트 것인지 (bbox 중심 최근접)
  let mnx=1e9,mny=1e9,mxx=-1e9,mxy=-1e9;
  for(const q of l){if(q[0]<mnx)mnx=q[0];if(q[0]>mxx)mxx=q[0];if(q[1]<mny)mny=q[1];if(q[1]>mxy)mxy=q[1];}
  const cx=(mnx+mxx)/2,cy=(mny+mxy)/2;
  let best=-1,bd=1e18;
  comps.forEach((c,i)=>{const dx=cx-(c.minX+c.maxX)/2,dy=cy-(c.minY+c.maxY)/2;const d=dx*dx+dy*dy;if(d<bd){bd=d;best=i;}});
  return best;
}
function bottomWidestClusterCenterL(labels,id,W,H,bb){ // 특정 컴포넌트만 대상으로
  const band=Math.max(2,Math.round((bb.maxY-bb.minY)*0.04));
  const y0=Math.max(bb.minY,bb.maxY-band);
  const col=new Uint8Array(W);
  for(let y=y0;y<=bb.maxY;y++)for(let x=bb.minX;x<=bb.maxX;x++)if(labels[y*W+x]===id)col[x]=1;
  let best={s:-1,e:-1,len:0},curS=-1;
  for(let x=bb.minX;x<=bb.maxX+1;x++){
    const on=x<=bb.maxX&&col[x];
    if(on&&curS<0)curS=x;
    if(!on&&curS>=0){const len=x-curS;if(len>best.len)best={s:curS,e:x-1,len};curS=-1;}
  }
  return best.len>0?(best.s+best.e)/2:(bb.minX+bb.maxX)/2;
}
// 촉 자리: 맨 아래 한 점(발끝)이 아니라, 아래쪽 띠를 4%→20% 로 넓혀 가며 촉 폭(tabW) 이상으로 받쳐 줄 수 있는 가장 넓은 구간을 고른다.
// isOn(x,y): 그 픽셀이 이 개체인지. 반환 {cx, y}: 구간 중심 x 와 그 구간의 국소 바닥 y (촉은 여기서부터 아래로 붙는다)
function bottomTabAnchor(isOn,W,H,bb,tabW){
  const hgt=bb.maxY-bb.minY+1;let fallback=null;
  for(const frac of [0.04,0.08,0.12,0.16,0.2,0.26]){
    const band=Math.max(2,Math.round(hgt*frac)),y0=Math.max(bb.minY,bb.maxY-band);
    const col=new Int32Array(W);
    for(let y=y0;y<=bb.maxY;y++)for(let x=bb.minX;x<=bb.maxX;x++)if(isOn(x,y))col[x]++;
    let best=null,curS=-1;
    for(let x=bb.minX;x<=bb.maxX+1;x++){
      const on=x<=bb.maxX&&col[x]>0;
      if(on&&curS<0)curS=x;
      if(!on&&curS>=0){const len=x-curS;if(!best||len>best.len)best={s:curS,e:x-1,len};curS=-1;}
    }
    if(!best)continue;
    // 촉이 놓일 폭 안에서 각 열의 바닥 중 '가장 높은' 바닥 = 촉 윗변. 여기서부터 아래로 찍어야 발끝 옆의 넓은 부분과도 겹친다
    const cx=(best.s+best.e)/2,xa=Math.max(best.s,Math.round(cx-tabW/2)),xb=Math.min(best.e,Math.round(cx+tabW/2));
    let yb=bb.maxY;for(let x=xa;x<=xb;x++){for(let y=bb.maxY;y>=y0;y--)if(isOn(x,y)){if(y<yb)yb=y;break;}}
    const cand={cx,y:yb,len:best.len};
    if(!fallback||cand.len>fallback.len)fallback=cand;
    if(best.len>=tabW*0.85)return cand; // 촉을 넉넉히 받칠 수 있는 구간
  }
  return fallback||{cx:(bb.minX+bb.maxX)/2,y:bb.maxY,len:0};
}
function bottomWidestClusterCenter(mask,W,H,bb){
  const band=Math.max(2,Math.round((bb.maxY-bb.minY)*0.04));
  const y0=Math.max(bb.minY,bb.maxY-band);
  const col=new Uint8Array(W);
  for(let y=y0;y<=bb.maxY;y++)for(let x=bb.minX;x<=bb.maxX;x++)if(mask[y*W+x])col[x]=1;
  let best={s:-1,e:-1,len:0},curS=-1;
  for(let x=bb.minX;x<=bb.maxX+1;x++){
    const on=x<=bb.maxX&&col[x];
    if(on&&curS<0)curS=x;
    if(!on&&curS>=0){const len=x-curS;if(len>best.len)best={s:curS,e:x-1,len};curS=-1;}
  }
  return best.len>0?(best.s+best.e)/2:(bb.minX+bb.maxX)/2;
}
function checkTabOverlap(preMask,W,H,tabCx,tWraw,y0,y1){
  if(!preMask)return true;
  const half=tWraw/2,total=Math.max(1,Math.round(tWraw));let covered=0;
  const yA=Math.max(0,Math.floor(Math.min(y0,y1))),yB=Math.min(H-1,Math.ceil(Math.max(y0,y1)));
  for(let dx=0;dx<total;dx++){
    const x=Math.max(0,Math.min(W-1,Math.round(tabCx-half+dx)));
    let hit=false;
    for(let y=yA;y<=yB;y++){if(preMask[y*W+x]){hit=true;break;}}
    if(hit)covered++;
  }
  return (covered/total)>=0.5;
}
function spliceSharpTab(loopClosed,xL,xR,yThresh,cornerR){
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
  if(start<0||end<0)return loopClosed; // 촉 돌출부를 못 찾으면 원본 그대로
  let bottomY=-1e9;
  for(let i=start;;i=(i+1)%n){bottomY=Math.max(bottomY,loop[i][1]);if(i===end)break;}
  const before=loop[(start-1+n)%n],after=loop[(end+1)%n];
  // 루프 진행 방향 감지: 돌출부 직전 점이 오른쪽에 가까우면 오른쪽부터 내려가야 함
  // (한 방향만 가정하면 반대 방향 루프에서 촉 상단을 가로지르는 유령 선이 생겨 재단 시 촉이 분리될 위험)
  const fromRight=Math.abs(before[0]-xR)<Math.abs(before[0]-xL);
  const x1=fromRight?xR:xL, x2=fromRight?xL:xR; // 진입쪽 → 반대쪽
  let repl;
  const r=Math.max(0,Math.min(cornerR||0,(xR-xL)/2-1));
  if(r>1){ // 바닥 양끝 모서리를 1/4 원호로
    repl=[[x1,before[1]],[x1,bottomY-r]];
    const arc=(cx,cy,a0,a1)=>{const N=6;for(let k=1;k<=N;k++){const a=a0+(a1-a0)*k/N;repl.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]);}};
    if(fromRight){
      arc(xR-r,bottomY-r,0,Math.PI/2);
      repl.push([xL+r,bottomY]);
      arc(xL+r,bottomY-r,Math.PI/2,Math.PI);
    }else{
      arc(xL+r,bottomY-r,Math.PI,Math.PI/2);
      repl.push([xR-r,bottomY]);
      arc(xR-r,bottomY-r,Math.PI/2,0);
    }
    repl.push([x2,after[1]]);
  }else{
    repl=[[x1,before[1]],[x1,bottomY],[x2,bottomY],[x2,after[1]]];
  }
  const out=[];
  let i=(end+1)%n;
  while(i!==start){out.push(loop[i]);i=(i+1)%n;}
  const finalLoop=out.concat(repl);
  finalLoop.push(finalLoop[0]);
  return finalLoop;
}
