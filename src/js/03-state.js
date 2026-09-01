// ===== 상태 =====
// 2.0 데이터 모델 (DESIGN_2.0.md §3). 2단계: 아이템 1개만 쓰지만 구조는 N개.
//   project  — 문서 하나. 제품·종류·대지(공용 설정)·아이템 목록·선택·UI 상태
//   Item     — 지금까지 전역 S가 들고 있던 것 전부(원본·마스크·루프·오프셋) + settings(패널 값)
//   S        — '현재 아이템' 바인딩. 기존 코드는 S.xxx 를 그대로 쓰고, 아이템을 바꾸면 S 가 가리키는 대상만 바뀐다.
//              (Proxy 대신 let 바인딩: 픽셀 루프 안의 S.pW 접근에 오버헤드가 없어야 해서)
let _itemSeq=0;
function newItem(name){
  return {
    id:'it'+(++_itemSeq),name:name||('아이템 '+_itemSeq),
    kind:'art',            // 'art' 그림형 | 'plate' 판형 (3단계부터)
    role:'body',
    settings:{},           // 패널 컨트롤 값 (id → value). syncSettingsFromDOM / applySettingsToDOM 로 DOM과 오간다
    placement:{x:0,y:0,rot:0},
    links:[],
    // ---- 아래는 기존 S 필드 그대로 (원본·계산 결과·조작 상태) ----
    img:null,W:0,H:0,type:'ring_hole',pad:0,pW:0,pcH:0,pH:0,xImg:0,yImg:0,
    loops:[],baseLoops:[],rawBbox:null,pxmm:300/25.4,scale:1,mainMaskData:null,artMaskData:null,srcImageData:null,moveImgMode:false,
    imgOffX:0,imgOffY:0,tabOffs:{},moveTabMode:false,tabConnectOK:true,standComps:null,korottoComps:null,rolyInfo:null,imgOrig:null,oW:0,oH:0,rot:0,baseArt:null,noBase:false,baseImg:null,baseUp:null,
    shapeX:0,shapeY:0,shapePlaced:false,moveShapeMode:false,
    holes:[],holeOffs:{},earOffs:{},dragging:null,selKind:null,selSet:new Set(),customWhite:null,slotOffs:{},anchorMin:false,
  };
}
const project={
  version:2,
  product:null,kind:null,     // 위자드(4단계)에서 채움
  sheet:{},                   // 공용 설정 (dpi·대지 크기·PSD/칼선 색 모드 …) — PROJECT_SETTING_IDS
  items:[],selection:[],
  ui:{step:1,view:'draft'},
};
let S=null;
function addItem(name){const it=newItem(name);project.items.push(it);if(!S){S=it;project.selection=[it.id];}return it;}
function activeIndex(){return project.items.indexOf(S);}
addItem('그림 1');

const $=id=>document.getElementById(id);
const view=$('view'),vctx=view.getContext('2d');
const px=mm=>mm*S.pxmm, tomm=p=>p/S.pxmm;

// ---- 설정 동기화: 패널 컨트롤 ↔ item.settings / project.sheet ----
// 계산 코드는 아직 $('id').value 로 DOM을 직접 읽는다(3단계에서 settings 직접 읽기로 전환).
// 그동안은 DOM이 '현재 아이템의 뷰'가 되도록, 값이 바뀔 때 저장하고 아이템을 바꿀 때 되돌려 쓴다.
const PROJECT_SETTING_IDS=new Set(['langSel','dpi','dpiPreset','boardOn','boardW','boardH','psdColorMode','cutColorMode']);
const NON_SETTING_IDS=new Set(['file','batchFiles','baseImgFile','whiteFile','mShapeKind','mShapeW','mShapeH']); // 파일 입력·모달 임시값
function settingControls(){
  return [...document.querySelectorAll('input[id],select[id]')].filter(el=>!NON_SETTING_IDS.has(el.id)&&el.type!=='file');
}
function readCtl(el){return el.type==='checkbox'?el.checked:el.value;}
function writeCtl(el,v){if(el.type==='checkbox')el.checked=!!v;else el.value=v;}
function settingBag(id){return PROJECT_SETTING_IDS.has(id)?project.sheet:S.settings;}
function syncSettingsFromDOM(it){for(const el of settingControls()){(PROJECT_SETTING_IDS.has(el.id)?project.sheet:(it||S).settings)[el.id]=readCtl(el);}}
function applySettingsToDOM(it){for(const el of settingControls()){const bag=PROJECT_SETTING_IDS.has(el.id)?project.sheet:(it||S).settings;if(el.id in bag)writeCtl(el,bag[el.id]);}}
// 컨트롤이 바뀔 때마다 저장 (캡처 단계라 기존 oninput/onchange 핸들러보다 먼저 돈다)
for(const ev of ['input','change'])document.addEventListener(ev,e=>{const el=e.target;if(!el||!el.id||NON_SETTING_IDS.has(el.id)||el.type==='file')return;if(el.tagName==='INPUT'||el.tagName==='SELECT')settingBag(el.id)[el.id]=readCtl(el);},true);

// 아이템 전환: 현재 패널 값을 저장 → S 바꿈 → 그 아이템 값을 패널에 → 타입 UI·미리보기 갱신
function setActiveItem(i){
  const it=typeof i==='number'?project.items[i]:project.items.find(x=>x.id===i);
  if(!it||it===S)return;
  if(S)syncSettingsFromDOM(S);
  S=it;project.selection=[it.id];
  applySettingsToDOM(S);
  syncSettingsFromDOM(S); // 아직 값이 없던 항목은 지금 패널 값을 물려받아 확정 (다음 전환부터 흔들리지 않게)
  syncTypeButtons();
  if(typeof applyType==='function')applyType();
  if(typeof setRotUI==='function')setRotUI();
  showStage(!!S.img);
  if(typeof ensurePlateFresh==='function'&&ensurePlateFresh(S)){}
  if(S.img){computeCore(false);fitAndRender();updateInfo();}
  if(typeof renderItemBar==='function')renderItemBar();
  if(typeof renderRail==='function')renderRail();
  if(typeof renderPlatePanel==='function')renderPlatePanel();
}
function showStage(on){ // 이미지 있는 아이템이면 캔버스, 없으면 드롭존 (loadImage 의 표시 전환과 같은 요소들)
  $('drop').style.display=on?'none':'';view.style.display=on?'block':'none';
  for(const id of ['stageInfo','sizeInfo','sizeCtrl'])if($(id))$(id).style.display=on?'block':'none';
}
function syncTypeButtons(){ // 타입 버튼 하이라이트를 S.type/S.noBase 에 맞춤
  const tb=$('types');if(!tb)return;
  [...tb.children].forEach(b=>b.classList.toggle('on',b.dataset&&b.dataset.t===S.type&&((b.dataset.nb==='1')===!!S.noBase)));
}
function removeItem(i){
  if(project.items.length<=1)return;
  const idx=typeof i==='number'?i:project.items.findIndex(x=>x.id===i);
  if(idx<0)return;
  const wasActive=project.items[idx]===S;
  project.items.splice(idx,1);
  if(wasActive){S=null;setActiveItem(Math.max(0,idx-1));}
}
