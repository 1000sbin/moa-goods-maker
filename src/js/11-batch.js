// ===== 일괄 처리 =====
function loadImageFile(file){return new Promise((res,rej)=>{
  const img=new Image();img.onload=()=>res(img);img.onerror=rej;img.src=URL.createObjectURL(file);});}
function safeName(name){return name.replace(/\.[^.]+$/,'').replace(/[\\/:*?"<>|]/g,'_');}
$('batchPick').onclick=async()=>{const fs=await openImages(true,'goods-batch');if(fs&&fs.length)runBatch(fs);};
$('batchFiles').onchange=e=>{const files=[...e.target.files];e.target.value='';if(files.length)runBatch(files);};
async function runBatch(files){
  if(!files.length)return;
  let JSZip;try{JSZip=await loadJSZip();}catch(_){showExpWarn('ZIP 모듈을 불러오지 못했어요(인터넷 필요).');return;}
  const st=$('batchStatus');st.style.display='block';
  // 현재 상태 백업
  const bak={imgOrig:S.imgOrig,oW:S.oW,oH:S.oH,imgOffX:S.imgOffX,imgOffY:S.imgOffY,tabOffs:S.tabOffs,
    holeOffs:S.holeOffs,earOffs:S.earOffs};
  const zip=new JSZip();
  const withWhite=$('whiteLayer').checked;
  for(let i=0;i<files.length;i++){
    st.innerHTML=`처리 중… <b>${i+1} / ${files.length}</b> (${files[i].name})`;
    await new Promise(r=>setTimeout(r,20)); // UI 갱신 틈
    try{
      const img=await loadImageFile(files[i]);
      setArtSource(img,img.naturalWidth,img.naturalHeight); // 회전 각도는 전체에 공통 적용
      S.imgOffX=0;S.imgOffY=0;S.tabOffs={};S.holeOffs={};S.earOffs={};
      computeCore(true);
      const folder=zip.folder(safeName(files[i].name));
      folder.file('디자인.png',await canvasBlob(layerCanvas('design')));
      folder.file('칼선.png',await canvasBlob(layerCanvas('cut')));
      folder.file('칼선.svg',buildSvgString());
      if(withWhite)folder.file('화이트.png',await canvasBlob(whiteLayerCanvas()));
      folder.file('미리보기.png',await canvasBlob(layerCanvas('preview')));
    }catch(err){
      zip.file(safeName(files[i].name)+'_오류.txt','처리 실패: '+err.message);
    }
  }
  st.innerHTML='ZIP 압축 중…';
  const blob=await zip.generateAsync({type:'blob'});
  saveBlob(blob,'굿즈_일괄.zip');
  // 원래 이미지 상태 복원
  S.imgOrig=bak.imgOrig;S.oW=bak.oW;S.oH=bak.oH;applyRotation();
  S.imgOffX=bak.imgOffX;S.imgOffY=bak.imgOffY;
  S.tabOffs=bak.tabOffs;S.holeOffs=bak.holeOffs;S.earOffs=bak.earOffs;
  if(S.img){computeCore(false);fitAndRender();updateInfo();}
  st.innerHTML=`완료! <b>${files.length}장</b> 처리됨 · ZIP 다운로드가 시작됐어요.`;
};

