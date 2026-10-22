// Render: every view from the state in S, the overview card, the game-focus card.
/* ---------- render ---------- */
function render(){
  const v=view();
  window.sim?.leaveLabels?.([v,S.mode,TOUR.id,S.ch,S.step].join(":")); // the shot label and insight exit before the content changes
  insightGate(v);
  if(v!==render.lastV){if(v==="idle"&&render.lastV)idleIntro();if(v==="freeplay"&&!S.menu){S.panel=null;S.fpFilter=null}render.lastV=v}
  stage.style.backgroundImage=IMG[v]?`url("${IMG[v]}")`:"none";
  S.chapter=simChapter();window.sim?.update(S,v);
  sfx.set(S.volume,S.muted,v);
  stage.querySelectorAll("[data-v]").forEach(e=>e.hidden=!(e.dataset.v===v||(e.dataset.v==="tour"&&S.view==="tour")));
  const near=$(".near");near.classList.toggle("idle",v==="idle");if(v==="idle")near.hidden=false; // Idle keeps the column for Sound only (css: .near.idle)
  const inTour=S.mode==="tour", c=chapter(), fp=v==="freeplay";
  // dock: fixed slots, contents swap with context
  const slot=(el,act,icon,label,enabled=true,on=false)=>{el.dataset.act=act;el.innerHTML=icon+(label?`<span>${label}</span>`:"");
    el.setAttribute("aria-label",label||act);el.disabled=!enabled;el.classList.toggle("on",on)};
  const hero=$("#heroBtn"); hero.classList.toggle("current",inTour&&fp); hero.classList.toggle("go",!inTour);
  if(S.mode==="breakout") slot(hero,"back",ICON.back,"Back to tour");
  else if(S.mode==="solo") slot(hero,"back",ICON.end,"End");
  else slot(hero,"breakout",ICON.freeplay,fp?"In Freeplay":"Freeplay",!fp); // the last chapter is Freeplay itself
  // Reset view lives in the view bar: always in Freeplay; in a tour only once the visitor has moved the camera (css: .cammoved)
  $("#qbReset").classList.toggle("always",fp);
  hero.hidden=fp&&inTour; // a Freeplay chapter: "In Freeplay" says nothing new, and Previous | Next need the room
  $("[data-act=next]").disabled=$("[data-act=prev]").disabled=!inTour;
  $("#dock").classList.toggle("fpchapter",fp&&inTour); // a Freeplay chapter is still the tour: Previous | Next stay (css)
  // Next reads Finish on the very last step, so the end of the tour is never a surprise
  const lastStep=inTour&&S.ch===TOUR.chapters.length-1&&S.step>=steps(c)-1;
  $("[data-act=next]").innerHTML=lastStep?'<svg viewBox="0 0 32 32"><path d="M13 24L4 15 5.414 13.586 13 21.171 26.586 7.586 28 9 13 24z"/></svg><span>Finish</span>':'<svg viewBox="0 0 32 32"><path d="M18 6L16.57 7.393 24.15 15 4 15 4 17 24.15 17 16.57 24.573 18 26 28 16 18 6z"/></svg><span>Next</span>';
  $("[data-act=prev]").disabled=!inTour||(S.ch===0&&S.step===0); // nothing before the first step
  const vol=S.muted?0:S.volume;
  $("#muteBtn").innerHTML=vol===0?ICON.mute:vol<50?ICON.soundLow:ICON.sound;
  $("#muteBtn").classList.toggle("on",S.menu==="sound");
  $("#sound").hidden=S.menu!=="sound";
  $("#volVal").textContent=S.muted?"Muted":S.volume+"%";
  $("#volTrack .fill").style.cssText=`left:0;width:${S.volume}%`;$("#volTrack .th").style.left=S.volume+"%";
  $("#volTrack").classList.toggle("muted",S.muted);
  $("#muteItem").textContent=S.muted?"Unmute":"Mute";
  // Filters / View: only usable in Freeplay; the open one reads as "on"
  const courseView=["round","filterset","freeplay"].includes(v);
  $("#fcats").hidden=!fp;$("#fcats").closest(".dock").classList.toggle("fpmode",fp); // Freeplay: the category tiles (js/freeplay.js)
  if(fp)renderFTabs();
  $("[data-act=more]").disabled=false; // tours can be changed from anywhere, Freeplay included
  // menu copy follows the mode: without a tour there is nothing to restart, and "change" means "start"
  const solo=S.mode==="solo";
  $("[data-act=askRestart]").hidden=solo;
  $("#miChange").textContent=solo?"Start a tour…":"Change tour…";
  $("#miExit").textContent=solo?"End Freeplay…":"Exit tour…";
  $("#tpTitle").textContent=solo?"Start a tour":"Change tour";
  $("#tpNote").textContent=solo?"Pick the tour to start. Freeplay ends.":"The current tour is ticked.";
  $("#more").hidden=S.menu!=="more"; if(S.menu==="more")applyScreenUI()
  $("#tourPop").hidden=S.menu!=="tours";
  if(S.menu==="tours") $("#tpRows").replaceChildren(...tourRows(t=>{
    const solo=S.mode==="solo";
    if(!solo&&t.id===chosenTour()?.id){S.menu=null;render();return} // same tour: nothing to change
    confirm(solo?`Start ${t.title}?`:`Switch to ${t.title}?`,solo?"This ends Freeplay. The screen returns to Idle with the tour ready.":"This ends the current tour. The screen returns to Idle with the new tour ready.",solo?"Start":"Switch",()=>{
      tourMemory.set(t);TOUR=tourFor(t);S.mode="tour";S.ch=0;S.step=0;S.tourList=false;go("idle");toast("Tour set: "+t.title)},"tours")})); // back to Idle with the new title; a tap starts it
  document.querySelectorAll(".sidesw .chip").forEach(b=>b.setAttribute("aria-pressed",b.dataset.act==="side"+(stage.dataset.side==="left"?"Left":"Right"))); $("#confirm").hidden=S.menu!=="confirm";
  const panel=S.panel==="filters"&&!fp?null:S.panel; // Filters only exists in Freeplay
  $("#fpcol").hidden=!fp||!!S.menu||panel!=="filters"; $("#fp").hidden=panel!=="filters";
  // gesture hint wherever the course takes touch; "tap a hole" only where it does something (Freeplay)
  // quick bar mirrors the View panel; Shots means nothing in game focus (only the player's shots are drawn)
  $("#quickBar").hidden=!courseView||S.view!=="tour";
  $("#qbNames").classList.toggle("on",S.display.names);
  $("#qbShots").classList.toggle("on",S.display.shots&&S.display.data==="Arcs"&&v!=="round");
  $("#qbBalls").classList.toggle("on",S.display.shots&&S.display.data==="Balls"&&v!=="round");
  $("#qbShots").disabled=$("#qbBalls").disabled=$("#qbKey").disabled=v==="round";
  $("#qbKey").classList.toggle("on",S.display.key&&v!=="round");
  $("#navHint").hidden=!courseView; $("#navHint .nh:last-child").hidden=!fp;
  // camera views: bird's eye (straight down), orbit (slow turn), tee (behind the tee, looking down the hole)
  // Tee only makes sense in game focus (one hole, one player); elsewhere it falls back to Orbit
  // chapter content
  // insight: one design for the data chapter and game focus; the shot video only in game focus
  // each chapter decides its cards: data chapters their insight lines (else the one hole's insights), game-focus steps their flags
  const st=v==="round"?c.steps[S.step]:null,oneHole=v==="filterset"&&c.filters?.Hole?.length===1&&(!c.filtersB||c.filtersB.Hole?.[0]===c.filters.Hole[0])?+c.filters.Hole[0]:null;
  const lines=v==="filterset"?(c.insight||(oneHole?MASTERS_DATA.holes[oneHole-1].insights:[])):st?st.text:[];
  $("#calloutB").hidden=!st?.b;$("#callout").classList.toggle("a",!!st?.b);$("#gfStack").hidden=!lines.length&&!st?.video; $("#gfStack .ins").hidden=!lines.length; $("#gfVid").hidden=!st?.video;
  const insHtml=lines.map(t=>`<p>${t}</p>`).join("");
  if(insHtml!==$("#gfIns").innerHTML&&+getComputedStyle($("#gfStack")).opacity>0)window.sim?.leaveNow?.(); // never swap text in view
  $("#gfIns").innerHTML=insHtml;
  if(st){const shot=st.shot,lie=shot.lie&&shot.lie!=="Other"?" → "+shot.lie:"";
    $("#callout").dataset.t=st.pre?`Shot ${st.n} · from the ${shot.fromLie}`:st.lastOfHole?st.res:`Shot ${st.n}${lie}`;
    if(st.b){const tag=(s,sh)=>`${s.seq.player.split(" ").at(-1)} · `+(s.done||st.lastOfHole?s.res:`Shot ${s.n}${sh.lie&&sh.lie!=="Other"?" → "+sh.lie:""}`);
      $("#callout").dataset.t=tag(st,shot);$("#calloutB").dataset.t=tag(st.b,st.b.shot)}
    $("#vidCap").textContent=`Hole ${st.hole} · shot ${st.n} · ${shot.kind}${lie}`;
    const key=S.ch+":"+S.step;if(render.clip!==key){render.clip=key;const b=$("#vidProg");b.classList.remove("run");void b.offsetWidth;b.classList.add("run")}}
  else render.clip=null;
  if(v==="media"){$("#mediaTitle").textContent=c.title;const n=steps(c);$("#mediaMeta").textContent=`Video chapter${c.length?" · "+c.length:""}${n>1?` · film ${S.step+1} of ${n}`:""}`}
  renderOverview(v);layoutAudience();
  $("#prog").hidden=true; // progress lives in the tour bar now (js/ticker.js)
  $("#prog").innerHTML=`<b class="pn">${S.ch+1}<span> / ${TOUR.chapters.length}</span></b>`+TOUR.chapters.map((x,i)=>i!==S.ch?`<i class="pc${i<S.ch?" done":""}"></i>`:
    `<span class="pc now">${Array.from({length:steps(x)},(_,j)=>`<i class="d${j<S.step?" done":j===S.step?" on":""}"></i>`).join("")}</span>`).join("");
  if(S.view==="idle"){renderTourPicker();renderIdle()}
  if(typeof tickerUpdate==="function")tickerUpdate()}
// overview: one compact card. Tags show the filters; narrowed ones bright, "all" ones quiet
// overview: what is selected, in plain words. Active filters as label/value rows; everything left at "all" on one quiet line
const SEL_LABEL={Hole:"Hole",Year:"Year",Round:"Round",Player:"Player",Shot:"Shot",Stroke:"Strokes",Region:"Region",Sector:"Sector",Distance:"Distance",Score:"Score",Trophy:"Players"};
function selValue(k,v){
  if(k==="Hole") return v.length===1?`${v[0]} · ${MASTERS.holes[v[0]-1].name}`:fmt("Hole",v);
  if(k==="Round") return v.map(r=>r.slice(1)).join(", ");
  if(k==="Player") return v.length<=2?v.join(", "):v.length+" players";
  if(k==="Sector") return v.join(", ");
  if(k==="Score") return v.map(x=>`${x} (${TO_PAR[x]})`).join(", ");
  if(k==="Trophy") return v.join(", ");
  return fmt(k,v);
}
function selection(f,skipHole){ // skipHole: the single hole is shown by the hole line (with par + average) instead
  const keys=Object.keys(FILTERS).filter(k=>f[k]&&!(skipHole&&k==="Hole"));
  const short=k=>k==="Hole"?(f.Hole.length===1?"Hole "+f.Hole[0]:"Holes "+fmt("Hole",f.Hole)):k==="Round"?"Round "+selValue(k,f[k]):k==="Year"?fmt("Year",f.Year):selValue(k,f[k]);
  const headline="";
  const rows=keys.map(k=>`<span class="k">${SEL_LABEL[k]}</span><span class="v">${selValue(k,f[k])}</span>`).join("");
  const rest=[!f.Player&&"All players",!f.Year&&`${MASTERS.years[0]}–${MASTERS.years.at(-1)}`,!f.Round&&"All rounds",!f.Hole&&"All holes",!f.Shot&&"All strokes"].filter(Boolean).join(" · ");
  return {headline,rows,rest};
}
// audience cards: insight + video sit under the overview; when they would collide (a tall game-focus card, or a small
// screen where everything is drawn bigger) the stack moves beside the overview instead, top-aligned with it
function layoutAudience(){
  const gf=$("#gfStack"),ov=$("#overview");
  if(view()==="round")return; // game focus: sim.js pins the stack to the shot on the course
  gf.style.left=gf.style.right=gf.style.top=gf.style.bottom="";
  if(gf.hidden||ov.hidden)return;
  const f=$("#frame").getBoundingClientRect(),k=5280/f.width,a=ov.getBoundingClientRect(),b=gf.getBoundingClientRect();
  if(b.top-a.bottom>=40/k)return; // fits underneath
  const z=parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ui-read"))||1,right=stage.dataset.side==="right";
  gf.style[right?"left":"right"]=((right?a.right-f.left:f.right-a.left)*k+60)/z+"px"; // zoomed element: stage px / zoom
  gf.style.top=(a.top-f.top)*k/z+"px";gf.style.bottom="auto";
}
const holeLine=n=>{const h=MASTERS_DATA.holes[n-1];return `<div class="hole"><b>Hole ${h.n} · ${h.name}</b><span>Par ${h.par} · Avg ${h.avg.toFixed(2)}</span></div>`};
const mark=d=>d<=-2?"under2":d===-1?"under":d===1?"over":d>=2?"over2":"";
// game focus moving on to another hole: the tour bar names it ("Hole 13"); for ~3.5 s the card marks its hole section with a
// yellow edge, so the change of hole reads on the card as well as on the bar
let cueAt=null,cueT=-1e9;
const CUE_MS=3500;
function holeCue(st){ // call before writing the card: returns the label, if any
  const key=S.ch+":"+st.hole,now=performance.now();
  if(key!==cueAt){const sameChapter=cueAt&&cueAt.startsWith(S.ch+":");cueAt=key;cueT=sameChapter?now:-1e9;holeCue.fresh=sameChapter}
  else holeCue.fresh=false;
  return ""; // the tour bar names the hole; the card only marks its hole section (the yellow edge, css .nexthole)
}
function holeCueAnim(){ // after writing the card: restart the slide-in on a fresh hole change
  $("#ov").classList.toggle("nexthole",performance.now()-cueT<CUE_MS); // a quiet marker only: the tour bar announces the hole
}
// a new chapter (or going into Freeplay): a copy of the old card fades out, the new one fades in with a small rise,
// then the insight follows (insightGate). Within a chapter the card only updates; Freeplay filter changes never flip it.
function flipCard(){
  const ov=$("#ov"),g=ov.cloneNode(true);g.removeAttribute("id");g.classList.remove("intro","cue","nexthole","flipin");g.classList.add("ghost");
  ov.after(g);g.addEventListener("animationend",e=>{if(e.target===g)g.remove()});setTimeout(()=>g.remove(),900); // only its own exit
  ov.classList.remove("flipin");void ov.offsetWidth;ov.classList.add("flipin");
  const k=$("#ckey");k.classList.remove("flipin");void k.offsetWidth;k.classList.add("flipin"); // the key follows the card in
}
function renderOverview(v){
  const show=["round","filterset","freeplay"].includes(v),flipKey=S.view==="tour"&&S.mode==="tour"?`${TOUR.id}:${S.ch}`:"freeplay";
  if(show&&flipKey!==renderOverview.flipKey){if(renderOverview.flipKey&&!$("#overview").hidden)flipCard();renderOverview.flipKey=flipKey}
  $("#overview").hidden=!show;renderKey(v);if(!show)return;
  const c=chapter(),box=$("#ov");
  if(v==="round"){ // game focus: who, the scorecard through the sequence, this hole's shots
    const st=c.steps[S.step],fx=st.seq,hs=[...new Map(c.steps.map(x=>[x.hole,x])).values()]; // the chapter's holes, in order
    const done=i=>i<st.hi||(i===st.hi&&st.lastOfHole&&!st.pre);
    // one hole: no scorecard, the hole line says it; several: one cell per hole
    const card=hs.length<2?"":`<div class="sc" style="grid-template-columns:repeat(${hs.length},1fr)">`+hs.map((h,i)=>
      `<div class="${i===st.hi?"cur":""}">Hole ${h.hole}<br><span class="mk ${done(i)?mark(h.strokes-h.par):""}">${done(i)?h.strokes:"·"}</span></div>`).join("")+"</div>";
    const shotRows=(shots,si,pre,short)=>{let n=0;return shots.map((sh,i)=>{const cl=i===si?" now":i>si||(pre&&i===si)?" later":"";return sh.kind==="Drop"?`<span class="${cl}"></span><span class="muted${cl}">Drop</span><span class="d muted${cl}">${sh.yd} yd</span>`
      :sh.kind==="Penalty"?`<span class="n${cl}">${++n}</span><span class="${cl}">Penalty stroke</span><span class="d${cl}"></span>`
      :`<span class="n${cl}">${++n}</span><span class="${cl}">${short?sh.kind.replace(" shot",""):sh.kind+(sh.lie&&sh.lie!=="Other"?" · "+sh.lie:"")}</span><span class="d${cl}">${sh.kind==="Putt"?Math.max(1,Math.round(sh.yd*3))+" ft":sh.yd+" yd"}</span>`}).join("")};
    if(st.b){ // side by side: both players' scorecards, then their shots on this hole in two columns
      const both=[["A",st],["B",st.b]],sur=s=>s.seq.player.split(" ").at(-1),fin=i=>i<st.hi||(i===st.hi&&st.lastOfHole);
      const sc=`<div class="sc duo" style="grid-template-columns:auto repeat(${hs.length},1fr)"><div></div>${hs.map((h,i)=>`<div class="${i===st.hi?"cur":""}">Hole ${h.hole}</div>`).join("")}`
        +both.map(([g,s])=>`<div class="who"><i class="dot" style="background:${GROUP_COL[g]}"></i>${sur(s)}</div>`+s.seq.holes.map((h,i)=>`<div class="${i===st.hi?"cur":""}"><span class="mk ${fin(i)?mark(h.strokes-h.par):""}">${fin(i)?h.strokes:"·"}</span></div>`).join("")).join("")+"</div>";
      const cols=both.map(([g,s])=>`<div class="grp"><div class="gh"><i class="dot" style="background:${GROUP_COL[g]}"></i><b>${sur(s)}</b></div><div class="res">${s.done||st.lastOfHole?s.score:"&nbsp;"}</div><div class="shots">${shotRows(s.shots,s.done?s.shots.length:s.si,false,true)}</div></div>`).join("");
      const nx=holeCue(st);
      box.innerHTML=`<div class="hl">${st.seq.player.split(" ").at(-1)} vs ${sur(st.b)}</div><div class="meta">${fx.year} · Round ${fx.round}</div>${sc}<div class="sec">${nx}${holeLine(st.hole)}<div class="duo">${cols}</div></div>`;
      holeCueAnim();return;
    }
    const rows=shotRows(st.shots,st.si,st.pre);
    const nx=holeCue(st);
    box.innerHTML=`<div class="hl">${fx.player}</div><div class="meta">${fx.year} · Round ${fx.round}${st.pre?"":" · "+st.score}</div>
      ${card}<div class="sec">${nx}${holeLine(st.hole)}<div class="shots">${rows}</div></div>`;
    holeCueAnim();return;
  }
  // data chapter / Freeplay. Hierarchy (V1 "statement card"): eyebrow → the story in words (serif) → one context line →
  // key numbers → outcome bar → colour key. A tour chapter says its story; Freeplay writes it from the filters.
  const f=v==="filterset"?c.filters:S.filters,cnt=window.sim?.counts||{},compare=v==="freeplay"?S.compare:v==="filterset"&&!!c.filtersB;
  const fB=v==="filterset"?c.filtersB:S.filtersB;
  const names=compare?groupNames(f,fB,v==="filterset"?c.groups:null):null;
  const story=v==="filterset"&&c.headline?c.headline:compare?`${names.short[0]} vs ${names.short[1]}`:v==="filterset"?c.title:describe(f).text;
  const ctx=compare?contextOf(sharedFilters(f,fB),new Set(),new Set([...new Set([...Object.keys(f),...Object.keys(fB)])].filter(k=>JSON.stringify(f[k])!==JSON.stringify(fB[k])))):contextOf(f,describe(f).used);
  const eb=S.mode==="breakout"&&resume?`From chapter ${resume.ch+1} · ${TOUR.chapters[resume.ch].title}`:""; // no category caption: the title says it
  const pctf=x=>x<0.01&&x>0?"<1%":Math.round(x*100)+"%";
  // which numbers: shots (single group; in a comparison it sits in the group header), scoring average when the story is
  // a whole hole, otherwise the average shot; water; birdie or better (or the result, for one player-hole)
  const wholeHole=sel=>sel.Hole?.length===1&&!["Shot","Stroke","Distance","Region","Sector","Score"].some(k=>sel[k]);
  const figs=(s,sel,withShots,n)=>s?`<div class="figs" style="--n:${withShots?4:3}">`+(withShots?`<div class="fig"><b>${(n??0).toLocaleString()}</b><span>Shots</span></div>`:"")
    +(wholeHole(sel)?`<div class="fig"><b>${s.avgStrokes.toFixed(2)}</b><span>Scoring avg</span></div>`:`<div class="fig"><b>${s.avgYd} yd</b><span>Avg shot</span></div>`)
    +`<div class="fig"><b>${pctf(s.water)}</b><span>In water</span></div>`
    +(s.holes===1?`<div class="fig"><b>${MASTERS_DATA.scores[s.dist.findIndex(d=>d>0)]??"—"}</b><span>Result</span></div>`:`<div class="fig"><b>${pctf(s.under)}</b><span>Under par</span></div>`)+`</div>
    `+bar(s,withShots):"";
  // the outcome bar is the key: each segment carries its to-par number (Ace for a hole in one); a comparison gets one
  // compact numbers-only key under both groups. Only scores that occur are shown; no words.
  const par=i=>i===0?"Ace":TO_PAR[MASTERS_DATA.scores[i]];
  // average to par per player-hole, from the score mix (an ace counted as −2, the last bucket as +3)  ponytail: approximate at the ends; exact needs par per hole in stats()
  const TP=[-2,-3,-2,-1,0,1,2,3],avgPar=s=>{const v=s.dist.reduce((a,d,i)=>a+d*TP[i],0);return Math.abs(v)<.005?"E":(v>0?"+":"−")+Math.abs(v).toFixed(2)};
  function bar(s,numbered){return `<div class="bt">Average score <b>${avgPar(s)}</b></div><div class="bar${numbered?" num":""}" title="${s.holes} player-holes">${s.dist.map((d,i)=>d?`<i style="flex:${d};--c:${SCORE_COL[i]}">${numbered&&d>=0.04?`<span>${par(i)}</span>`:""}</i>`:"").join("")}</div>`}
  box.innerHTML=`${eb?`<div class="eb">${eb}</div>`:""}<div class="hl story">${story}</div>${ctx?`<div class="ctx">${ctx}</div>`:""}`+(compare
    ?[["A",f,cnt.a,cnt.sa],["B",fB,cnt.b,cnt.sb]].map(([g,gf,nn,st],i)=>`<div class="grp sec"><div class="gh"><i class="dot" style="background:${GROUP_COL[g]}"></i><b>${names.full[i]}</b><span class="n">${(nn??0).toLocaleString()} shots</span></div>${figs(st,gf,false)}</div>`).join("")
    :`<div class="sec">${figs(cnt.sa,f,true,cnt.a)}</div>`);
  
}
// the colour key: a small card after the overview, naming the arc colours (score on the hole) that occur in the selection.
// Data stories and Freeplay only (game focus colours by player); off by default, the quick bar's key button turns it on.
// Rebuilt only when its content changes, so it doesn't re-enter on every render; it comes in with the card (css: .ckey.flipin)
function renderKey(v){
  const k=$("#ckey"),cnt=window.sim?.counts||{},compare=v==="freeplay"?S.compare:v==="filterset"&&!!chapter().filtersB;
  const on=S.display.key&&S.display.shots&&(v==="filterset"||v==="freeplay")&&cnt.sa;
  if(on&&k.hidden)k.classList.remove("flipin"); // turned on: in at once (the delayed entrance is only for a new chapter)
  k.hidden=!on;if(!on){renderKey.html="";return}
  const present=[cnt.sa,compare?cnt.sb:null].filter(Boolean).reduce((m,s2)=>s2.dist.map((d,i)=>m[i]||d>0),[]);
  const name=i=>i===0?"Ace":MASTERS_DATA.scores[i].replace("Double Bogey","Double bogey").replace("Triple Bogey","Triple bogey+");
  const arc=c=>`<svg viewBox="0 0 34 16"><path d="M2 14C8 5 17 2 32 2" stroke="${c}"/></svg>`; // an arc, as on the course
  const html=`<div class="kt">Arc colours</div><div class="kl">${present.map((p,i)=>p?`<span>${arc(SCORE_COL[i])}<em>${name(i)}</em><b>${i===0?"":TO_PAR[MASTERS_DATA.scores[i]]}</b></span>`:"").join("")}</div>`;
  if(html!==renderKey.html){k.innerHTML=html;renderKey.html=html}
}
// a chapter's first seconds, in screen order: the tour bar announces the chapter, the card fades in as a whole (css: .ov.flipin),
// and the insight / video card comes in last. Runs at the very start of render(), before sim.update decides what is visible,
// so the insight never sees the previous chapter's timing (it would show, then vanish a frame later).
let introKey=null,introAt=0;
const INSIGHT_AFTER=1.6; // s after the chapter starts: once the card is in
function insightGate(v){
  const key=v==="filterset"||v==="round"?`${S.ch}`:null;
  if(key!==introKey){introKey=key;introAt=performance.now()}
  $("#gfStack").dataset.notBefore=key?introAt+INSIGHT_AFTER*1000:0; // the insight's one owner (sim.js shotLabels) waits for this
}
