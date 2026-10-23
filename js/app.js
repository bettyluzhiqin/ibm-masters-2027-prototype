// The app: state, actions, input (touch, keys, sliders) and the presenter settings.
// IBM Carbon icons (@carbon/icons 11.48.0, 32px set)
const ICON={
  next:'<svg viewBox="0 0 32 32"><path d="M22 16L12 26 10.6 24.6 19.2 16 10.6 7.4 12 6z"/></svg>',
  prev:'<svg viewBox="0 0 32 32"><path d="M10 16L20 6 21.4 7.4 12.8 16 21.4 24.6 20 26z"/></svg>',
  sound:'<svg viewBox="0 0 32 32"><path d="M27.16,8.08,25.63,9.37a10,10,0,0,1-.29,13.23L26.81,24a12,12,0,0,0,.35-15.88Z"/><path d="M21.58 12a6 6 0 01-.18 7.94l1.47 1.36a8 8 0 00.23-10.59zM18 30a1 1 0 01-.71-.3L9.67 22H3a1 1 0 01-1-1H2V11a1 1 0 011-1H9.67l7.62-7.7a1 1 0 011.41 0A1 1 0 0119 3V29A1 1 0 0118 30zM4 20h6.08a1 1 0 01.71.3L17 26.57V5.43L10.79 11.7a1 1 0 01-.71.3H4z"/></svg>',
  soundLow:'<svg viewBox="0 0 32 32"><path d="M25.1 10.66L23.58 12a6 6 0 01-.18 7.94l1.47 1.36a8 8 0 00.23-10.59zM20 30a1 1 0 01-.71-.3L11.67 22H5a1 1 0 01-1-1H4V11a1 1 0 011-1h6.67l7.62-7.7a1 1 0 011.41 0A1 1 0 0121 3V29A1 1 0 0120 30zM6 20h6a1.17 1.17 0 01.79.3L19 26.57V5.43L12.79 11.7A1.17 1.17 0 0112 12H6z"/></svg>',
  mute:'<svg viewBox="0 0 32 32"><path d="M31 12.41L29.59 11 26 14.59 22.41 11 21 12.41 24.59 16 21 19.59 22.41 21 26 17.41 29.59 21 31 19.59 27.41 16 31 12.41zM18 30a1 1 0 01-.71-.3L9.67 22H3a1 1 0 01-1-1H2V11a1 1 0 011-1H9.67l7.62-7.7a1 1 0 011.41 0A1 1 0 0119 3V29A1 1 0 0118 30zM4 20h6a1.17 1.17 0 01.79.3L17 26.57V5.43L10.79 11.7A1.17 1.17 0 0110 12H4z"/></svg>',
  more:'<svg viewBox="0 0 32 32"><circle cx="8" cy="16" r="2"/><circle cx="16" cy="16" r="2"/><circle cx="24" cy="16" r="2"/></svg>',
  filters:'<svg viewBox="0 0 32 32"><path d="M30 8h-4.1c-.5-2.3-2.5-4-4.9-4s-4.4 1.7-4.9 4H2v2h14.1c.5 2.3 2.5 4 4.9 4s4.4-1.7 4.9-4H30V8zM21 12c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3S22.7 12 21 12zM2 24h4.1c.5 2.3 2.5 4 4.9 4s4.4-1.7 4.9-4H30v-2H15.9c-.5-2.3-2.5-4-4.9-4s-4.4 1.7-4.9 4H2V24zM11 20c1.7 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3S9.3 20 11 20z"/></svg>',
  freeplay:'<svg viewBox="0 0 32 32"><path d="M7.51,26a5.48,5.48,0,0,1-1.44-.19A5.6,5.6,0,0,1,2.19,19l2.33-8.84A5.54,5.54,0,0,1,7.11,6.73a5.43,5.43,0,0,1,4.15-.54A5.52,5.52,0,0,1,14.7,9h2.6a5.49,5.49,0,0,1,3.44-2.81,5.43,5.43,0,0,1,4.15.54,5.57,5.57,0,0,1,2.59,3.41L29.81,19a5.6,5.6,0,0,1-3.89,6.83,5.43,5.43,0,0,1-4.15-.54,5.54,5.54,0,0,1-2.59-3.41L19,21H13l-.23.86a5.54,5.54,0,0,1-2.59,3.41A5.46,5.46,0,0,1,7.51,26ZM9.83,8a3.49,3.49,0,0,0-1.72.46,3.6,3.6,0,0,0-1.66,2.19L4.12,19.49A3.6,3.6,0,0,0,6.6,23.88a3.43,3.43,0,0,0,2.62-.34,3.54,3.54,0,0,0,1.66-2.19L11.5,19h9l.61,2.35a3.58,3.58,0,0,0,1.66,2.19,3.46,3.46,0,0,0,2.63.34,3.58,3.58,0,0,0,2.47-4.39l-2.33-8.84a3.55,3.55,0,0,0-1.65-2.19,3.46,3.46,0,0,0-2.63-.34,3.55,3.55,0,0,0-2.37,2.22l-.24.66h-5.3l-.24-.66a3.56,3.56,0,0,0-2.38-2.22A3.48,3.48,0,0,0,9.83,8Z"/><path d="M10,16a2,2,0,1,1,2-2A2,2,0,0,1,10,16Zm0-2Z"/><circle cx="22" cy="12" r="1"/><circle cx="22" cy="16" r="1"/><circle cx="20" cy="14" r="1"/><circle cx="24" cy="14" r="1"/></svg>',
  back:'<svg viewBox="0 0 32 32"><path d="m22,8v2c2.2061,0,4,1.7944,4,4s-1.7939,4-4,4h-12v-5l-6,6,6,6v-5h12c3.3086,0,6-2.6914,6-6s-2.6914-6-6-6Z"/></svg>',
  end:'<svg viewBox="0 0 32 32"><path d="M16,2A14,14,0,1,0,30,16,14,14,0,0,0,16,2Zm6,18a2,2,0,0,1-2,2H12a2,2,0,0,1-2-2V12a2,2,0,0,1,2-2h8a2,2,0,0,1,2,2Z"/></svg>',
  close:'<svg viewBox="0 0 32 32"><path d="M17.4141 16L24 9.4141 22.5859 8 16 14.5859 9.4143 8 8 9.4141 14.5859 16 8 22.5859 9.4143 24 16 17.4141 22.5859 24 24 22.5859 17.4141 16z"/></svg>'};

document.querySelector("[data-act=more]").innerHTML=ICON.more;
document.querySelector("[data-act=prev]").innerHTML='<svg viewBox="0 0 32 32"><path d="M14 26L15.41 24.59 7.83 17 28 17 28 15 7.83 15 15.41 7.41 14 6 4 16 14 26z"/></svg><span>Previous</span>';

const S={view:"idle",ch:0,step:0,mode:"tour",muted:false,volume:70,
  menu:null,fpFilter:null,filters:{},compare:false,panel:null,group:"A",filtersB:{},flyHole:null,frameTick:0,resetTick:0,display:{shots:true,names:false,data:"Arcs",key:false}};
let resume=null;
const $=s=>document.querySelector(s), stage=$("#stage");

function chapter(){return TOUR.chapters[S.ch]}
const steps=c=>c.steps?c.steps.length:c.n||1;
// what the sim draws in a tour chapter (data filters or game-focus steps); null outside a tour
const simChapter=()=>S.view==="tour"&&S.mode==="tour"?chapter():null;
function view(){ // what Unreal shows right now
  if(S.view!=="tour") return S.view;
  return S.mode==="tour"?chapter().type:"freeplay";
}
function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove("show"),1600)}
function go(v){S.view=v;S.menu=null;S.panel=null;
  render()}

const act={
  handshake(){S.mode="tour";S.ch=0;S.step=0;TOUR=tourFor(chosenTour());go("tour")}, // straight into chapter 1
  tourList(){S.tourList=!S.tourList;render()},
  handshakeFp(){S.mode="solo";go("tour")},
  next(){
    const c=chapter();
    if(S.mode!=="tour") return;
    if(S.step<steps(c)-1){S.step++;return render()}
    if(S.ch===TOUR.chapters.length-1){sfx.play("end");return go("idle")} // the tour ends on Idle, the same screen it started from
    S.ch++;S.step=0;render()},
  prev(){
    if(S.mode!=="tour") return;
    if(S.step>0){S.step--;return render()}
    if(S.ch>0){S.ch--;S.step=steps(chapter())-1;render()}},
  sound(){S.menu=S.menu==="sound"?null:"sound";render()},
  mute(){S.muted=!S.muted;render()},
  panelFilters(){S.panel=S.panel==="filters"?null:"filters";render()}, // one panel at a time
  toggleNames(){S.display.names=!S.display.names;render()},
  toggleKey(){S.display.key=!S.display.key;render()}, // the colour key card under the overview
  // arcs / ball: pick how shots are drawn; tapping the one that is on hides the shots
  showArcs(){const on=S.display.shots&&S.display.data==="Arcs";S.display.shots=!on;S.display.data="Arcs";render()},
  // reset view: default camera for this chapter, framed on the selection, arcs only
  resetView(){if(S.mode==="tour"&&["filterset","round"].includes(view())){window.sim?.backToStory?.();toast("Back to the story");return} // a tour: back to the story's view
    S.flyHole=null;S.display={...S.display,shots:true,names:false,data:"Arcs"};S.panel=null;S.resetTick++;render();toast("View reset")}, // back to the whole course
  showBalls(){const on=S.display.shots&&S.display.data==="Balls";S.display.shots=!on;S.display.data="Balls";render()},
  breakout(){S.panel=null;resume={ch:S.ch,step:S.step};S.mode="breakout";render();toast("Freeplay")},
  back(){
    if(S.mode==="solo") return confirm("End Freeplay?","The screen goes back to Idle.","End",()=>go("idle"));
    S.mode="tour";Object.assign(S,resume);render()},
  more(){S.menu=S.menu==="more"?null:"more";render()},
  restartTour(){S.ch=0;S.step=0;S.mode="tour";S.menu=null;go("idle")}, // like a tour change: back to Idle, a tap starts chapter 1
  askRestart(){confirm("Restart tour?","The screen returns to Idle. Tap to start again from the first chapter.","Restart",()=>act.restartTour())},
  sideLeft(){stage.dataset.side="left";render()},
  sideRight(){stage.dataset.side="right";render()},
  askChangeTour(){S.menu="tours";render()},
  askExit(){S.mode==="solo"?confirm("End Freeplay?","The screen goes back to Idle.","End",()=>go("idle")):confirm("Exit tour?","The screen goes back to Idle.","Exit",()=>go("idle"))},
  cancel(){S.menu=S.confirmBack||null;S.confirmBack=null;render()},
  confirm(){S.onConfirm()},
};
function confirm(t,b,ok,fn,back=null){$("#cTitle").textContent=t;$("#cBody").textContent=b;$("#confirm [data-act=confirm]").textContent=ok;
  $("#cEb").textContent=S.mode==="solo"?"Freeplay":"Tour";$("#confirm").classList.toggle("leave",["End","Restart","Exit"].includes(ok)); // leaving: a quiet warm red; going somewhere: Masters green
  S.onConfirm=fn;S.confirmBack=back;S.menu="confirm";render()}

// UI sound per action (audio.js); calm, wooden, outdoors
const SOUND_FOR={handshake:"start",handshakeFp:"chime",next:"next",prev:"prev",breakout:"enter",back:"exit",
  panelFilters:"toggle",toggleNames:"toggle",toggleKey:"toggle",showArcs:"toggle",showBalls:"toggle",sound:"open",mute:"toggle",more:"open",askRestart:"open",askExit:"open",askChangeTour:"open",cancel:"close",confirm:"exit",sideLeft:"tick",sideRight:"tick"};
// actions that belong to an open menu; anything else (Next, Previous, Freeplay, Back to tour…) closes the menu first
const MENU_ACTS=new Set(["more","sound","mute","askRestart","askChangeTour","askExit","sideLeft","sideRight","cancel","confirm"]);
stage.addEventListener("click",e=>{const a=e.target.closest("[data-act]");if(a&&act[a.dataset.act]){e.stopPropagation();
  const k=a.dataset.act;if(!MENU_ACTS.has(k)&&S.menu){S.menu=null;S.confirmBack=null}act[k]();sfx.play(k==="back"&&S.menu==="confirm"?"open":SOUND_FOR[k])}});
{let t=null,held=false;const a=$("#idleArea");
 a.onpointerdown=()=>{held=false;t=setTimeout(()=>{held=true;act.handshakeFp();sfx.play("chime")},700)};
 a.onpointerup=a.onpointercancel=a.onpointerleave=()=>clearTimeout(t);
 a.onclick=e=>{e.stopPropagation();if(held)return;
   if(!chosenTour()){S.tourList=true;render();return} // nothing to start yet: show the list
   S.tourList=false;act.handshake();sfx.play("start")};
 $("#tourChip").onclick=e=>{e.stopPropagation();sfx.play(S.tourList?"close":"open");act.tourList()};
 $("#tourList").onclick=e=>e.stopPropagation();
 // Sync: fetch the pinned list from the iPad (simulated delay); if the default tour is gone, Idle falls back to "Choose a new tour"
 $("#tlSync").onclick=e=>{e.stopPropagation();if(syncing)return;syncing=true;sfx.play("open");render();
   setTimeout(()=>{const before=new Set(TOURS.map(t=>t.id));TOURS=PINNED_ON_IPAD.slice();newTours=new Set(TOURS.filter(t=>!before.has(t.id)).map(t=>t.id));
     pinnedCache.set({tours:TOURS,at:Date.now()});syncing=false;sfx.play("toggle");render();
     toast(newTours.size?`Synced · ${newTours.size} new tour${newTours.size>1?"s":""}`:"Synced · up to date")},1200)};
 // Clear default: forget this screen's tour; Idle goes back to the welcome and the list
 $("#tlClear").onclick=e=>{e.stopPropagation();try{localStorage.removeItem("masters.tour")}catch{}S.tourList=true;sfx.play("close");render();toast("Default tour cleared")};}
document.addEventListener("keydown",e=>{if(S.view==="idle"&&e.key==="f")act.handshakeFp();if(S.view!=="tour")return;if(e.key==="ArrowRight")act.next();if(e.key==="ArrowLeft")act.prev()});

// screen: venue presets set the base size; UI size (0–100) fine-tunes it. Both remembered on this screen
function applyScreenUI(){
  const mm=SCREEN_MM,p=Object.values(SCREENS).find(x=>x.mm===mm),pct=UI_SIZE;
  $("#scrRead").textContent=`${p?p.name+" · ":""}${(mm/1000).toFixed(2)} m wide`;
  $("#uiRead").textContent=UI_SIZE===50?"50 · recommended":String(UI_SIZE);
  $("#scrPresets").replaceChildren(...Object.values(SCREENS).map(x=>{const b=document.createElement("button");b.className="chip";b.textContent=x.short;
    b.setAttribute("aria-pressed",x.mm===mm);b.onclick=e=>{e.stopPropagation();setScreen(x.mm);sfx.play("toggle")};return b}));
  $("#scrTrack .fill").style.cssText=`left:0;width:${pct}%`;$("#scrTrack .th").style.left=pct+"%";
}
function setScreen(mm,size=50){if(mm===SCREEN_MM&&size===UI_SIZE)return;applyScreen(mm,size);screenMem.set(mm);uiSizeMem.set(size);applyScreenUI();render()} // a preset resets UI size to 50
{const t=$("#scrTrack");let drag=false;
 const set=e=>{const r=t.getBoundingClientRect(),f=Math.min(Math.max((e.clientX-r.left)/r.width,0),1);
   const n=Math.round(f*20)*5;if(n!==UI_SIZE){setScreen(SCREEN_MM,n);sfx.play("tickSoft")}};
 t.onpointerdown=e=>{drag=true;try{t.setPointerCapture(e.pointerId)}catch{}set(e)};
 t.onpointermove=e=>{if(drag)set(e)};
 t.onpointerup=t.onpointercancel=()=>{drag=false};
 t.onclick=e=>e.stopPropagation();}
/* ---------- volume slider: drag anywhere on the track; dragging also unmutes ---------- */
{const t=$("#volTrack");let drag=false;
 const set=e=>{const r=t.getBoundingClientRect();const nv=Math.round(Math.min(Math.max((e.clientX-r.left)/r.width,0),1)*20)*5;if(nv!==S.volume||S.muted){S.volume=nv;S.muted=false;render();sfx.play("tickSoft")}};
 t.onpointerdown=e=>{drag=true;t.setPointerCapture(e.pointerId);set(e)};
 t.onpointermove=e=>{if(drag)set(e)};
 t.onpointerup=t.onpointercancel=()=>{drag=false};
 $("#sound").onclick=e=>{if(!e.target.closest("[data-act]"))e.stopPropagation()};}

/* ---------- camera: the course takes the gestures; tap a hole to focus it; Frame selection returns to the filters ---------- */
addEventListener("hole-tap",e=>{if(view()!=="freeplay")return;S.flyHole=e.detail;sfx.play("next");render();toast("Hole "+e.detail+" · "+MASTERS.holes[e.detail-1].name)});
// the same close (x) on every panel that floats over the course: top-right corner, closes just that panel
[["#confirm",()=>{S.menu=S.confirmBack||null;S.confirmBack=null}],["#sound",()=>{S.menu=null}],["#more",()=>{S.menu=null}],["#tourPop",()=>{S.menu=null}],["#tourList",()=>{S.tourList=false}]].forEach(([sel,fn])=>{
  const b=document.createElement("button");b.className="phx xclose";b.innerHTML=ICON.close;b.setAttribute("aria-label","Close");b.onclick=e=>{e.stopPropagation();fn();sfx.play("close");render()};$(sel).prepend(b)});
$("#fpClose").innerHTML=`<i class="fic" style="--ic:url(${new URL("assets/icons/filters/close.svg",location.href).href})"></i>`;$("#fpClose").onclick=e=>{e.stopPropagation();S.panel=null;S.fpFilter=null;sfx.play("close");render()}; // same as tapping the open tile again
