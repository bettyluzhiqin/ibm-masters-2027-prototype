// Stage fit, the loading screen, and start-up.
/* ---------- fit the 5280x2970 stage to the window, keeping the ratio ---------- */
function fit(){const vp=$("#vp"),pad=0,s=Math.min((vp.clientWidth-pad)/5280,(vp.clientHeight-pad)/2970);
  stage.style.transform=`scale(${s})`;$("#frame").style.width=5280*s+"px";$("#frame").style.height=2970*s+"px"}
TOUR=tourFor(chosenTour());
addEventListener("sim-ready",()=>render());

/* ---------- loading: the ball's flight is the progress bar, from the files as they arrive (resource timing in this page and the
   course's frame), weighted by size (MB). The last 4% waits for the course to draw its first frame ("sim-ready"), then Idle. ---------- */
(function loading(){
  const el=$("#loader"),arc=$("#lArc"),ball=$("#lBall"),L=arc.getTotalLength(),reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FILES=[["height.bin.gz",30.3],["surface.bin.gz",23],["dir.bin.gz",4.8],["course.json",.3],["far.bin",.6],["index-",1.4],["trees.bin",.4],["trees-survey",.1],
    ["foliage-clusters-v1",2.7],["foliage-flower-clusters.png",2.6],["pine_bark",3.2],["grass_tufts",.05],["ground_detA",3.1],["ground_detB",3.5],["ground_straw",3.6],
    ["sky.hdr",20.7],["data/shots.bin",7.3]];
  if(!navigator.gpu){$("#lNote").textContent="This screen needs a browser with WebGPU: Chrome, Edge or Safari 26.";$("#lNote").hidden=false} // the one message worth showing
  const total=FILES.reduce((n,[,mb])=>n+mb,0);
  let ready=!!window.sim?.backend,shown=0,done=false;
  addEventListener("sim-ready",()=>ready=true,{once:true});
  (function tick(){
    const fr=document.getElementById("simCanvas")?.contentWindow,names=[...performance.getEntriesByType("resource"),...(fr?.performance?.getEntriesByType("resource")||[])].map(e=>e.name);
    const got=FILES.filter(([k])=>names.some(n=>n.includes(k))).reduce((m,[,mb])=>m+mb,0);
    const pct=ready?100:Math.min(96,got/total*96);shown=reduce?pct:shown+(pct-shown)*.12;if(pct-shown<.2)shown=pct;
    arc.style.strokeDasharray=L;arc.style.strokeDashoffset=L*(1-shown/100);
    const q=arc.getPointAtLength(L*shown/100);ball.setAttribute("cx",q.x);ball.setAttribute("cy",q.y);
    if(shown>=100&&!done){done=true;setTimeout(()=>{el.classList.add("out");idleIntro();setTimeout(()=>el.hidden=true,950)},500);return}
    requestAnimationFrame(tick);
  })();
})();
addEventListener("resize",fit);fit();applyCtrl();renderFp();render();
