// ===== 위자드 (6단계) =====
// 기존 패널의 그룹들을 단계 페이지로 옮겨 담는다(핸들러·id 그대로). 단계는 자유 이동, 이미지 전엔 3단계부터 잠김.
//   1 제품 → 2 종류·이미지 → 3 칼선 → 4 부품(스티커 없음) → 5 화이트/배경 → 6 저장
const WIZ_STEPS=[
  {n:1,t:'제품',s:'스티커 / 아크릴 / 조립'},
  {n:2,t:'종류 · 이미지',s:'굿즈 종류와 그림'},
  {n:3,t:'칼선',s:'여백 · 둥글리기'},
  {n:4,t:'부품',s:'타공 · 촉 · 도형'},
  {n:5,t:'화이트',s:'백판 · 배경'},
  {n:6,t:'저장',s:'PDF · PSD · SVG'},
];
const PRODUCT_TYPES={sticker:['sticker','sheet'],acrylic:['ring_hole','ring_tab','stand','stand_nb','korotto','acrylic'],assembly:[]};
function typeKey(b){return b.dataset.t+(b.dataset.nb==='1'?'_nb':'');}

function buildWizard(){
  const panel=$('panelLeft');if(!panel||$('rail'))return;
  // 그룹 찾기 (id 기준 — 마크업 순서가 바뀌어도 안전)
  const G=id=>{const el=$(id);return el?el.closest('.grp'):null;};
  const groups={
    image:G('file'),types:G('types'),
    cut:G('offset'),detect:G('bgmode'),tidy:G('gapClose'),
    hole:$('holeGroup'),korotto:G('korottoMode'),stand:G('tabW'),shape:$('shapeGroup'),
    white:G('whiteLayer'),exp:G('expPdf'),batch:G('batchPick'),
  };
  // 단계 페이지
  const pages={};
  for(const st of WIZ_STEPS){const d=document.createElement('div');d.className='step-page';d.id='step'+st.n;pages[st.n]=d;}
  // 1 제품
  const ko=(k)=>`<span data-ko="${k}">${t(k)}</span>`;
  pages[1].innerHTML=`<div class="grp"><h3>${ko('무엇을 만들까요?')}</h3>
    <div class="products" id="products">
      <button data-p="sticker"><b>✄</b>${ko('스티커')}</button>
      <button data-p="acrylic"><b>◇</b>${ko('아크릴')}</button>
      <button data-p="assembly"><b>▣</b>${ko('조립 굿즈')}</button>
    </div>
    <div class="hint" id="productHint">${ko('큰 갈래만 고르면 돼요. 세부 종류는 다음 단계에서.')}</div></div>`;
  const put=(n,...gs)=>{for(const g of gs)if(g)pages[n].appendChild(g);};
  put(2,groups.types,groups.image);
  put(3,groups.cut,groups.detect,groups.tidy);
  put(4,groups.hole,groups.korotto,groups.stand,groups.shape);
  put(5,groups.white);
  put(6,groups.exp,groups.batch);
  if(groups.batch)groups.batch.classList.add('hide'); // 아이템 목록이 대체 (핸들러 참조 때문에 DOM엔 남김)
  // 페이지에 못 넣은 그룹이 있으면 6단계 끝에 (사라지지 않게)
  panel.querySelectorAll('.tabpage .grp').forEach(g=>pages[6].appendChild(g));
  // 조립 굿즈 안내 (2단계)
  const asm=document.createElement('div');asm.className='hide';asm.id='assemblyHint';
  asm.innerHTML=`<div class="types" id="assemblyPresets">${Object.entries(ASSEMBLY).map(([k,v])=>`<button data-asm="${k}"><b>▣</b>${ko(v.name)}<span class="s">${ko(v.desc)}</span></button>`).join('')}</div>
    <div class="hint">${ko('제품을 고르면 판과 그림 자리가 아이템으로 생겨요. 아래 아이템에서 그림 자리를 골라 이미지를 올리세요.')}</div>`;
  groups.types.appendChild(asm);
  asm.addEventListener('click',e=>{const b=e.target.closest('button[data-asm]');if(!b)return;[...$('assemblyPresets').children].forEach(x=>x.classList.toggle('on',x===b));applyAssemblyPreset(b.dataset.asm);renderRail();});
  // 패널 재구성
  const tabs=$('tabs');if(tabs)tabs.remove();
  panel.querySelectorAll('.tabpage').forEach(tp=>tp.remove());
  for(const st of WIZ_STEPS)panel.appendChild(pages[st.n]);
  const nav=document.createElement('div');nav.className='wiz-nav';nav.innerHTML=`<button class="btn ghost" id="wizPrev">${ko('이전')}</button><button class="btn primary" id="wizNext">${t('다음')}</button>`;
  panel.appendChild(nav);
  $('wizPrev').onclick=()=>goStep(prevStep());$('wizNext').onclick=()=>goStep(nextStep());
  // 레일
  const rail=document.createElement('nav');rail.className='rail';rail.id='rail';
  rail.innerHTML=`<div class="rail-steps" id="railSteps" data-lbl="${t('만들기')}"></div><div class="rail-foot" id="railFoot"></div>`;
  panel.parentElement.insertBefore(rail,panel);
  buildRailFoot();
  const credit=document.querySelector('footer.credit'),tb=$('titlebar');if(credit&&tb)tb.appendChild(credit); // 크레딧은 제목 표시줄 오른쪽
  if(window.moa&&window.moa.isElectron){document.body.classList.add('electron');if(window.moa.platform==='darwin')document.body.classList.add('mac');}
  // 제품 버튼
  $('products').addEventListener('click',e=>{const b=e.target.closest('button[data-p]');if(!b)return;setProduct(b.dataset.p);goStep(2);});
  $('railSteps').addEventListener('click',e=>{const b=e.target.closest('button[data-step]');if(!b||b.classList.contains('lock'))return;goStep(+b.dataset.step);});
  // 처음: 현재 타입에서 제품 추정 (기존 사용자 흐름·테스트 호환)
  if(!project.product)project.product=inferProduct(S.type);
  goStep(project.ui.step||1);
}
function inferProduct(type){return (type==='sticker'||type==='sheet')?'sticker':'acrylic';}
function setProduct(p){
  project.product=p;
  document.querySelectorAll('#products button').forEach(b=>b.classList.toggle('on',b.dataset.p===p));
  const allowed=PRODUCT_TYPES[p]||[];
  const btns=[...$('types').children];
  btns.forEach(b=>b.classList.toggle('hide',!allowed.includes(typeKey(b))));
  $('assemblyHint').classList.toggle('hide',p!=='assembly');
  const cur=btns.find(b=>b.classList.contains('on'));
  if(allowed.length&&(!cur||!allowed.includes(typeKey(cur)))){const first=btns.find(b=>allowed.includes(typeKey(b)));if(first)first.click();}
  renderRail();
}
function stepHidden(n){return n===4&&project.product==='sticker';}
function stepLocked(n){return n>=3&&!project.items.some(i=>i.img);}
function stepDone(n){
  if(n===1)return !!project.product;
  if(n===2)return project.items.some(i=>i.img);
  return n<(project.ui.step||1);
}
function nextStep(){let n=(project.ui.step||1);do{n++;}while(n<=6&&stepHidden(n));return Math.min(n,6);}
function prevStep(){let n=(project.ui.step||1);do{n--;}while(n>=1&&stepHidden(n));return Math.max(n,1);}
function goStep(n){
  if(stepHidden(n))n=n<(project.ui.step||1)?prevStep():nextStep();
  if(stepLocked(n))n=2;
  project.ui.step=n;
  document.querySelectorAll('.step-page').forEach(p=>p.classList.toggle('on',p.id==='step'+n));
  if(n===3&&typeof renderPlatePanel==='function')renderPlatePanel();
  if($('wizPrev'))$('wizPrev').disabled=n===1;
  if($('wizNext')){const last=n===6;$('wizNext').textContent=last?t('완료'):t('다음');$('wizNext').disabled=last||stepLocked(nextStep());}
  if(n===1&&project.product)document.querySelectorAll('#products button').forEach(b=>b.classList.toggle('on',b.dataset.p===project.product));
  renderRail();
  const panel=$('panelLeft');if(panel)panel.scrollTop=0;
}
function renderRail(){
  const rs=$('railSteps');if(!rs)return;
  const cur=project.ui.step||1;
  rs.innerHTML=WIZ_STEPS.filter(s=>!stepHidden(s.n)).map(s=>{
    const done=stepDone(s.n)&&s.n!==cur,lock=stepLocked(s.n);
    let sub=t(s.s);
    if(s.n===1&&project.product)sub={sticker:t('스티커'),acrylic:t('아크릴'),assembly:t('조립 굿즈')}[project.product];
    if(s.n===2&&project.product==='assembly'&&project.kind&&ASSEMBLY[project.kind])sub=t(ASSEMBLY[project.kind].name);
    else if(s.n===2&&S&&S.img){const on=$('types').querySelector('button.on');sub=on?on.textContent.replace(/^./,'').trim():sub;}
    if(s.n===5)sub=project.product==='sticker'?t('배경'):t('백판 · 여백');
    return `<button data-step="${s.n}" class="${s.n===cur?'cur':''} ${done?'done':''} ${lock?'lock':''}"><span class="n">${done?'✓':s.n}</span><span><span class="t">${s.n===5&&project.product==='sticker'?t('배경'):t(s.t)}</span><span class="s">${sub}</span></span></button>`;
  }).join('');
}
function buildRailFoot(){
  const f=$('railFoot');if(!f)return;
  // 언어·테마는 설정 패널에서 옮겨 온다 (핸들러 유지)
  const lang=$('langSel');const sw=document.querySelector('.theme-swatches');
  const ko=(k)=>`<span data-ko="${k}">${t(k)}</span>`;
  f.innerHTML=`<div class="rf-lbl">${ko('언어')}</div><div class="seg lang" id="langSeg"></div><div id="rfLang"></div>
    <div class="seg" id="modeSeg" style="margin-top:8px"><button data-mode="light">☀ ${ko('라이트')}</button><button data-mode="dark">☾ ${ko('다크')}</button></div>
    <div class="rf-lbl">${ko('포인트 컬러')}</div><div id="rfTheme"></div>
    <div class="rf-ver">${ko('버전')} <b>v${APP_VER}</b><button class="rf-upd" id="rfUpd">${ko('업데이트 확인')}</button></div>
    <div class="rf-note" id="rfNote"></div>
    <a class="rf-news" href="https://github.com/1000sbin/moa-goods-maker/releases" target="_blank" rel="noopener">${ko('새 소식 · 변경 내역')}</a>`;
  if(lang){$('rfLang').appendChild(lang);
    const names={ko:'한국어',en:'EN',ja:'日本語',zh:'中文'};
    const paint=()=>{$('langSeg').innerHTML=[...lang.options].map(o=>`<button data-l="${o.value}" class="${o.value===lang.value?'on':''}">${names[o.value]||o.textContent}</button>`).join('');};
    $('langSeg').onclick=e=>{const b=e.target.closest('button[data-l]');if(!b)return;lang.value=b.dataset.l;lang.dispatchEvent(new Event('change',{bubbles:true}));paint();};
    paint();}
  if(sw){$('rfTheme').appendChild(sw);}
  $('modeSeg').onclick=e=>{const b=e.target.closest('button[data-mode]');if(b)applyMode(b.dataset.mode);};
  applyMode(lsGet('goods-mode')||'light');
  $('rfUpd').onclick=()=>{$('rfNote').textContent=t('확인 중…');window.moaCheckUpdate&&window.moaCheckUpdate();setTimeout(()=>{$('rfNote').textContent=($('updBanner').style.display==='flex')?t('새 버전이 있어요 ↑'):t('최신 버전을 쓰고 있어요 ✓');},2500);};
}
// 언어가 바뀌면 t() 로 만든 동적 부분을 다시 그린다 (정적 문구는 data-ko 로 applyLang 이 처리)
function refreshWizardLang(){
  if(!$('rail'))return;
  $('railSteps').dataset.lbl=t('만들기');
  renderRail();goStep(project.ui.step||1);
  if(typeof applyType==='function')applyType();
  if(typeof renderItemBar==='function')renderItemBar();
  if(typeof renderPlatePanel==='function')renderPlatePanel();
  if(typeof updateInfo==='function'&&S.img&&project.ui.view==='draft')updateInfo();
}
buildWizard();
