// ===== 내보내기 =====
function paintCut(ctx){ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle=$('cutcol').value;ctx.lineWidth=Math.max(1,px(+$('cutw').value));
  if(S._imgDragPreview)ctx.globalAlpha=0.25; // 그림 이동 중 — 놓으면 재계산
  if(docWantsMain())for(const l of S.loops)strokeLoop(ctx,l,1);
  if(docWantsBase())for(const l of S.baseLoops)strokeLoop(ctx,l,1);
  if(hasHole()&&docWantsMain())for(const h of S.holes){ctx.beginPath();ctx.arc(h.x,h.y,px((+$('hd').value)/2),0,7);ctx.stroke();}
  const sl=docWantsMain()?shapeLoop():null;
  if(sl){ctx.strokeStyle=$('shapeCol').value;strokeLoop(ctx,sl,1);ctx.strokeStyle=$('cutcol').value;}
  const fr=fullCutRect();if(fr){ctx.strokeRect(fr.x+ctx.lineWidth/2,fr.y+ctx.lineWidth/2,fr.w-ctx.lineWidth,fr.h-ctx.lineWidth);} // 대지 외곽 완칼
  ctx.globalAlpha=1;}
function maskDesignToArt(ctx){ // 흰 배경 원본: 실루엣 밖을 투명하게 (1px 페더로 가장자리 부드럽게)
  const m=S.srcMaskData||S.artMaskData;
  if($('bgmode').value!=='white'||!m)return;
  const r0=docRect();
  const im=ctx.getImageData(0,0,r0.w,r0.h);const d=im.data;
  const dist=edt2d(m,S.pW,S.pcH); // 원본 실루엣까지의 거리 (내부=0)
  for(let y=0;y<S.pcH;y++)for(let x=0;x<S.pW;x++){
    const i=y*S.pW+x;
    const cx0=x-r0.x,cy0=y-r0.y;
    if(cx0<0||cy0<0||cx0>=r0.w||cy0>=r0.h)continue; // 대지 밖은 건너뜀
    const j=cy0*r0.w+cx0;
    if(dist[i]>0){
      const a=Math.max(0,1.5-dist[i]); // 1.5px 안쪽까지 페이드
      d[j*4+3]=Math.min(d[j*4+3],Math.round(a*255));
    }
  }
  for(let y=S.pcH;y<S.pH;y++)for(let x=0;x<S.pW;x++)d[(y*S.pW+x)*4+3]=0; // 받침 영역엔 디자인 없음
  ctx.putImageData(im,0,0);
}
function designRect(){ // 디자인 오브젝트가 실제로 차지하는 영역 (그림 + 업로드 받침 대지), 현재 대지 안으로 클램프
  const R=docRect();
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  if(docWantsMain()){x0=S.xImg;y0=S.yImg;x1=S.xImg+S.W;y1=S.yImg+S.H;}
  const b=S.baseUp;
  if(b&&S.baseImg&&docWantsBase()){
    x0=Math.min(x0,b.x0);y0=Math.min(y0,b.y0);
    x1=Math.max(x1,b.x0+b.sw);y1=Math.max(y1,b.y0+b.sh);
  }
  if(x1<x0)return {x:R.x,y:R.y,w:1,h:1};
  x0=Math.max(R.x,Math.floor(x0));y0=Math.max(R.y,Math.floor(y0));
  x1=Math.min(R.x+R.w,Math.ceil(x1));y1=Math.min(R.y+R.h,Math.ceil(y1));
  return {x:x0,y:y0,w:Math.max(1,x1-x0),h:Math.max(1,y1-y0)};
}
function paintBaseStrip(ctx,kind,colorHex){ // 받침 대지(업로드 받침)의 디자인/화이트를 판 아래쪽에 그림
  const b=S.baseUp;
  if(!b||!S.baseImg)return;
  if(kind==='design'||kind==='preview'){
    ctx.save();ctx.imageSmoothingQuality='high';
    ctx.drawImage(S.baseImg,b.x0,b.y0,b.sw,b.sh);
    ctx.restore();
    return;
  }
  if(kind!=='white')return;
  // 화이트: 받침 그림의 알파를 그대로 쓰고 색만 교체 (본체 화이트와 같은 규칙)
  const t=document.createElement('canvas');t.width=b.sw;t.height=b.sh;
  const tc=t.getContext('2d');tc.imageSmoothingQuality='high';
  tc.drawImage(S.baseImg,0,0,b.sw,b.sh);
  const im=tc.getImageData(0,0,b.sw,b.sh),d=im.data;
  let r=255,g=255,bl=255;
  if(colorHex){r=parseInt(colorHex.slice(1,3),16);g=parseInt(colorHex.slice(3,5),16);bl=parseInt(colorHex.slice(5,7),16);}
  for(let i=0;i<b.sw*b.sh;i++){const a=d[i*4+3];if(a){d[i*4]=r;d[i*4+1]=g;d[i*4+2]=bl;}}
  tc.putImageData(im,0,0);
  // 슬롯은 뚫리는 구멍 — 화이트 제외
  tc.save();tc.globalCompositeOperation='destination-out';tc.fillStyle='#000';
  for(const s2 of b.slots)tc.fillRect(s2.cx-b.x0-s2.w/2,s2.cy-b.y0-s2.h/2,s2.w,s2.h);
  tc.restore();
  ctx.drawImage(t,b.x0,b.y0);
}
// ===== 내보내기 대지 범위 =====
// 기본은 문서 전체(본체+받침). '받침 별도 대지'를 켜면 본체용/받침용으로 나눠 두 번 내보낸다.
let DOC=null;
function docRect(){return DOC||{x:0,y:0,w:S.pW,h:S.pH,part:'all',name:''};}
function withDoc(r,fn){const bak=DOC;DOC=r;try{return fn();}finally{DOC=bak;}}
function docWantsMain(){return docRect().part!=='base';}
function docWantsBase(){return docRect().part!=='body';}
function baseSepOn(){
  return standHasBase()&&$('baseSeparate').checked&&S.baseLoops.length>0&&baseSrcMode()!=='art';
}
function baseDocRect(){ // 받침 대지 = 받침 칼선·그림을 감싸는 사각형 + 여유
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const l of S.baseLoops)for(const p of l){
    if(p[0]<x0)x0=p[0];if(p[0]>x1)x1=p[0];if(p[1]<y0)y0=p[1];if(p[1]>y1)y1=p[1];
  }
  // 그림의 투명 여백까지 넣으면 대지가 실제 조각보다 커진다 — 칼선 기준으로 잡고 여유(bleed)만 더한다
  if(x1<x0)return {x:0,y:S.pcH,w:S.pW,h:Math.max(1,S.pH-S.pcH),part:'base',name:'받침'};
  const pad=Math.max(px(2),px(+$('cutw').value||0.1)*2);
  x0=Math.max(0,Math.floor(x0-pad));y0=Math.max(0,Math.floor(y0-pad));
  x1=Math.min(S.pW,Math.ceil(x1+pad));y1=Math.min(S.pH,Math.ceil(y1+pad));
  return {x:x0,y:y0,w:Math.max(1,x1-x0),h:Math.max(1,y1-y0),part:'base',name:'받침'};
}
function exportParts(){ // 내보낼 대지 목록
  if(!baseSepOn())return [docRect()];
  return [{x:0,y:0,w:S.pW,h:S.pcH,part:'body',name:'본체'},baseDocRect()];
}
function layerCanvas(kind){const r=docRect();
  const c=document.createElement('canvas');c.width=r.w;c.height=r.h;const ctx=c.getContext('2d');
  ctx.translate(-r.x,-r.y); // 대지 범위만큼 이동 — 본체/받침을 각자 대지로 자를 때
  if((kind==='design'||kind==='preview')&&docWantsMain())ctx.drawImage(S.img,S.xImg,S.yImg,S.W,S.H);
  if(kind==='design'&&docWantsMain())maskDesignToArt(ctx); // 내보내기용 디자인은 배경 투명 보장
  if((kind==='design'||kind==='preview')&&docWantsBase())paintBaseStrip(ctx,kind); // 받침 대지는 실루엣 마스킹 뒤에 (별도 그림)
  if(kind==='cut'||kind==='preview')paintCut(ctx);
  ctx.setTransform(1,0,0,1,0,0);
  return c;}
function customWhiteAlpha(){ // 업로드 화이트의 알파를 판 좌표계로 (같은 판·같은 위치면 캐시 — 내보내기 한 번에 3~4회 호출되므로 모바일 메모리 절약)
  if(!S.customWhite)return null;
  const cw=S.customWhite;
  const key=[S.pW,S.pcH,S.xImg,S.yImg,S.W,S.H].join('|');
  const c0=S._cwCache;
  if(c0&&c0.src===cw&&c0.key===key)return c0.data;
  const t=document.createElement('canvas');t.width=S.pW;t.height=S.pcH;
  const tctx=t.getContext('2d');
  // 화이트가 원본 그림과 '같은 픽셀 크기'면 = 같은 캔버스에서 내보낸 짝 레이어.
  // 이때는 원본과 완전히 동일한 방식(스케일 없이 같은 좌표)으로 그려 픽셀 단위 정렬 보장.
  if(isStickerType()){tctx.drawImage(cw,0,0,S.pW,S.pcH);} // 스티커 배경 파일 = 대지 전체 (파일 크기가 대지 크기로 맞춰짐)
  else if(cw.width===S.W&&cw.height===S.H){
    tctx.drawImage(cw,S.xImg,S.yImg);
  }else{
    tctx.drawImage(cw,S.xImg,S.yImg,S.W,S.H);
  }
  const data=tctx.getImageData(0,0,S.pW,S.pcH).data;
  let on=0;for(let i=3;i<data.length;i+=4)if(data[i])on++;
  S._cwCache={src:cw,key,data,on}; // on=불투명 픽셀 수. 0이면 화이트를 못 읽은 것(모바일 캔버스 한계·빈 파일)
  return data;
}
function customWhiteEmpty(){ // 업로드 화이트가 있는데 판 위에 불투명 픽셀이 하나도 없음 → 조용히 빈 화이트를 내보내지 말고 알려야 함
  if(!S.customWhite)return false;
  customWhiteAlpha();
  return !!(S._cwCache&&S._cwCache.on===0);
}
function whiteLayerCanvas(colorHex){ // 백판 = 원본 그림에서 색만 바꾼 것 (칼선 보정 무시 — 잉크 없는 곳엔 화이트도 없음)
  const dr0=docRect();
  const c=document.createElement('canvas');c.width=dr0.w;c.height=dr0.h;const ctx=c.getContext('2d');
  let r=255,g=255,b=255;
  if(colorHex){r=parseInt(colorHex.slice(1,3),16);g=parseInt(colorHex.slice(3,5),16);b=parseInt(colorHex.slice(5,7),16);}
  const m=S.srcMaskData||S.artMaskData;
  if(!m)return c;
  if(!colorHex){const ic=$('whiteInkCol').value;r=parseInt(ic.slice(1,3),16);g=parseInt(ic.slice(3,5),16);b=parseInt(ic.slice(5,7),16);}
  const img=ctx.createImageData(S.pW,S.pcH);const d=img.data;
  const wOff=isStickerType()?0:px(+$('whiteOff').value||0);
  const cw=customWhiteAlpha();
  const keepCol=keepCustomColors();
  if(isStickerType()){ // 스티커: 대지 전체가 배경 — 단색 또는 배경 파일(색 그대로)
    if(cw){for(let i=0;i<S.pW*S.pcH;i++){const a=cw[i*4+3];d[i*4]=cw[i*4];d[i*4+1]=cw[i*4+1];d[i*4+2]=cw[i*4+2];d[i*4+3]=a;}}
    else{for(let i=0;i<S.pW*S.pcH;i++){d[i*4]=r;d[i*4+1]=g;d[i*4+2]=b;d[i*4+3]=255;}}
    if(docWantsMain())ctx.putImageData(img,-dr0.x,-dr0.y);
    return c;
  }
  if(Math.abs(wOff)>=0.5){ // 여백 지정: 이진 실루엣을 확장/축소해 렌더 (스티커 대지 = + 확장)
    const om=offsetMask(whiteBaseMask(),S.pW,S.pcH,wOff);
    for(let i=0;i<om.length;i++){if(om[i]){d[i*4]=r;d[i*4+1]=g;d[i*4+2]=b;d[i*4+3]=255;}}
    if(keepCol&&cw){ // 확장부는 레이어 색, 원본 영역은 업로드한 색 그대로
      for(let i=0;i<S.pW*S.pcH;i++){const a=cw[i*4+3];if(a){d[i*4]=cw[i*4];d[i*4+1]=cw[i*4+1];d[i*4+2]=cw[i*4+2];d[i*4+3]=255;}}
    }
    if(docWantsMain())ctx.putImageData(img,-dr0.x,-dr0.y);
    if(docWantsBase()){ctx.save();ctx.translate(-dr0.x,-dr0.y);paintBaseStrip(ctx,'white',colorHex||$('whiteCol').value);ctx.restore();}
    return c;
  }
  if(cw){ // 사용자가 올린 화이트/대지
    if(keepCol){ // 스티커·시트: 업로드한 색 그대로
      for(let i=0;i<S.pW*S.pcH;i++){const a=cw[i*4+3];if(a){d[i*4]=cw[i*4];d[i*4+1]=cw[i*4+1];d[i*4+2]=cw[i*4+2];d[i*4+3]=a;}}
    }else{ // 아크릴 계열: 흰 잉크 의미 — 색만 교체
      for(let i=0;i<S.pW*S.pcH;i++){const a=cw[i*4+3];if(a){d[i*4]=r;d[i*4+1]=g;d[i*4+2]=b;d[i*4+3]=a;}}
    }
  }else if($('bgmode').value==='alpha'&&S.img){
    // 원본 알파를 그대로 사용 — 반투명·안티앨리어싱 가장자리까지 화이트가 따라감
    const t=document.createElement('canvas');t.width=S.pW;t.height=S.pcH;
    const tctx=t.getContext('2d');tctx.drawImage(S.img,S.xImg,S.yImg,S.W,S.H);
    const src=tctx.getImageData(0,0,S.pW,S.pcH).data;
    for(let i=0;i<S.pW*S.pcH;i++){const a=src[i*4+3];if(a){d[i*4]=r;d[i*4+1]=g;d[i*4+2]=b;d[i*4+3]=a;}}
  }else{
    for(let i=0;i<m.length;i++){if(m[i]){d[i*4]=r;d[i*4+1]=g;d[i*4+2]=b;d[i*4+3]=255;}}
  }
  if(docWantsMain())ctx.putImageData(img,-dr0.x,-dr0.y);
  if(docWantsBase()){ctx.save();ctx.translate(-dr0.x,-dr0.y);paintBaseStrip(ctx,'white',colorHex||$('whiteCol').value);ctx.restore();}
  return c;
}
function dl(url,name){const a=document.createElement('a');a.href=url;a.download=name;a.click();}
let dirHandle=null;
const idb=()=>new Promise((res,rej)=>{const r=indexedDB.open('goods-settings',1);
  r.onupgradeneeded=()=>r.result.createObjectStore('kv');
  r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});
async function idbSet(k,v){const db=await idb();return new Promise((res,rej)=>{const tx=db.transaction('kv','readwrite');tx.objectStore('kv').put(v,k);tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});}
async function idbGet(k){const db=await idb();return new Promise((res,rej)=>{const tx=db.transaction('kv','readonly');const g=tx.objectStore('kv').get(k);g.onsuccess=()=>res(g.result);g.onerror=()=>rej(g.error);});}
async function saveBlob(blob,name){ // 폴더 지정 시 그 폴더로, 아니면 일반 다운로드
  if(dirHandle){
    try{
      if(await dirHandle.queryPermission({mode:'readwrite'})!=='granted')
        if(await dirHandle.requestPermission({mode:'readwrite'})!=='granted')throw 0;
      const fh=await dirHandle.getFileHandle(name,{create:true});
      const w=await fh.createWritable();await w.write(blob);await w.close();
      toast('💾 '+t('저장 완료')+': '+name);return;
    }catch(err){/* 권한 거부/실패 → 일반 다운로드로 */}
  }
  dl(URL.createObjectURL(blob),name);
}
const REPO='1000sbin/moa-goods-maker'; // 업데이트 확인용 저장소
const APP_VER='2.0.0'; // 배포 시 버전 배지와 함께 갱신
function verCmp(a,b){ // 'v1.5.7' vs '1.4.6' → 1/0/-1
  const pa=String(a).replace(/^v/,'').split('.').map(n=>parseInt(n)||0);
  const pb=String(b).replace(/^v/,'').split('.').map(n=>parseInt(n)||0);
  for(let i=0;i<Math.max(pa.length,pb.length);i++){
    const d=(pa[i]||0)-(pb[i]||0);
    if(d)return d>0?1:-1;
  }
  return 0;
}
function isWinInstaller(){ // Electron 윈도우 설치판 = electron-updater가 자동 처리 → 배너 불필요
  try{
    const ua=navigator.userAgent||'';
    if(!/Electron/i.test(ua))return false;      // 웹 브라우저는 항상 배너
    if(!/Windows/i.test(ua))return false;       // 맥·리눅스는 배너로 안내
    return !/portable/i.test(location.href);    // portable은 자동 업데이트 불가 → 배너
  }catch(e){return false;}
}
async function checkUpdate(){ // 조용히 확인 — 실패해도 앱 동작엔 영향 없음
  if(isWinInstaller())return; // 자동 업데이트가 대신 알려줌
  try{
    const today=new Date().toISOString().slice(0,10);
    const cache=JSON.parse(localStorage.getItem('moa_upd_cache')||'null');
    let latest=null,url=null;
    if(cache&&cache.day===today&&cache.tag){ // 오늘 이미 조회함 — API는 생략하되 '판단'은 매번 (버전이 바뀌었을 수 있음)
      latest=cache.tag;url=cache.url;
    }else{
      const r=await fetch(`https://api.github.com/repos/${REPO}/releases/latest`,{headers:{'Accept':'application/vnd.github+json'}});
      if(!r.ok)return;
      const j=await r.json();
      latest=j.tag_name||j.name;url=j.html_url;
      if(latest)localStorage.setItem('moa_upd_cache',JSON.stringify({day:today,tag:latest,url}));
    }
    if(!latest||verCmp(latest,APP_VER)<=0)return; // 최신이거나 같으면 조용히
    if(localStorage.getItem('moa_upd_hide')===String(latest))return; // 이 버전은 안 보기로 함
    $('updMsg').innerHTML=`🍓 <b>${latest}</b> ${t('나왔어요')}`;
    $('updGo').href=url||`https://github.com/${REPO}/releases/latest`;
    $('updGo').textContent=t('받으러 가기');
    $('updLater').onclick=()=>{localStorage.setItem('moa_upd_hide',String(latest));$('updBanner').style.display='none';};
    $('updBanner').style.display='flex';
  }catch(e){/* 오프라인·API 제한 — 무시 */}
}
window.moaCheckUpdate=()=>{localStorage.removeItem('moa_upd_cache');localStorage.removeItem('moa_upd_hide');return checkUpdate();}; // 수동 재확인용
setTimeout(checkUpdate,1500); // 앱 로드 후 여유 있게
function toast(msg){const el=$('spin');el.textContent=msg;el.style.display='inline';clearTimeout(toast._t);toast._t=setTimeout(()=>{el.style.display='none';el.textContent='🍓 '+t('칼선 계산 중…');},1800);}
function crc32(buf){ // PNG 청크 CRC (표준 다항식 0xEDB88320)
  let t=crc32._t;
  if(!t){t=crc32._t=new Uint32Array(256);
    for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);t[n]=c>>>0;}}
  let c=0xFFFFFFFF;
  for(let i=0;i<buf.length;i++)c=t[(c^buf[i])&0xFF]^(c>>>8);
  return (c^0xFFFFFFFF)>>>0;
}
async function pngWithDpi(blob){ // PNG에 pHYs(해상도) 청크 주입 — 캔버스 toBlob은 DPI를 안 담음
  try{
    const src=new Uint8Array(await blob.arrayBuffer());
    if(!(src[0]===0x89&&src[1]===0x50))return blob;
    const ppm=Math.round((+$('dpi').value||300)/0.0254); // px per meter
    const data=new Uint8Array(9);
    const dv=new DataView(data.buffer);
    dv.setUint32(0,ppm);dv.setUint32(4,ppm);data[8]=1; // unit=meter
    const type=new Uint8Array([0x70,0x48,0x59,0x73]); // 'pHYs'
    const body=new Uint8Array(4+9);body.set(type);body.set(data,4);
    const chunk=new Uint8Array(4+4+9+4);
    const cv=new DataView(chunk.buffer);
    cv.setUint32(0,9);chunk.set(type,4);chunk.set(data,8);
    cv.setUint32(17,crc32(body));
    // IHDR(8+25) 뒤에 삽입 — 기존 pHYs가 있으면 교체
    let ins=8+25,rm=0;
    let i=8;
    while(i+8<src.length){
      const len=(src[i]<<24|src[i+1]<<16|src[i+2]<<8|src[i+3])>>>0;
      const t2=String.fromCharCode(src[i+4],src[i+5],src[i+6],src[i+7]);
      if(t2==='pHYs'){ins=i;rm=12+len;break;}
      if(t2==='IDAT')break;
      i+=12+len;
    }
    const out=new Uint8Array(src.length-rm+chunk.length);
    out.set(src.subarray(0,ins),0);
    out.set(chunk,ins);
    out.set(src.subarray(ins+rm),ins+chunk.length);
    return new Blob([out],{type:'image/png'});
  }catch(e){return blob;}
}
function canvasBlob(c){return new Promise(res=>c.toBlob(b=>pngWithDpi(b).then(res),'image/png'));}
$('expPreview').onclick=()=>layerCanvas('preview').toBlob(b=>pngWithDpi(b).then(b2=>saveBlob(b2,'미리보기.png')),'image/png');

function loadScript(globalName,url){
  return window[globalName]?Promise.resolve(window[globalName]):new Promise((res,rej)=>{
    const s=document.createElement('script');s.src=url;
    s.onload=()=>window[globalName]?res(window[globalName]):rej(new Error(globalName+' 로드 실패'));
    s.onerror=()=>rej(new Error(globalName+' 로드 실패'));document.head.appendChild(s);});
}
function loadAgPsd(){return loadScript('agPsd','https://cdn.jsdelivr.net/npm/ag-psd/dist/bundle.js');}
function loadJSZip(){return loadScript('JSZip','https://cdn.jsdelivr.net/npm/jszip@3/dist/jszip.min.js');}
function loadJsPdf(){return window.jspdf?Promise.resolve(window.jspdf):loadScript('jspdf','https://cdn.jsdelivr.net/npm/jspdf@2/dist/jspdf.umd.min.js');}
function showExpWarn(msg){$('psdWarn').textContent=msg;$('psdWarn').style.display='block';}

$('expZip').onclick=async()=>{
  $('psdWarn').style.display='none';
  let JSZip;try{JSZip=await loadJSZip();}catch(_){showExpWarn('ZIP 모듈을 불러오지 못했어요(인터넷 필요).');return;}
  const zip=new JSZip();
  if(multiBoardMode()){await exportZipBoard(zip);return;} // 여러 아이템 한 대지
  const backingAsArtZip=keepCustomColors()&&$('whiteLayer').checked;
  for(const part of exportParts()){
    const dir=part.name?part.name+'/':''; // 별도 대지면 본체/ · 받침/ 폴더로 나눔
    const [dsg,cut,wht,prv]=withDoc(part,()=>[
      backingAsArtZip?null:layerCanvas('design'),
      layerCanvas('cut'),
      $('whiteLayer').checked?whiteLayerCanvas():null,
      layerCanvas('preview')]);
    if(dsg)zip.file(dir+'디자인.png',await canvasBlob(dsg)); // 칼선.png와 같은 좌표계 유지 (겹치면 정합)
    zip.file(dir+'칼선.png',await canvasBlob(cut));
    if(wht)zip.file(dir+(backingAsArtZip?'대지_인쇄물.png':'화이트.png'),await canvasBlob(wht));
    zip.file(dir+'미리보기.png',await canvasBlob(prv));
  }
  const blob=await zip.generateAsync({type:'blob'});
  saveBlob(blob,'굿즈_칼선.zip');
};

function customWhiteGuard(){ // 내보내기 공통: 업로드 화이트가 비어 있으면 알리고 중단
  if(!$('whiteLayer').checked||!customWhiteEmpty())return true;
  showExpWarn('⚠ '+t('직접 올린 화이트에서 불투명한 픽셀을 찾지 못했어요. 자동 화이트로 대체하지 않고 내보내기를 멈췄어요 — 파일을 다시 올리거나 ✕ 자동으로 를 눌러주세요.'));
  return false;
}
const hex2rgb=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
// PDF 한 페이지 종류를 현재 아이템(S)·현재 대지(docRect) 기준으로 그린다. kind: 'design'|'cut'|'white'
// 합본(여러 아이템 한 대지)일 때는 같은 페이지에 아이템마다 대지 원점을 옮겨가며 이 함수를 여러 번 부른다.
function pdfDrawPage(doc,kind,o){
  o=o||{};
  const R=docRect();
  const wMm=R.w/S.pxmm,hMm=R.h/S.pxmm;
  const mmx=v=>(v-R.x)/S.pxmm, mmy=v=>(v-R.y)/S.pxmm, mmr=v=>v/S.pxmm; // 대지 원점 기준
  const backingAsArt=keepCustomColors()&&$('whiteLayer').checked;
  if(kind==='design'){
    if(backingAsArt){
      doc.addImage(whiteLayerCanvas().toDataURL('image/png'),'PNG',0,0,wMm,hMm); // 대지(실제 인쇄물, 원본 색)
    }else{ // 이미지 — 페이지는 대지 크기 그대로, 오브젝트는 그림 영역만 정위치 삽입 (일러에서 그림만 선택됨)
      const dr=designRect();
      const dc2=document.createElement('canvas');dc2.width=dr.w;dc2.height=dr.h;
      dc2.getContext('2d').drawImage(layerCanvas('design'),-(dr.x-R.x),-(dr.y-R.y));
      doc.addImage(dc2.toDataURL('image/png'),'PNG',mmx(dr.x),mmy(dr.y),dr.w/S.pxmm,dr.h/S.pxmm);
    }
    return;
  }
  const cm=$('cutColorMode').value;
  const setCut=()=>{
    if(cm==='m100')doc.setDrawColor(0,1,0,0); // CMYK M100
    else if(cm==='c100')doc.setDrawColor(1,0,0,0);
    else if(cm==='k100')doc.setDrawColor(0,0,0,1);
    else{const [r2,g2,b2]=hex2rgb($('cutcol').value);doc.setDrawColor(r2,g2,b2);}
  };
  const drawLoopVec=l=>{ // 곡선 베지어로 그리기 (일러에서 매끈한 패스로 열림)
    const knots=toBezierKnots(loopForPath(l),l);if(knots.length<2)return;
    const P=k=>k.points,n=knots.length;
    const ops=[{op:'m',c:[mmx(P(knots[0])[2]),mmy(P(knots[0])[3])]}];
    for(let i=0;i<n;i++){
      const a=P(knots[i]),b=P(knots[(i+1)%n]);
      ops.push({op:'c',c:[mmx(a[4]),mmy(a[5]),mmx(b[0]),mmy(b[1]),mmx(b[2]),mmy(b[3])]});
    }
    ops.push({op:'h'});
    doc.path(ops);doc.stroke();
  };
  if(kind==='cut'){ // 칼선 — 진짜 벡터 패스 (일러스트레이터에서 패스로 열림, 재단기 사용 가능)
    doc.setLineWidth(+$('cutw').value);setCut();
    if(docWantsMain())S.loops.forEach(drawLoopVec);
    if(docWantsBase())S.baseLoops.forEach(drawLoopVec);
    if(hasHole()&&docWantsMain()){const hr=mmr(px((+$('hd').value)/2));for(const h of S.holes)doc.circle(mmx(h.x),mmy(h.y),hr,'S');}
    const slv=docWantsMain()?shapeLoop():null;
    if(slv){const [sr,sg,sb]=hex2rgb($('shapeCol').value);doc.setDrawColor(sr,sg,sb);drawLoopVec(slv);setCut();}
    const fr=fullCutRect();if(fr)doc.rect(mmx(fr.x),mmy(fr.y),fr.w/S.pxmm,fr.h/S.pxmm,'S'); // 대지 외곽 완칼
    return;
  }
  if(kind==='white'&&$('whiteLayer').checked&&!backingAsArt){ // 화이트(백판) — 단색이면 벡터 면, 그라데이션이면 농도 보존 위해 이미지
    const ic=$('whiteInkCol').value;
    const icBright=parseInt(ic.slice(1,3),16)>244&&parseInt(ic.slice(3,5),16)>244&&parseInt(ic.slice(5,7),16)>244;
    const pdfWhiteCol=(icBright&&!isStickerType())?$('whiteCol').value:ic; // 흰색이면 화면에 안 보이니 표시색으로 (스티커 배경은 인쇄색 그대로)
    const wFmt=$('whiteFormat').value;
    const wGrad=whiteHasGradient()||keepCustomColors(); // 컬러 대지도 색 보존 위해 래스터
    if(wGrad&&wFmt!=='raster'&&o.warnRaster&&!(o.warned&&o.warned.done)){toast('🎨 '+t('화이트에 농도(그라데이션) 감지 — 패스 대신 이미지로 내보냈어요'));if(o.warned)o.warned.done=true;} // B안: 래스터 폴백은 유지하되 알림
    const wl=(wGrad||wFmt==='raster')?[]:whiteVectorLoops();
    if(wl.length&&doc.path&&doc.fillEvenOdd){
      const [wr,wg,wb]=hex2rgb(pdfWhiteCol);doc.setFillColor(wr,wg,wb);
      const ops=[];
      for(const l of wl){
        const knots=withWhiteFit(()=>toBezierKnots(loopForPath(l),l)); // 화이트 단순화 설정 반영
        if(knots.length<2)continue;
        const P=k2=>k2.points,n2=knots.length;
        ops.push({op:'m',c:[mmx(P(knots[0])[2]),mmy(P(knots[0])[3])]});
        for(let i=0;i<n2;i++){
          const a=P(knots[i]),b=P(knots[(i+1)%n2]);
          ops.push({op:'c',c:[mmx(a[4]),mmy(a[5]),mmx(b[0]),mmy(b[1]),mmx(b[2]),mmy(b[3])]});
        }
        ops.push({op:'h'});
      }
      doc.path(ops);doc.fillEvenOdd();
    }else{ // 폴백: 래스터
      doc.addImage(whiteLayerCanvas(pdfWhiteCol).toDataURL('image/png'),'PNG',0,0,wMm,hMm);
    }
  }
}
$('expPdf').onclick=async()=>{
  $('psdWarn').style.display='none';
  if(!customWhiteGuard())return;
  let jspdfNS;try{jspdfNS=await loadJsPdf();}catch(_){showExpWarn('PDF 모듈을 불러오지 못했어요(인터넷 필요).');return;}
  const {jsPDF}=jspdfNS;
  if(multiBoardMode()){await exportPdfBoard(jsPDF);return;} // 여러 아이템 한 대지
  const parts=exportParts();
  const p0=parts[0];
  const doc=new jsPDF({unit:'mm',format:[p0.w/S.pxmm,p0.h/S.pxmm],orientation:p0.w>p0.h?'landscape':'portrait'});
  const backingAsArt=keepCustomColors()&&$('whiteLayer').checked; // 스티커+컬러 대지: 대지가 실제 인쇄물 — 인식용 디자인 페이지 생략
  if(backingAsArt)toast('🎨 '+t('대지가 인쇄 디자인을 대신해요 — 인식용 이미지 페이지는 뺐어요'));
  let firstPage=true;
  for(const part of parts){
    withDoc(part,()=>{
      const R=docRect();const wMm=R.w/S.pxmm,hMm=R.h/S.pxmm;
      const newPage=()=>{if(firstPage){firstPage=false;return;}doc.addPage([wMm,hMm],wMm>hMm?'landscape':'portrait');};
      newPage();pdfDrawPage(doc,'design');
      newPage();pdfDrawPage(doc,'cut');
      if($('whiteLayer').checked&&!backingAsArt){newPage();pdfDrawPage(doc,'white',{warnRaster:part===parts[0]});}
    });
  }
  saveBlob(doc.output('blob'),'굿즈_칼선.pdf');
};


// ===== 벡터 패스 내보내기 헬퍼 =====
function rdp(pts,eps){ // Ramer–Douglas–Peucker — 재단 정밀도 유지하며 점 수 축소
  if(pts.length<3)return pts;
  const keep=new Uint8Array(pts.length);keep[0]=keep[pts.length-1]=1;
  const stack=[[0,pts.length-1]];
  while(stack.length){
    const [a,b]=stack.pop();
    let dmax=0,idx=-1;
    const ax=pts[a][0],ay=pts[a][1],bx=pts[b][0],by=pts[b][1];
    const dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy)||1e-9;
    for(let i=a+1;i<b;i++){
      const d=Math.abs(dy*pts[i][0]-dx*pts[i][1]+bx*ay-by*ax)/len;
      if(d>dmax){dmax=d;idx=i;}
    }
    if(dmax>eps&&idx>0){keep[idx]=1;stack.push([a,idx],[idx,b]);}
  }
  return pts.filter((_,i)=>keep[i]);
}
function rdpClosed(pts,eps){ // 닫힌 고리: 최원점 기준으로 두 열린 사슬로 쪼개 각각 단순화 (퇴화 방지)
  if(pts.length<5)return pts.slice();
  let far=1,fd=-1;
  for(let i=1;i<pts.length;i++){const d=(pts[i][0]-pts[0][0])**2+(pts[i][1]-pts[0][1])**2;if(d>fd){fd=d;far=i;}}
  const a=pts.slice(0,far+1);
  const b=pts.slice(far);b.push(pts[0]);
  const ra=rdp(a,eps),rb=rdp(b,eps);
  return ra.slice(0,-1).concat(rb.slice(0,-1));
}
function loopForPath(l){ // 닫힌 루프 정리 + 가벼운 정돈 (앵커 수는 곡선 피팅 tol이 결정)
  const pts=(l.length>2&&l[0][0]===l[l.length-1][0]&&l[0][1]===l[l.length-1][1])?l.slice(0,-1):l.slice();
  return rdpClosed(pts,0.4);
}