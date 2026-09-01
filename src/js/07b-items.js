// ===== 아이템 목록 (다중 아이템) =====
// 캔버스 아래 아이템 칩: 고르면 setActiveItem, + 로 이미지 추가, ✕ 로 삭제, '나누기'로 한 그림 안의 여러 개체를 각각 아이템으로.
function renderItemBar(){
  const bar=$('itemBar');if(!bar)return;
  const its=project.items;
  let h='';
  its.forEach((it,i)=>{
    const on=it===S;
    h+=`<button class="item${on?' on':''}" data-i="${i}" title="${it.name}">`+
       `<canvas class="thumb" width="28" height="28" data-i="${i}"></canvas>`+
       (project.product==='assembly'||it.kind==='plate'?`<span class="kbadge ${it.kind==='plate'?'B':'A'}">${it.kind==='plate'?t('판'):t('그림')}</span>`:'')+
       `<span class="nm">${it.name}</span>`+
       (on&&its.length>1?`<span class="x" data-del="${i}" title="${t('삭제')}">✕</span>`:'')+
       `</button>`;
  });
  h+=`<button class="item add" id="itemAdd">＋ ${t('이미지 추가')}</button>`;
  const multi=its.filter(i=>i.img).length>1;
  const top=$('stageTop');
  if(top){
    const v=project.ui.view||'draft';const has=S&&S.img;
    top.style.display=has?'flex':'none';
    top.innerHTML=has?`<button class="chip${v==='draft'?' on':''}" id="viewDraft">${t('도안')}</button>`+
      `<button class="chip${v==='final'?' on':''}" id="itemFinal" title="${t('실물처럼 미리보기 — 칼선 없이 판·화이트·그림')}">👁 ${t('완성 보기')}</button>`+
      (multi?`<button class="chip${v==='board'?' on':''}" id="itemBoard">▦ ${t('전체 보기')}</button>`:'')+
      (multi&&v==='board'?`<button class="chip" id="itemAutoLayout" title="${t('끌어 옮긴 배치를 버리고 다시 자동으로')}">↺ ${t('자동 배치')}</button>`:'')+
      `<span class="sp"></span><span class="chip static">mm · ${+$('dpi').value||300}dpi</span>`:'';
  }
  if($('multiExpRow'))$('multiExpRow').style.display=multi?'block':'none';
  if(S&&S.img)h+=`<button class="item add" id="itemSplit" title="${t('한 그림 안의 여러 개체를 각각 아이템으로 나눠요')}">✂ ${t('나누기')}</button>`;
  bar.innerHTML=h;
  bar.style.display=(its.length>1||(S&&S.img))?'flex':'none';
  // 썸네일
  bar.querySelectorAll('canvas.thumb').forEach(c=>{
    const it=its[+c.dataset.i];const g=c.getContext('2d');g.clearRect(0,0,28,28);
    if(!it.img){g.fillStyle='#eee';g.fillRect(0,0,28,28);return;}
    const s=Math.min(26/it.W,26/it.H);const w=Math.max(1,it.W*s),hh=Math.max(1,it.H*s);
    try{g.drawImage(it.img,(28-w)/2,(28-hh)/2,w,hh);}catch(e){}
  });
}
document.addEventListener('click',e=>{
  const bar=$('itemBar'),top=$('stageTop');if(!(bar&&bar.contains(e.target))&&!(top&&top.contains(e.target)))return;
  if(e.target.closest('#viewDraft')){if(project.ui.view==='board')setBoardView(false);else setFinalView(false);return;}
  const del=e.target.closest('[data-del]');
  if(del){e.stopPropagation();removeItem(+del.dataset.del);renderItemBar();return;}
  if(e.target.closest('#itemAdd')){addImagesFromPicker();return;}
  if(e.target.closest('#itemSplit')){splitCurrentItem();return;}
  if(e.target.closest('#itemBoard')){setBoardView(project.ui.view!=='board');return;}
  if(e.target.closest('#itemFinal')){setFinalView(project.ui.view!=='final');return;}
  if(e.target.closest('#itemAutoLayout')){resetLayout();return;}
  const b=e.target.closest('.item[data-i]');
  if(b){setActiveItem(+b.dataset.i);if(project.ui.view==='board')renderBoard();renderItemBar();}
});

function loadImageAsync(file){return new Promise(res=>loadImage(file,res));}
// 파일 여러 개 → 아이템 여러 개. 첫 파일은 현재 아이템이 비어 있으면 거기에, 아니면 새 아이템에.
async function addImagesAsItems(files){
  files=[...files].filter(f=>f&&/^image\//.test(f.type||'')||/\.(png|jpe?g|webp|gif)$/i.test(f&&f.name||''));
  if(!files.length)return;
  for(let i=0;i<files.length;i++){
    if((S.img&&S.kind!=='plate')||i>0){const from=S;const it=addItem();it.type=from.type;it.noBase=from.noBase;it.settings=JSON.parse(JSON.stringify(from.settings));it.role=from.role;it.group=from.group;setActiveItem(project.items.indexOf(it));}
    await loadImageAsync(files[i]);
  }
  renderItemBar();
}
async function addImagesFromPicker(){const fs=await openImages(true,'goods-img');if(fs&&fs.length)addImagesAsItems(fs);}

// 현재 아이템의 그림을 연결 성분(인물 단위)으로 잘라 각각 아이템으로. 원본 아이템은 조각들로 대체된다.
function splitCurrentItem(){
  if(!S.img||!S.srcMaskData)return false;
  const {comps,labels}=personComps(S.srcMaskData); // 파편은 큰 덩어리에 흡수 → 사람이 보는 '개체' 단위
  if(comps.length<2){toast('🍓 '+t('나눌 개체가 하나뿐이에요'));return false;}
  const W=S.pW,H=S.pcH;
  const srcC=document.createElement('canvas');srcC.width=W;srcC.height=H;
  const sg=srcC.getContext('2d');sg.drawImage(S.img,S.xImg,S.yImg,S.W,S.H);
  const src=sg.getImageData(0,0,W,H);
  const settings=JSON.parse(JSON.stringify(S.settings));
  const type=S.type,noBase=S.noBase,base=project.items.indexOf(S),name=S.name;
  const made=[];
  // 큰 개체에 속하지 않은 모든 라벨(작은 파편·4mm² 미만 조각까지)을 가장 가까운 큰 개체에 붙인다 — 픽셀이 버려지지 않게
  const bigIds=new Set(comps.map(c=>c.id));
  const lbb=new Map(); // label → bbox
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const l=labels[y*W+x];if(!l||bigIds.has(l))continue;let b=lbb.get(l);if(!b){b={minX:x,minY:y,maxX:x,maxY:y};lbb.set(l,b);}else{if(x<b.minX)b.minX=x;if(x>b.maxX)b.maxX=x;if(y<b.minY)b.minY=y;if(y>b.maxY)b.maxY=y;}}
  const own=new Map(comps.map(c=>[c.id,new Set([c.id])]));
  for(const [l,b] of lbb){
    const cx=(b.minX+b.maxX)/2,cy=(b.minY+b.maxY)/2;let best=comps[0],bd=1e18;
    for(const c of comps){const dx=Math.max(c.minX-cx,0,cx-c.maxX),dy=Math.max(c.minY-cy,0,cy-c.maxY);const d=dx*dx+dy*dy;if(d<bd){bd=d;best=c;}}
    own.get(best.id).add(l);best.minX=Math.min(best.minX,b.minX);best.maxX=Math.max(best.maxX,b.maxX);best.minY=Math.min(best.minY,b.minY);best.maxY=Math.max(best.maxY,b.maxY);
  }
  comps.forEach((c,k)=>{
    const pad=2;const x0=Math.max(0,c.minX-pad),y0=Math.max(0,c.minY-pad),x1=Math.min(W-1,c.maxX+pad),y1=Math.min(H-1,c.maxY+pad);
    const cw=x1-x0+1,ch=y1-y0+1;
    const out=sg.createImageData(cw,ch);const d=out.data,s=src.data;const mine=own.get(c.id);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const lab=labels[y*W+x];if(!lab||!mine.has(lab))continue;
      const si=(y*W+x)*4,di=((y-y0)*cw+(x-x0))*4;
      d[di]=s[si];d[di+1]=s[si+1];d[di+2]=s[si+2];d[di+3]=s[si+3];
    }
    const cv=document.createElement('canvas');cv.width=cw;cv.height=ch;cv.getContext('2d').putImageData(out,0,0);
    const it=newItem(`${name.replace(/\.[^.]+$/,'')}-${k+1}`);
    it.settings=JSON.parse(JSON.stringify(settings));it.type=type;it.noBase=noBase;it.group=S.group;
    it.imgOrig=cv;it.oW=cw;it.oH=ch;it.rot=0;it.img=cv;it.W=cw;it.H=ch;it.pxmm=S.pxmm;
    project.items.splice(base+1+k,0,it);made.push(it);
  });
  project.items.splice(base,1);
  S=null;
  for(let k=made.length-1;k>=0;k--)setActiveItem(project.items.indexOf(made[k])); // 뒤에서부터 계산해 마지막에 첫 조각이 활성
  toast('✂ '+t('개체')+' '+made.length+t('개로 나눴어요'));
  renderItemBar();
  return true;
}
