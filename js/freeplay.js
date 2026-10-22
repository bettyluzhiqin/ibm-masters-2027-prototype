// Freeplay filters: every category as a tile in the dock (stacked two wide, a set one light with its value); tapping a tile
// opens just that filter's control in the panel beside the dock. Compare is a tile too.
/* ---------- freeplay panel ---------- */
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e};
const chip=(label,on,fn)=>{const b=el("button","chip",label);b.setAttribute("aria-pressed",!!on);b.onclick=e=>{e.stopPropagation();sfx.play("tick");fn();renderFp();render()};return b};
const isOpen=(f,hi)=>f.open&&hi>=f.max;
// compare: two filter groups. The panel edits the active one; A is S.filters, B is S.filtersB.
const SCORE_COL=["#d4bbff","#ee5396","#ffafd2","#f1c21b","#f6f2ff","#82cfff","#78a9ff","#4589ff"]; // design colour key, same order as MASTERS_DATA.scores
const GROUP_COL={A:"#3ddbd9",B:"#ff832b"}; // IBM Teal 30 / Orange 40: hues the score colours never use, so a colour means one thing
const F=()=>S.compare&&S.group==="B"?S.filtersB:S.filters;
function fmt(k,v){
  const f=FILTERS[k];
  if(f.ui==="range") return (isOpen(f,v[1])?v[0]+"+":v[0]===v[1]?v[0]:v[0]+"–"+v[1])+(f.unit||"");
  if(k==="Hole"){ // 11, 12, 13, 15 -> 11–13, 15
    const n=v.map(Number),out=[];n.forEach((x,i)=>{if(i&&x===n[i-1]+1)out[out.length-1][1]=x;else out.push([x,x])});
    return out.map(([a,b])=>a===b?a:a+"–"+b).join(", ")}
  return v.length>3?v.length+" selected":v.join(", ");
}
// set a filter; empty selections and full ranges mean "all" and are dropped
function setF(k,v){
  const f=FILTERS[k];
  const all=f.ui==="range"?v[0]<=f.min&&(v[1]>=f.max):!v.length;
  const t=F(); if(all) delete t[k]; else t[k]=f.ui==="range"&&isOpen(f,v[1])?[v[0],1e9]:v;
  live();
}
function live(){S.flyHole=null;window.sim?.update(S,view());renderFTabs();renderOverview(view())}

// the category tiles (built once): an icon per filter, the label, and the current value when set
const CAT_ICON={Hole:'<path d="M7 21V3h11l-3 4 3 4H7"/><path d="M4 21h8"/>',Year:'<rect x="4" y="6" width="16" height="14"/><path d="M4 10h16M8 3v5M16 3v5"/>',
  Round:'<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 3"/>',Player:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/>',
  Shot:'<path d="M4 19C7 10 13 6 20 6"/><circle cx="20" cy="6" r="1.6"/>',Stroke:'<path d="M9 4 7 20M17 4l-2 16M4 9h16M3 15h16"/>',
  Region:'<path d="M12 4 21 9l-9 5-9-5z"/><path d="M3 14l9 5 9-5"/>',Sector:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".8"/>',
  Distance:'<path d="M3 15 15 3l6 6L9 21z"/><path d="M7 11l2 2M10 8l2 2M13 5l2 2"/>',Score:'<circle cx="12" cy="12" r="8"/><path d="M8 12h8"/>',
  Trophy:'<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v4M8 20h8"/>',
  Compare:'<circle cx="8" cy="12" r="5"/><circle cx="16" cy="12" r="5"/>'};
const CAT_LABEL={Stroke:"Strokes",Trophy:"Players"};
{const box=$("#fcats");[...Object.keys(FILTERS),"Compare"].forEach(k=>{const b=el("button","ftile");b.dataset.k=k;
  b.innerHTML=`<svg viewBox="0 0 24 24">${CAT_ICON[k]||""}</svg><span class="lb">${CAT_LABEL[k]||k}</span><span class="v"></span>`;
  b.onclick=e=>{e.stopPropagation();const same=S.panel==="filters"&&S.fpFilter===k;S.fpFilter=same?null:k;S.panel=same?null:"filters";
    if(k==="Compare"&&!same&&!S.compare){S.compare=true;S.filtersB=structuredClone(S.filters);S.group="B";live()}
    sfx.play(same?"close":"open");renderFp();render()};
  box.append(b)})}
function renderFTabs(){ // the tiles' state: set filters light with their value, the open one marked
  document.querySelectorAll(".ftile[data-k]").forEach(t=>{const k=t.dataset.k,v=k==="Compare"?(S.compare?(S.group==="B"?"Editing B":"Editing A"):null):F()[k];
    t.querySelector(".v").textContent=v?(k==="Compare"?v:fmt(k,v)):"";t.classList.toggle("has",!!v);t.classList.toggle("open",S.panel==="filters"&&S.fpFilter===k)});
}
function renderFp(){ // the panel: just the tapped category's control (and the group switch while comparing)
  const body=$("#fpBody");body.innerHTML="";const k=S.fpFilter;
  $("#fpTitle").textContent=!k?"Filters":k==="Compare"?"Compare":CAT_LABEL[k]||k;
  const wrap=(cls,kids)=>{const d=el("div",cls);d.append(...kids);body.append(d);return d};
  if(S.compare||k==="Compare"){
    const cmp=el("div","cmp");
    const setCompare=on=>{if(on===S.compare)return;S.compare=on;if(on){S.filtersB=structuredClone(S.filters);S.group="B"}else S.group="A";live()};
    if(k==="Compare")cmp.append(wrap("seg mode",[chip("One group",!S.compare,()=>setCompare(false)),chip("Compare",S.compare,()=>setCompare(true))]));
    if(S.compare){const sw=el("div","seg grp");["A","B"].forEach(g=>{const b=chip("",S.group===g,()=>S.group=g);
      b.innerHTML=`<i style="background:${GROUP_COL[g]}"></i>Group ${g}`;sw.append(b)});cmp.append(sw)}
    body.append(cmp);
  }
  if(k&&FILTERS[k]){const f=FILTERS[k],box=el("div","accbody single"),head=el("div","fhead");head.append(el("div","hint",f.hint||HINT[f.ui]));
    const clr=el("button","link","Clear");clr.onclick=e=>{e.stopPropagation();setF(k,f.ui==="range"?[f.min,f.max]:[]);renderFp()};head.append(clr);
    box.append(head,f.ui==="paint"?paint(k,f):f.ui==="range"?range(k,f):players(k,f));body.append(box);}
  renderFTabs();
}

// View panel options: how the shots are seen (the colour key simply follows the shots)

// paint-select: press on an option to toggle it, keep dragging to give the same state to every option you pass over
function paint(k,f){
  const sel=new Set(F()[k]||[]),box=el("div",f.layout+" paint");
  f.opts.forEach(o=>{const b=el("button","chip"+(f.cls?" "+f.cls(o):""),f.label?null:o);if(f.label)b.innerHTML=f.label(o);b.dataset.opt=o;b.setAttribute("aria-pressed",sel.has(o));box.append(b)});
  let mode=null;
  const hit=e=>{const b=document.elementFromPoint(e.clientX,e.clientY)?.closest(".chip");return b&&box.contains(b)?b:null};
  const apply=b=>{if(!b||sel.has(b.dataset.opt)===mode)return;mode?sel.add(b.dataset.opt):sel.delete(b.dataset.opt);
    b.setAttribute("aria-pressed",mode);sfx.play("tick");setF(k,FILTERS[k].opts.filter(o=>sel.has(o)))};
  box.onpointerdown=e=>{const b=hit(e);if(!b)return;box.setPointerCapture(e.pointerId);mode=!sel.has(b.dataset.opt);apply(b)};
  box.onpointermove=e=>{if(mode!==null)apply(hit(e))};
  box.onpointerup=box.onpointercancel=()=>{mode=null};
  box.onclick=e=>e.stopPropagation();
  return box;
}

// two-handle range slider; the handle nearest the finger follows it
function range(k,f){
  const cur=F()[k]||[f.min,f.max],v=[cur[0],Math.min(cur[1],f.max)];
  const box=el("div","range"),val=el("div","rv"),track=el("div","track"),fill=el("div","fill"),t0=el("i","th"),t1=el("i","th"),ticks=el("div","ticks");
  track.append(fill,t0,t1);box.append(track,ticks); // value lives in the accordion row
  f.ticks.forEach(x=>{const t=el("span",null,isOpen(f,x)?x+"+":x);t.style.left=pct(x)+"%";ticks.append(t)});
  if(f.marks) for(let x=f.min;x<=f.max;x+=f.markStep||f.step){const m=el("i","mark");m.style.left=pct(x)+"%";track.append(m)} // small ticks: every year / every 50 yd
  function pct(x){return (x-f.min)/(f.max-f.min)*100}
  function draw(){t0.style.left=pct(v[0])+"%";t1.style.left=pct(v[1])+"%";fill.style.left=pct(v[0])+"%";fill.style.width=pct(v[1])-pct(v[0])+"%";
    val.textContent=v[0]<=f.min&&v[1]>=f.max?"All":fmt(k,v)}
  const at=e=>{const r=track.getBoundingClientRect(),x=Math.min(Math.max((e.clientX-r.left)/r.width,0),1);
    return Math.min(f.max,f.min+Math.round(x*(f.max-f.min)/f.step)*f.step)}; // last stop is the true maximum
  let which=null;
  const move=e=>{const x=at(e),nv=which?Math.max(x,v[0]):Math.min(x,v[1]);if(nv===v[which])return;v[which]=nv;draw();sfx.play("tickSoft");setF(k,[...v])};
  track.onpointerdown=e=>{track.setPointerCapture(e.pointerId);const x=at(e);
    which=Math.abs(x-v[1])<Math.abs(x-v[0])||(v[0]===v[1]&&x>v[1])?1:0;move(e)};
  track.onpointermove=e=>{if(which!==null)move(e)};
  track.onpointerup=track.onpointercancel=()=>{which=null};
  box.onclick=e=>e.stopPropagation();
  draw();return box;
}

// players: no typing on a 110" screen. A surname A–Z rail you can scrub, and tiles for one letter at a time.
const LAST=new Map(MASTERS_DATA.players.map((n,i)=>[n,MASTERS_DATA.lastNames[i]])); // real last names from the data
const surname=p=>LAST.get(p)||p.split(" ").at(-1); // "Fernandez de Oliveira", "Howell III"
const initial=p=>surname(p).normalize("NFD")[0].toUpperCase(); // Åberg -> A
function players(k,f){
  const box=el("div","players"),letters=[...new Set(f.opts.map(initial))].sort();
  const sel=()=>new Set(F()[k]||[]);
  if(!S.pLetter) S.pLetter=initial((F()[k]||f.opts)[0]);
  const top=el("div","fhead");top.append(el("span","muted",""));box.append(top);
  // A–Z rail
  const rail=el("div","rail"),tiles=el("div");
  letters.forEach(L=>{const b=el("button",null,L);b.dataset.letter=L;rail.append(b)});
  const draw=()=>{
    const s2=sel();
    rail.querySelectorAll("button").forEach(b=>{b.setAttribute("aria-pressed",b.dataset.letter===S.pLetter);
      b.classList.toggle("has",f.opts.some(o=>initial(o)===b.dataset.letter&&s2.has(o)))});
    top.lastChild.textContent=s2.size?s2.size+" selected":"";
    // up to ~30 players per letter: the tiles scroll (drag), a tap toggles one
    const grid=el("div","grid pgrid ptiles");
    f.opts.filter(o=>initial(o)===S.pLetter).forEach(o=>{const b=el("button","chip");
      b.innerHTML=`<b>${surname(o)}</b><small>${o.slice(0,-surname(o).length).trim()}${MASTERS.winners.includes(o)?" · Champion":""}</small>`;
      b.setAttribute("aria-pressed",s2.has(o));
      b.onclick=e=>{e.stopPropagation();const s3=sel();s3.has(o)?s3.delete(o):s3.add(o);b.setAttribute("aria-pressed",s3.has(o));sfx.play("tick");
        setF(k,f.opts.filter(x=>s3.has(x)));tiles.dispatchEvent(new Event("pointerup"))};
      grid.append(b)});
    tiles.replaceChildren(grid);
  };
  let scrub=false;
  const pickAt=e=>{const b=document.elementFromPoint(e.clientX,e.clientY)?.closest("[data-letter]");
    if(b&&rail.contains(b)&&b.dataset.letter!==S.pLetter){S.pLetter=b.dataset.letter;sfx.play("tickSoft");draw()}};
  rail.onpointerdown=e=>{scrub=true;rail.setPointerCapture(e.pointerId);pickAt(e)};
  rail.onpointermove=e=>{if(scrub)pickAt(e)};
  rail.onpointerup=rail.onpointercancel=()=>{scrub=false};
  rail.onclick=e=>e.stopPropagation();
  // tiles change selection: refresh letter dots and count without rebuilding the tiles mid-drag
  tiles.addEventListener("pointerup",()=>{const s2=sel();rail.querySelectorAll("button").forEach(b=>b.classList.toggle("has",f.opts.some(o=>initial(o)===b.dataset.letter&&s2.has(o))));
    top.lastChild.textContent=s2.size?s2.size+" selected":"";});
  box.append(rail,tiles);draw();
  return box;
}
