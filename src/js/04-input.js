// ===== 입력 =====
async function openImages(multiple,pickerId){ // 새 파일 선택기 — 마지막으로 연 폴더를 브라우저가 기억
  if(window.showOpenFilePicker){
    try{
      const hs=await showOpenFilePicker({id:pickerId,multiple,types:[{description:'Images',accept:{'image/*':['.png','.jpg','.jpeg','.webp','.gif']}}]});
      return Promise.all(hs.map(h=>h.getFile()));
    }catch(err){return null;} // 취소
  }
  return new Promise(res=>{ // 폴백(Android·iOS·Firefox·Safari): 선택기별 전용 input — 본체/화이트/받침이 한 input을 공유하면 같은 파일 재선택 시 change가 안 떠서 조용히 무시됨
    let inp=document.getElementById('fb_'+pickerId);
    if(!inp){inp=document.createElement('input');inp.type='file';inp.id='fb_'+pickerId;inp.accept='image/*';inp.hidden=true;inp.multiple=!!multiple;document.body.appendChild(inp);}
    inp.value=''; // 이전 선택 지우기 → 같은 파일을 다시 골라도 change 발생
    inp.onchange=e=>{const fs=[...e.target.files];e.target.value='';res(fs);};
    inp.click();
  });
}
$('pick').onclick=$('drop').onclick=async()=>{const fs=await openImages(true,'goods-img');if(fs&&fs.length)addImagesAsItems(fs);}; // 여러 장 → 아이템 여러 개
$('file').onchange=e=>{if(e.target.files[0])loadImage(e.target.files[0]);};
['dragenter','dragover'].forEach(ev=>$('drop').addEventListener(ev,e=>{e.preventDefault();$('drop').classList.add('hover');}));
['dragleave','drop'].forEach(ev=>$('drop').addEventListener(ev,e=>{e.preventDefault();$('drop').classList.remove('hover');}));
$('drop').addEventListener('drop',e=>{const fs=e.dataTransfer.files;if(fs&&fs.length)addImagesAsItems(fs);});

// PNG pHYs / JPEG JFIF 밀도 파싱 — 각 포맷 공개 스펙 기준 직접 구현
async function detectDpi(file){ // PNG pHYs / JPEG JFIF에서 저장된 DPI 읽기 (클립스튜디오 등 원고 해상도 자동 반영)
  try{
    const buf=new Uint8Array(await file.arrayBuffer());
    if(buf[0]===0x89&&buf[1]===0x50){ // PNG
      let i=8;
      while(i+8<buf.length){
        const len=(buf[i]<<24|buf[i+1]<<16|buf[i+2]<<8|buf[i+3])>>>0;
        const type=String.fromCharCode(buf[i+4],buf[i+5],buf[i+6],buf[i+7]);
        if(type==='pHYs'&&len>=9){
          const ppuX=(buf[i+8]<<24|buf[i+9]<<16|buf[i+10]<<8|buf[i+11])>>>0;
          const unit=buf[i+16];
          if(unit===1&&ppuX>0)return Math.round(ppuX*0.0254);
          return null;
        }
        if(type==='IDAT')break;
        i+=12+len;
      }
    }else if(buf[0]===0xFF&&buf[1]===0xD8){ // JPEG JFIF
      let i=2;
      while(i+4<buf.length){
        if(buf[i]!==0xFF)break;
        const m=buf[i+1],len=(buf[i+2]<<8|buf[i+3]);
        if(m===0xE0&&len>=16&&String.fromCharCode(buf[i+4],buf[i+5],buf[i+6],buf[i+7])==='JFIF'){
          const unit=buf[i+11],dx=(buf[i+12]<<8|buf[i+13]);
          if(unit===1&&dx>0)return dx;
          if(unit===2&&dx>0)return Math.round(dx*2.54);
          return null;
        }
        if(m===0xDA)break;
        i+=2+len;
      }
    }
  }catch(e){}
  return null;
}
function loadImage(file,done){ // done: 계산까지 끝난 뒤 호출 (여러 장 순차 로드용 — 그때는 지연 recompute 대신 즉시 계산)
  S.name=(file&&file.name)||S.name;
  detectDpi(file).then(d=>{
    if(d&&d>=72&&d<=1200&&+$('dpi').value!==d){
      $('dpi').value=d;S.dpiDetected=d;
      if(S.img){presetSizes();recompute(true);}
    }else if(d)S.dpiDetected=d;
  });
  const img=new Image();img.onload=()=>{
  if(S.kind==='plate'&&S.plate){S.plate.art=img;rebuildPlate(S);computeCore(true);fitAndRender();updateInfo();renderPlatePanel();renderItemBar();if(done)done();return;} // 판형: 판에 넣는 그림
  S.rot=0;setRotUI();setArtSource(img,img.naturalWidth,img.naturalHeight);S.holeOffs={};S.earOffs={};S.selKind=null;S.selSet=new Set();S.customWhite=null;$('whiteUpRow').style.display='none';$('whiteUpRow').classList.add('hide');
  S.tabOffs={};S.imgOffX=0;S.imgOffY=0;S.shapePlaced=false;
  if(S.moveTabMode){S.moveTabMode=false;setTabBtnUI();}
  $('drop').style.display='none';view.style.display='block';$('stageInfo').style.display='block';$('sizeInfo').style.display='block';$('sizeCtrl').style.display='block';
  ['expPsd','expZip','expPdf','expSvg','expPreview','batchPick'].forEach(id=>$(id).disabled=false);
  presetSizes();
  if(done){clearTimeout(timer);S._srcStamp=(S._srcStamp||0)+1;computeCore(true);$('spin').style.display='none';fitAndRender();updateInfo();renderItemBar();done();}
  else{recompute(true);renderItemBar();}
  if(typeof goStep==='function')goStep(project.ui.step||2); // 잠금 해제·레일 갱신
};img.src=URL.createObjectURL(file);}

function applyRotation(){ // 원본을 회전시켜 S.img로 굽는다. 이후 파이프라인(마스크·칼선·화이트·내보내기)은 회전을 몰라도 된다.
  if(!S.imgOrig){S.img=null;return;}
  const bump=()=>{S._srcStamp=(S._srcStamp||0)+1;S._maskCache=null;S._whitePrevC=null;};
  const a=((+S.rot||0)%360+360)%360;
  if(a===0){S.img=S.imgOrig;S.W=S.oW;S.H=S.oH;bump();return;}
  const oW=S.oW,oH=S.oH,r=a*Math.PI/180;
  const quarter=(a%90===0)?Math.round(a/90):0;   // 1·2·3 = 90·180·270°
  const W=quarter?((quarter%2)?oH:oW):Math.max(1,Math.round(oW*Math.abs(Math.cos(r))+oH*Math.abs(Math.sin(r))));
  const H=quarter?((quarter%2)?oW:oH):Math.max(1,Math.round(oW*Math.abs(Math.sin(r))+oH*Math.abs(Math.cos(r))));
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const cx=cv.getContext('2d');
  cx.imageSmoothingEnabled=true;cx.imageSmoothingQuality='high';
  // 직각 회전은 정수 변환으로 — 보간이 아예 일어나지 않아 외곽이 원본과 픽셀 단위로 동일하다
  if(quarter===1)cx.setTransform(0,1,-1,0,oH,0);
  else if(quarter===2)cx.setTransform(-1,0,0,-1,oW,oH);
  else if(quarter===3)cx.setTransform(0,-1,1,0,0,oW);
  else{cx.translate(W/2,H/2);cx.rotate(r);cx.translate(-oW/2,-oH/2);}
  cx.drawImage(S.imgOrig,0,0);
  S.img=cv;S.W=W;S.H=H;bump();
}
function setRotUI(){const v=+S.rot||0;$('rot').value=v;$('rotSl').value=v;}
function setRot(v,live){
  let a=+v; if(!isFinite(a))a=0;
  a=Math.max(-180,Math.min(180,Math.round(a*2)/2));
  S.rot=a; setRotUI();
  if(!S.imgOrig)return;
  applyRotation(); presetSizes(); recompute(true,live?90:30);
}
function setArtSource(img,w,h){ // 원본 교체 (회전 각도는 유지)
  S.imgOrig=img;S.oW=w;S.oH=h;applyRotation();
}
function presetSizes(){
  S.pxmm=(+$('dpi').value||300)/25.4;
  const wmm=tomm(S.W);
  $('baseW').value=Math.round(Math.min(140,Math.max(15,wmm*0.55)));
  $('tabW').value=Math.round(Math.min(60,Math.max(8,wmm*0.22)));
}
