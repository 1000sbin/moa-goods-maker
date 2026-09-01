// 테스트 공용 부트스트랩: jsdom + node-canvas 로 app/index.html 을 띄운다. boot() → {w, NC, captured}
const fs=require('fs'),path=require('path');
const {JSDOM}=require('jsdom');
const NC=require('canvas');

function boot(APP){
APP=APP||path.join(__dirname,'..','app','index.html');
const html=fs.readFileSync(APP,'utf8');
const js=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).pop();
const dom=new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g,''),{runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;
// canvas 대체: jsdom HTMLCanvasElement → node-canvas 위임 (width/height 세터로 백킹 버퍼 리사이즈)
const map=new WeakMap();
const nc=el=>{let c=map.get(el);if(!c){c=NC.createCanvas(el.getAttribute('width')|0||300,el.getAttribute('height')|0||150);map.set(el,c);}return c;};
const CP=w.HTMLCanvasElement.prototype;
CP.getContext=function(t){return nc(this).getContext(t);};
CP.toDataURL=function(...a){return nc(this).toDataURL(...a);};
CP.toBlob=function(cb,type){const buf=nc(this).toBuffer(type||'image/png');cb(new w.Blob([buf],{type:type||'image/png'}));};
Object.defineProperty(CP,'width',{get(){return nc(this).width;},set(v){nc(this).width=v;this.setAttribute('width',v);}});
Object.defineProperty(CP,'height',{get(){return nc(this).height;},set(v){nc(this).height=v;this.setAttribute('height',v);}});
// drawImage가 jsdom canvas 요소를 받으면 node-canvas로 바꿔치기
const CTX=NC.CanvasRenderingContext2D.prototype,origDraw=CTX.drawImage,origPattern=CTX.createPattern;
const unwrap=i=>(i&&map.has(i))?map.get(i):i;
CTX.drawImage=function(i,...a){return origDraw.call(this,unwrap(i),...a);};
CTX.createPattern=function(i,...a){return origPattern.call(this,unwrap(i),...a);};
Object.defineProperty(w.Element.prototype,'clientWidth',{get(){return 900}});
Object.defineProperty(w.Element.prototype,'clientHeight',{get(){return 700}});
w.URL.createObjectURL=()=>'about:blank';w.URL.revokeObjectURL=()=>{};
w.indexedDB={open(){const r={};setTimeout(()=>r.onerror&&r.onerror(),0);return r;}};
w.requestAnimationFrame=f=>setTimeout(f,0);
w.HTMLElement.prototype.scrollIntoView=function(){};
let captured=null;
w.__capture=(blob,name)=>{captured={blob,name};};
w.setImmediate=setImmediate;w.MessageChannel=MessageChannel; // JSZip 의 비동기 스케줄러가 jsdom 에서 멈추지 않게
// 라이브러리 로드
for(const lib of ['ag-psd.js','jszip.js','jspdf.js'])w.eval(fs.readFileSync(path.join(path.dirname(APP),lib),'utf8'));
// 앱 로드 (saveBlob을 캡처로 교체)
w.eval(js.replace(/^async function saveBlob\(blob,name\)\{/m,'async function saveBlob(blob,name){return __capture(blob,name);/*'+'*/}\nasync function __saveBlobOrig(blob,name){')+'\n;Object.defineProperty(window,"S",{get:()=>S});window.project=project;window.__ok=1;');
return {w,NC,captured:()=>captured};
}
module.exports={boot};
