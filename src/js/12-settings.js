// ===== 설정: 테마 · 언어 · 저장 폴더 =====
if($('settingsBtn')){$('settingsBtn').onclick=e=>{e.stopPropagation();$('settingsPanel').classList.toggle('hide');};
document.addEventListener('click',e=>{
  if(!$('settingsPanel').classList.contains('hide')&&!$('settingsPanel').contains(e.target)&&e.target!==$('settingsBtn'))
    $('settingsPanel').classList.add('hide');
});}
function lsGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function lsSet(k,v){try{localStorage.setItem(k,v);}catch(e){}}
function applyTheme(th){
  document.body.dataset.theme=th||'';
  document.querySelectorAll('.theme-swatches button').forEach(b=>b.classList.toggle('on',(b.dataset.theme||'')===(th||'')));
  lsSet('goods-theme',th||'');
  if(S.img)render();
}
document.querySelectorAll('.theme-swatches button').forEach(b=>b.onclick=()=>applyTheme(b.dataset.theme));
const _oldTheme=lsGet('goods-theme');applyTheme(['blue','purple','green','orange'].includes(_oldTheme)?_oldTheme:''); // 옛 테마명(mono 등)은 기본으로
function applyMode(m){ // 'light' | 'dark'
  document.body.classList.toggle('dark',m==='dark');lsSet('goods-mode',m||'light');
  if(window.moa&&window.moa.setTitleBar)window.moa.setTitleBar(m==='dark'?'#1a1a1f':'#ffffff',m==='dark'?'#f2f2f5':'#1f1f24'); // 창 버튼 색도 같이
  document.querySelectorAll('#modeSeg button').forEach(b=>b.classList.toggle('on',b.dataset.mode===(m||'light')));
  if(S.img)render();
}
applyMode(lsGet('goods-mode')||'light');
// 저장 폴더
async function refreshDirUI(){
  $('dirName').textContent=dirHandle?('📁 '+dirHandle.name):t('미지정 (다운로드 폴더)');
  $('dirClear').classList.toggle('hide',!dirHandle);
  $('dirPick').classList.toggle('hide',!window.showDirectoryPicker);
  if(!window.showDirectoryPicker)$('dirName').textContent=t('이 브라우저는 폴더 지정 미지원');
}
$('dirPick').onclick=async()=>{
  try{
    dirHandle=await showDirectoryPicker({id:'goods-save',mode:'readwrite'});
    await idbSet('dirHandle',dirHandle);
  }catch(err){}
  refreshDirUI();
};
$('dirClear').onclick=async()=>{dirHandle=null;await idbSet('dirHandle',null);refreshDirUI();};
(async()=>{try{dirHandle=await idbGet('dirHandle')||null;}catch(err){}refreshDirUI();})();
