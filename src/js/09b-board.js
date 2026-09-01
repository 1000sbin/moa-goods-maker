// ===== 대지 배치 (여러 아이템 한 대지) =====
// 아이템 여러 개를 한 장의 대지에 배치해 미리보고(전체 보기) 한 파일로 내보낸다.
// 좌표계: 각 아이템의 자기 대지(pW×pH, 0,0 원점)를 대지 위 placement.x/y 만큼 옮겨 놓는다.
// 기존 내보내기 코드는 docRect() 기준으로 그리므로, 대지 원점을 -placement 로 둔 boardDoc 을 withDoc 에 넣으면
// 아이템 하나 그리는 코드가 그대로 '대지 위 제자리'에 그려진다.

function multiBoardMode(){return project.items.filter(i=>i.img).length>1&&$('multiExp')&&$('multiExp').value==='board';}
function boardGapPx(){return Math.round(px(Math.max(0,+($('boardGap')&&$('boardGap').value)||3)));}
function itemsWithImg(){return project.items.filter(i=>i.img&&i.pW>0);}

// 다른 아이템을 현재 아이템처럼 다루기: 패널 값(DOM)까지 그 아이템 것으로 바꿨다가 되돌린다.
// (계산·내보내기 코드가 아직 $('id') 로 설정을 읽기 때문)
function withItem(it,fn){
  const prev=S;if(it===prev)return fn();
  syncSettingsFromDOM(prev);
  S=it;applySettingsToDOM(it);
  if(typeof ensurePlateFresh==='function')ensurePlateFresh(it);
  try{return fn();}
  finally{S=prev;applySettingsToDOM(prev);}
}

// 자동 배치: 높은 것부터 선반(shelf) 채우기. 대지 크기 고정이면 그 폭에 맞추고, 아니면 대략 정사각이 되게 폭을 잡는다.
function autoLayout(){
  const its=itemsWithImg();if(!its.length)return {w:0,h:0};
  const gap=boardGapPx();
  const fixed=$('boardOn')&&$('boardOn').checked&&+$('boardW').value>=10&&+$('boardH').value>=10;
  let BW;
  if(fixed)BW=Math.round(px(+$('boardW').value));
  else{
    const area=its.reduce((a,i)=>a+(i.pW+gap)*(i.pH+gap),0);
    BW=Math.max(Math.ceil(Math.sqrt(area)*1.15),Math.max.apply(null,its.map(i=>i.pW))+gap*2);
  }
  if(project.sheet.manual&&!(project.sheet.board&&project.sheet.board.fixed!==fixed)){ // 손으로 옮긴 배치는 유지, 대지는 내용에 맞춤
    const mx=Math.max.apply(null,its.map(i=>i.placement.x+i.pW))+gap,my=Math.max.apply(null,its.map(i=>i.placement.y+i.pH))+gap;
    project.sheet.board={w:fixed?BW:Math.round(mx),h:fixed?Math.round(px(+$('boardH').value)):Math.round(my),fixed};
    return project.sheet.board;
  }
  const order=its.slice().sort((a,b)=>b.pH-a.pH);
  let x=gap,y=gap,rowH=0,maxX=0;
  for(const it of order){
    if(x+it.pW+gap>BW&&x>gap){x=gap;y+=rowH+gap;rowH=0;}
    it.placement.x=Math.round(x);it.placement.y=Math.round(y);
    x+=it.pW+gap;rowH=Math.max(rowH,it.pH);maxX=Math.max(maxX,x);
  }
  const BH=fixed?Math.round(px(+$('boardH').value)):Math.round(y+rowH+gap);
  project.sheet.board={w:Math.round(fixed?BW:maxX),h:BH,fixed};
  return project.sheet.board;
}
function boardSize(){return project.sheet.board||autoLayout();}
function boardDoc(it){const B=boardSize();return {x:-it.placement.x,y:-it.placement.y,w:B.w,h:B.h,part:'all',name:''};}
function boardOverflow(){ // 고정 대지에서 밖으로 나가는 아이템
  const B=boardSize();return itemsWithImg().filter(i=>i.placement.x+i.pW>B.w||i.placement.y+i.pH>B.h);
}

// ---- 전체 보기 (미리보기) ----
function renderBoard(){
  const B=autoLayout();if(!B.w){return;}
  const maxW=Math.min(view.parentElement.clientWidth-4,900);
  const sc=Math.min(1,maxW/B.w,700/B.h);
  view.width=Math.round(B.w*sc);view.height=Math.round(B.h*sc);
  vctx.setTransform(1,0,0,1,0,0);vctx.clearRect(0,0,view.width,view.height);
  vctx.fillStyle='#fff';vctx.fillRect(0,0,view.width,view.height);
  vctx.strokeStyle='#bbb';vctx.setLineDash([6,4]);vctx.strokeRect(0.5,0.5,view.width-1,view.height-1);vctx.setLineDash([]);
  const over=new Set(boardOverflow());
  for(const it of itemsWithImg()){
    withItem(it,()=>{
      const c=withDoc({x:0,y:0,w:S.pW,h:S.pH,part:'all',name:''},()=>layerCanvas('preview'));
      vctx.drawImage(c,it.placement.x*sc,it.placement.y*sc,S.pW*sc,S.pH*sc);
    });
    if(it===S||over.has(it)){
      vctx.strokeStyle=over.has(it)?'#ff2d55':'var(--pink-deep)';vctx.lineWidth=over.has(it)?2:1;
      vctx.setLineDash([4,3]);vctx.strokeRect(it.placement.x*sc+0.5,it.placement.y*sc+0.5,it.pW*sc-1,it.pH*sc-1);vctx.setLineDash([]);
    }
  }
  const info=$('stageInfo');
  if(info)info.innerHTML=`${t('전체 보기')} · ${t('대지')} ${tomm(B.w).toFixed(0)}×${tomm(B.h).toFixed(0)}mm · ${itemsWithImg().length}${t('개')}`+(over.size?` · <b style="color:#ff2d55">⚠ ${over.size}${t('개가 대지 밖으로 나가요')}</b>`:'');
}
function resetLayout(){project.sheet.manual=false;autoLayout();renderBoard();}
function setBoardView(on){
  project.ui.view=on?'board':'draft';
  if(on)renderBoard();else if(S.img){fitAndRender();updateInfo();}
  renderItemBar();
}

// ---- 합본 내보내기 ----
// 대지 크기 캔버스에 아이템별 레이어를 겹친다.
function boardLayerCanvas(kind){ // kind: 'design'|'cut'|'preview'|'white'
  const B=boardSize();
  const out=document.createElement('canvas');out.width=B.w;out.height=B.h;const g=out.getContext('2d');
  for(const it of itemsWithImg()){
    withItem(it,()=>withDoc(boardDoc(it),()=>{
      const c=kind==='white'?($('whiteLayer').checked?whiteLayerCanvas():null):layerCanvas(kind);
      if(c)g.drawImage(c,0,0);
    }));
  }
  return out;
}
async function exportZipBoard(zip){
  autoLayout();
  const withWhite=itemsWithImg().some(it=>withItem(it,()=>$('whiteLayer').checked));
  zip.file('디자인.png',await canvasBlob(boardLayerCanvas('design')));
  zip.file('칼선.png',await canvasBlob(boardLayerCanvas('cut')));
  if(withWhite)zip.file('화이트.png',await canvasBlob(boardLayerCanvas('white')));
  zip.file('미리보기.png',await canvasBlob(boardLayerCanvas('preview')));
  const blob=await zip.generateAsync({type:'blob'});
  saveBlob(blob,'굿즈_대지.zip');
}
async function exportPdfBoard(jsPDF){
  const B=autoLayout();
  const wMm=B.w/S.pxmm,hMm=B.h/S.pxmm;
  const doc=new jsPDF({unit:'mm',format:[wMm,hMm],orientation:wMm>hMm?'landscape':'portrait'});
  const its=itemsWithImg();
  const anyWhite=its.some(it=>withItem(it,()=>$('whiteLayer').checked&&!(keepCustomColors())));
  const pages=['design','cut'].concat(anyWhite?['white']:[]);const warned={done:false};
  pages.forEach((kind,pi)=>{
    if(pi>0)doc.addPage([wMm,hMm],wMm>hMm?'landscape':'portrait');
    its.forEach((it,ii)=>withItem(it,()=>withDoc(boardDoc(it),()=>pdfDrawPage(doc,kind,{warnRaster:true,warned}))));
  });
  saveBlob(doc.output('blob'),'굿즈_대지.pdf');
}
function exportSvgBoard(){
  const B=autoLayout();const col=$('cutcol').value;
  let body='';
  for(const it of itemsWithImg()){
    body+=withItem(it,()=>`<g id="${it.id}" transform="translate(${it.placement.x} ${it.placement.y})">\n${withDoc({x:0,y:0,w:S.pW,h:S.pH,part:'all',name:''},()=>svgPaths())}</g>\n`);
  }
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${B.w}" height="${B.h}" viewBox="0 0 ${B.w} ${B.h}">\n<!-- 칼선(cut) stroke=${col} → 인쇄소 별색으로 교체. 단위 px = 1/${(+$('dpi').value||300)} inch -->\n${body}</svg>`;
  saveBlob(new Blob([svg],{type:'image/svg+xml'}),'굿즈_대지.svg');
}
function exportPsdBoard(agPsd){
  const B=autoLayout();const its=itemsWithImg();
  const dpiV=+$('dpi').value||300;
  const design=boardLayerCanvas('design').getContext('2d').getImageData(0,0,B.w,B.h);
  const cut=boardLayerCanvas('cut').getContext('2d').getImageData(0,0,B.w,B.h);
  const anyWhite=its.some(it=>withItem(it,()=>$('whiteLayer').checked));
  const white=anyWhite?boardLayerCanvas('white').getContext('2d').getImageData(0,0,B.w,B.h):null;
  if($('psdColorMode').value==='cmyk'){
    const layersC=[{name:'디자인',left:0,top:0,imageData:design},{name:'칼선',left:0,top:0,imageData:cut}];
    if(white)layersC.push({name:'화이트',left:0,top:0,imageData:white});
    const bufC=writeCmykPsd({width:B.w,height:B.h,dpi:dpiV,layers:layersC});
    saveBlob(new Blob([bufC],{type:'image/vnd.adobe.photoshop'}),'굿즈_대지_CMYK.psd');return;
  }
  const emptyPx={width:1,height:1,data:new Uint8ClampedArray(4)};
  let cutPaths=[],whitePaths=[];
  for(const it of its)withItem(it,()=>withDoc(boardDoc(it),()=>{
    cutPaths=cutPaths.concat(buildCutBezierPaths());
    const slp=shapeLoop();const R=docRect();
    if(slp)cutPaths.push(shiftPath(loopToBezierPath(slp),R.x,R.y));
    if($('whiteLayer').checked&&!(whiteHasGradient()||keepCustomColors()||$('whiteFormat').value==='raster')){
      const wl=whiteVectorLoops();whitePaths=whitePaths.concat(withWhiteFit(()=>wl.map(l=>shiftPath(loopToBezierPath(l),R.x,R.y))));
    }
  }));
  const children=[{name:'칼선 패스 (벡터)',imageData:emptyPx,vectorMask:{paths:cutPaths}},{name:'칼선',imageData:cut}];
  if(white){if(whitePaths.length)children.unshift({name:'화이트 패스 (벡터)',imageData:emptyPx,vectorMask:{paths:whitePaths}});children.push({name:'화이트',imageData:white});}
  children.push({name:'디자인',imageData:design});
  const psd={width:B.w,height:B.h,children,imageResources:{resolutionInfo:{horizontalResolution:dpiV,horizontalResolutionUnit:'PPI',widthUnit:'Millimeters',verticalResolution:dpiV,verticalResolutionUnit:'PPI',heightUnit:'Millimeters'}}};
  try{const buf=agPsd.writePsd(psd);saveBlob(new Blob([buf],{type:'image/vnd.adobe.photoshop'}),'굿즈_대지.psd');}
  catch(err){showExpWarn('PSD 생성 중 오류: '+err.message);}
}

function boardPick(e){ // 전체 보기에서 클릭한 자리의 아이템을 활성으로
  const B=boardSize();const r=view.getBoundingClientRect();const sc=view.width/B.w;
  const x=(e.clientX-r.left)/sc,y=(e.clientY-r.top)/sc;
  const hit=itemsWithImg().slice().reverse().find(it=>x>=it.placement.x&&x<=it.placement.x+it.pW&&y>=it.placement.y&&y<=it.placement.y+it.pH);
  if(hit&&hit!==S){setActiveItem(project.items.indexOf(hit));renderBoard();renderItemBar();}
}
