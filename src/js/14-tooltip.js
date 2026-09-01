// ===== 툴팁 (fixed 위치 — 패널 overflow에 안 잘림) =====
const tipBox=document.createElement('div');tipBox.id='tipBox';document.body.appendChild(tipBox);
document.querySelectorAll('.tip').forEach(t=>{
  t.addEventListener('mouseenter',()=>{
    tipBox.textContent=t.dataset.tip;tipBox.style.display='block';
    const r=t.getBoundingClientRect();
    tipBox.style.left=Math.max(8,Math.min(innerWidth-tipBox.offsetWidth-8,r.left-20))+'px';
    let top=r.top-tipBox.offsetHeight-8;
    if(top<8)top=r.bottom+8;
    tipBox.style.top=top+'px';
  });
  t.addEventListener('mouseleave',()=>tipBox.style.display='none');
});