// Idle and the tour list (pick, sync, clear).
// Arriving on Idle (after loading, or back from a tour): the course flyover plays on its own first; the shade, the title and
// then the call to action come in over it (css: #idleArea.enter)
$("#idleFp").innerHTML=ICON.freeplay+"<span>Freeplay</span>";$("#idleFp").setAttribute("aria-label","Freeplay");
$("#idleFp").onclick=e=>{e.stopPropagation();act.handshakeFp();sfx.play("chime")}; // not the Idle tap (that starts the tour)
function idleIntro(){for(const el of [$("#idleArea"),$("#idleGrp")]){el.classList.remove("enter");void el.offsetWidth;el.classList.add("enter")}}
function renderIdle(){
  const cur=chosenTour(),gone=tourMemory.get()&&!cur;
  $("#idleKicker").textContent=cur?"Today's tour":"Welcome to Augusta";
  $("#idleTitle").textContent=cur?cur.title:gone?"Choose a new tour":"Choose a tour";
  $("#idleHint").textContent=cur?"Tap anywhere to begin":"Pick one from the list to begin";
}
function renderTourPicker(){
  const mem=tourMemory.get(),cur=chosenTour(),first=!mem,gone=mem&&!cur,open=S.tourList||!cur;
  $("#tourList").hidden=!open||S.menu==="sound"; // one panel at a time: Volume opens over the same corner
  // the Tour tile: light while its list is open (the tour's name is Idle's headline)
  $("#tourChip").innerHTML='<svg viewBox="0 0 32 32"><circle cx="7" cy="9" r="3"/><circle cx="7" cy="23" r="3"/><path d="M16 22H30V24H16zM16 8H30V10H16z"/></svg><span>Tour</span>';
  $("#tourChip").classList.toggle("on",open);$("#tourChip").setAttribute("aria-expanded",open);$("#tourChip").setAttribute("aria-label","Tour");
  $("#tlTitle").textContent=first?"Set up this screen":gone?"Choose a tour":"Tour";
  $("#tlNote").innerHTML=first?"Choose the tour this screen runs. It will be remembered."
    :gone?'<svg viewBox="0 0 32 32"><path d="M16 23a1.5 1.5 0 101.5 1.5A1.5 1.5 0 0016 23zM15 12H17V21H15z"/><path d="M29,30H3a1,1,0,0,1-.8872-1.4614l13-25a1,1,0,0,1,1.7744,0l13,25A1,1,0,0,1,29,30ZM4.6507,28H27.3493l.002-.0033L16.002,6.1714h-.004L4.6487,27.9967Z"/></svg><span>“'+mem.title+'” is no longer available.</span>':"";
  $("#tlNote").hidden=!first&&!gone;
  $("#tlRows").replaceChildren(...tourRows(t=>{tourMemory.set(t);TOUR=tourFor(t);S.tourList=false;sfx.play("toggle");render();toast("Tour set: "+t.title)}));
  const last=pinnedCache.get()?.at;
  $("#tlSync").disabled=syncing; $("#tlSync span").textContent=syncing?"Syncing…":"Sync with iPad"; $("#tlSync").classList.toggle("spin",syncing);
  $("#tlSynced").textContent=syncing?"":last?`Synced ${new Date(last).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})} · ${TOURS.length} pinned`:`${TOURS.length} pinned · not synced yet`;
  $("#tlClear").hidden=!mem;
}
// tour list rows; pick(t) runs when a row is tapped
function tourRows(pick){
  const cur=chosenTour();
  return TOURS.map(t=>{const b=el("button","item tl"+(t.id===cur?.id?" on":""));
    b.innerHTML=`<span><b>${t.title}${newTours.has(t.id)?' <em class="new">New</em>':""}</b><small>${t.info}</small></span>`+(t.id===cur?.id?'<svg viewBox="0 0 32 32"><path d="M13 24L4 15 5.414 13.586 13 21.171 26.586 7.586 28 9 13 24z"/></svg>':"");
    b.onclick=e=>{e.stopPropagation();pick(t)};
    return b});
}
// TEST (not the design yet): ?idlevideo plays the 6K flyover film on Idle over the live course.
// The film is 5280 × 1890 (2.79:1); it fills the 16:9 stage, so its sides are cropped.
// assets/idle-flyover.mp4 is a local link to Asset/ (1.1 GB, gitignored), so this only works locally.
const IDLE_VIDEO=new URLSearchParams(location.search).has("idlevideo");
if(IDLE_VIDEO){const v=el("video");v.dataset.v="idle";
  Object.assign(v,{src:"assets/idle-flyover.mp4",muted:true,loop:true,playsInline:true,autoplay:true});
  Object.assign(v.style,{position:"absolute",inset:"0",width:"100%",height:"100%",objectFit:"cover"});
  stage.prepend(v)}
