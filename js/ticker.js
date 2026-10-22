// The tour bar: one persistent bar, three sizes of the same element (like a broadcast "bug").
//   rest     always there in a tour: green tab with the chapter number, the chapter title, where we are now (hole, players),
//            and the tour's progress as a thin segmented line along its bottom edge
//   step     within a chapter, briefly: the tab turns yellow with a kicker and the line says what happens (next hole, a shot
//            while the ball is in the air, where it finished), then the bar settles back to rest
//   chapter  a chapter starting: the bar grows tall into a title card ("Chapter 3", large title), then settles to rest
// Announcements queue (a chapter title is not cut off by its first shot); "until landed" ones wait for sim.js's "shot-landed".
const tk=$("#ticker"),tkK=tk.querySelector(".tk-k"),tkT=tk.querySelector(".tk-t"),tkM=tk.querySelector(".tk-m"),tkP=tk.querySelector(".tk-p");
let queue=[],cur=null,timer=0,seen={ch:null,step:null},rest=null,shown="";
function tkPaint(it,level){
  const sig=level+"|"+it.kick+"|"+it.main+"|"+(it.meta||"");if(sig===shown)return;shown=sig;
  tkK.textContent=it.kick;tkT.textContent=it.main;tkM.textContent=it.meta||"";tkM.hidden=!it.meta;
  const newTab=tkK.dataset.was!==it.kick||!tk.classList.contains(level);tkK.dataset.was=it.kick;
  tk.classList.remove("rest","step","chapter","swap","tabswap");tk.classList.add(level);void tk.offsetWidth;tk.classList.add("swap");if(newTab)tk.classList.add("tabswap");
}
function showItem(it){cur=it;clearTimeout(timer);tkPaint(it,it.chapter?"chapter":"step");stage.classList.add("announcing");if(it.ms!==Infinity)timer=setTimeout(next,it.ms)}
function next(){cur=null;const it=queue.shift();if(it)return showItem(it);if(rest)tkPaint(rest,"rest");stage.classList.remove("announcing")}
function announce(it,{after=false}={}){if(after&&cur){queue.push(it);return}queue=[];showItem(it)}
function clearTicker(){queue=[];cur=null;clearTimeout(timer);tk.hidden=true;shown="";stage.classList.remove("announcing");seen={ch:null,step:null}}
// the resting line: the chapter, and where we are in it now
function restFor(c){
  const st=c.steps?.[S.step],h=st?MASTERS_DATA.holes[st.hole-1]:c.filters?.Hole?.length===1?MASTERS_DATA.holes[c.filters.Hole[0]-1]:null;
  const who=st?(st.b?`${surname(st.seq.player)} & ${surname(st.b.seq.player)}`:st.seq.player):"";
  const meta=c.type==="media"?"Video":[h&&`Hole ${h.n} · ${h.name}`,who].filter(Boolean).join(" · ");
  return {kick:String(S.ch+1),main:c.headline||c.title,meta};
}
function progress(){
  tkP.innerHTML=TOUR.chapters.map((x,i)=>i!==S.ch?`<i class="${i<S.ch?"done":""}"></i>`
    :`<span class="now">${Array.from({length:steps(x)},(_,j)=>`<b class="${j<S.step?"done":j===S.step?"on":""}"></b>`).join("")}</span>`).join("");
}

const dist=sh=>sh.kind==="Putt"?Math.max(1,Math.round(sh.yd*3))+" ft":sh.yd+" yd";
const shotName=sh=>sh.kind.replace(" shot","");
function tickerUpdate(){
  if(S.view!=="tour"||S.mode==="solo"){clearTicker();return}
  const c=chapter(),N=TOUR.chapters.length,chKey=TOUR.id+":"+S.ch;
  if(tk.hidden){tk.hidden=false;tk.classList.remove("enter");void tk.offsetWidth;tk.classList.add("enter")}
  tk.classList.toggle("away",S.mode==="breakout");rest=restFor(c);progress();
  if(S.mode==="breakout"){queue=[];cur=null;clearTimeout(timer);tkPaint(rest,"rest");return} // the tour waits: the bar rests, dimmed
  if(!cur)tkPaint(rest,"rest");
  if(chKey!==seen.ch){ // a new chapter
    seen.ch=chKey;seen.step=null;
    const one=c.filters?.Hole?.length===1?MASTERS_DATA.holes[c.filters.Hole[0]-1]:null,st0=c.steps?.[0];
    const meta=c.type==="round"?`${st0.seq.player}${st0.b?" vs "+st0.b.seq.player:""} · ${st0.seq.year}`:one?`Hole ${one.n} · ${one.name}`:"";
    // the tab names what changed most: another player (or pair), else another hole, else just the chapter's number
    const who=x=>{const s=x?.type==="round"&&x.steps?.[0];return s?(s.b?`${surname(s.seq.player)} & ${surname(s.b.seq.player)}`:s.seq.player):null};
    const prev=TOUR.chapters[S.ch-1],nowWho=who(c),prevWho=who(prev);
    const kick=nowWho&&nowWho!==prevWho?nowWho:nowWho&&prev.steps[0].hole!==st0.hole?`Hole ${st0.hole}`:`Chapter ${S.ch+1}`;
    announce({kick,main:c.headline||c.title,meta,ms:3600,chapter:true}); // level 1: the chapter card
  }
  if(c.type!=="round")return;
  const sk=S.ch+":"+S.step;if(sk===seen.step)return;
  const prevHole=seen.step?.startsWith(S.ch+":")?c.steps[+seen.step.split(":")[1]]?.hole:null;seen.step=sk;
  const st=c.steps[S.step],h=MASTERS_DATA.holes[st.hole-1],after=!prevHole; // first step of a chapter: after its title
  if(prevHole&&prevHole!==st.hole)announce({kick:`Hole ${h.n}`,main:h.name,meta:`Par ${h.par} · ${h.yd} yards`,ms:2600});
  // the tab names what changed (the shot, the hole); the player is in the resting line already, so it is only named when two compare
  if(st.pre){announce({kick:"Shot 0",main:`From the ${st.shot.fromLie}`,meta:`${dist(st.shot)} to play`,ms:3600},{after:true});return}
  const a=st.done?null:st.shot,b=st.b&&!st.b.done?st.b.shot:null;
  const main=st.b?[a&&`${surname(st.seq.player)} ${shotName(a)}`,b&&`${surname(st.b.seq.player)} ${shotName(b)}`].filter(Boolean).join(" · "):shotName(st.shot);
  const meta=st.b?[a&&dist(a),b&&dist(b)].filter(Boolean).join(" · "):dist(st.shot);
  announce({kick:`Shot ${st.n}`,main,meta,ms:Infinity,step:sk},{after:after||(prevHole&&prevHole!==st.hole)});
}
// the ball has landed: the shot's announcement gives way to where it finished (or the hole's result)
addEventListener("shot-landed",()=>{
  const c=chapter();if(c?.type!=="round"||S.view!=="tour")return;
  const st=c.steps[S.step];
  const res=st.lastOfHole?{kick:`Hole ${st.hole}`,main:st.b?`${surname(st.seq.player)} ${st.score} · ${surname(st.b.seq.player)} ${st.b.score}`:st.score,meta:st.b?`${st.strokes} and ${st.b.strokes} strokes`:`${st.strokes} strokes`}
    :{kick:`Shot ${st.n}`,main:st.shot.lie&&st.shot.lie!=="Other"?`On the ${st.shot.lie.toLowerCase()}`:"Played",meta:st.b?"":`${dist(st.shot)}`};
  const it={...res,ms:3000};
  if(cur?.ms===Infinity)showItem(it); else if(queue.some(q=>q.ms===Infinity)){queue=queue.map(q=>q.ms===Infinity?it:q)} else announce(it,{after:true});
});
