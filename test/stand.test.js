// 스탠드 촉 자리: 발끝(최저점)이 아니라 촉을 받칠 수 있는 넓은 구간 아래에, 촉 윗변은 그 구간의 바닥에서
const {boot}=require('./harness');
const {w,NC}=boot(process.argv[2]);
const $=id=>w.document.getElementById(id);
let fails=0;const ok=(c,m)=>{console.log((c?'PASS':'FAIL'),m);if(!c)fails++;};
$('dpi').value=300;w.S.type='stand';w.S.noBase=true;w.applyType();
// 큰 머리 + 몸통 + 오른쪽 아래로 뻗은 좁은 발 (발끝이 최저점)
const c=NC.createCanvas(400,400);const g=c.getContext('2d');g.fillStyle='#c36';g.beginPath();g.arc(180,150,110,0,7);g.fill();g.fillRect(150,240,60,70);g.fillRect(200,280,90,60);g.fillRect(260,320,40,60);
w.setArtSource(c,400,400);w.computeCore(true);
const st=w.S._tabStamps[0];const cx=(st.x0+st.x1)/2-w.S.xImg;
ok(w.S.tabConnectOK===true,'촉이 그림과 연결됨 (경고 없음)');
ok(cx>190&&cx<300,`촉 중심이 넓은 몸통 아래 (x=${cx.toFixed(0)}, 발끝 280 이 아닌 블록 200~290 범위)`);
ok(st.y0-w.S.yImg<=312&&st.y0-w.S.yImg>=300,`촉 윗변이 촉 폭 안 열들의 가장 높은 바닥(왼쪽 블록 310)에서 시작 (y0=${(st.y0-w.S.yImg).toFixed(0)})`);
ok(w.S.loops.length===1,'칼선 한 덩어리');
// 발이 넓으면(촉 폭 이상) 그대로 발 아래
const c2=NC.createCanvas(400,400);const g2=c2.getContext('2d');g2.fillStyle='#36c';g2.beginPath();g2.arc(200,150,110,0,7);g2.fill();g2.fillRect(100,240,200,140);
w.setArtSource(c2,400,400);w.computeCore(true);
const st2=w.S._tabStamps[0];
ok(Math.abs((st2.x0+st2.x1)/2-w.S.xImg-200)<3&&Math.abs(st2.y0-w.S.yImg-373)<4,'넓은 바닥이면 최저점 바로 아래 가운데 (겹침 0.5mm 포함)');
console.log(fails?`${fails}개 실패`:'모두 통과');process.exit(fails?1:0);
