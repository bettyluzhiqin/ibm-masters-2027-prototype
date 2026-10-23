// Freeplay filters: every category as a tile in the dock (stacked two wide; the open one cream, a set one with a yellow dot); tapping a tile
// opens just that filter's control in the panel beside the dock. Compare is not a filter: it is the row above the tiles that
// says which group the tiles edit (off: one Compare button; on: Group A | Group B, with End compare in the Filters header).
/* ---------- freeplay panel ---------- */
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e};
const isOpen=(f,hi)=>f.open&&hi>=f.max;
// compare: two filter groups. The panel edits the active one; A is S.filters, B is S.filtersB.
const F=()=>S.compare&&S.group==="B"?S.filtersB:S.filters;
function fmt(k,v){
  const f=FILTERS[k];
  if(f.ui==="range"){const r=x=>Math.round(x);return (isOpen(f,v[1])?r(v[0])+"+":v[0]===v[1]?r(v[0]):r(v[0])+" – "+r(v[1]))+(f.unit||"")}
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

// the column (built once): a square tile per filter, icon above its label (Figma Filter v3 › Filter Menu); a set tile has a yellow dot (no value on it: the panel and the card say what is chosen)
const ICON_URL=n=>new URL(`assets/icons/filters/${n}.svg`,location.href).href; // absolute: a url() inside a CSS variable resolves against the stylesheet
const icon=k=>`<i class="fic" style="--ic:url(${ICON_URL(FILTERS[k].icon)})"></i>`; // the design's own SVGs, tinted with currentColor
const LABEL=k=>FILTERS[k].label||k;
const CMP_ICON='<svg viewBox="0 0 32 32"><path d="M28,6H18V4a2,2,0,0,0-2-2H4A2,2,0,0,0,2,4V24a2,2,0,0,0,2,2H14v2a2,2,0,0,0,2,2H28a2,2,0,0,0,2-2V8A2,2,0,0,0,28,6ZM4,15h6.17L7.59,17.59,9,19l5-5L9,9,7.59,10.41,10.17,13H4V4H16V24H4ZM16,28V26a2,2,0,0,0,2-2V8H28v9H21.83l2.58-2.59L23,13l-5,5,5,5,1.41-1.41L21.83,19H28v9Z"/></svg>'; // Carbon compare
const setCompare=on=>{if(on===S.compare)return;S.compare=on;if(on){S.filtersB=structuredClone(S.filters);S.group="B"}else S.group="A";live()};
{const box=$("#fcats"),row=el("div","fcmp");box.append(row);Object.keys(FILTERS).filter(k=>!FILTERS[k].hidden).forEach(k=>{const b=el("button","ftile");b.dataset.k=k;
  b.innerHTML=`${icon(k)}<span class="lb">${LABEL(k)}</span>`;
  b.onclick=e=>{e.stopPropagation();const same=S.panel==="filters"&&S.fpFilter===k;S.fpFilter=same?null:k;S.panel=same?null:"filters";
    sfx.play(same?"close":"open");renderFp();render()};
  box.append(b)});
  // Clear all: the grid's last slot. Clears the group being edited; dimmed when nothing is set
  const c=el("button","ftile fclear");c.id="fClear";c.innerHTML='<svg viewBox="0 0 32 32"><path d="M30 11.414L28.586 10 24 14.586 19.414 10 18 11.414 22.586 16 18 20.585 19.415 22 24 17.414 28.587 22 30 20.587 25.414 16 30 11.414z"/><path d="M4,4A2,2,0,0,0,2,6V9.1709a2,2,0,0,0,.5859,1.4145L10,18v8a2,2,0,0,0,2,2h4a2,2,0,0,0,2-2V24H16v2H12V17.1709l-.5859-.5855L4,9.1709V6H24V8h2V6a2,2,0,0,0-2-2Z"/></svg><span class="lb">Clear all</span>';
  c.onclick=e=>{e.stopPropagation();const t=F();Object.keys(t).forEach(k=>delete t[k]);sfx.play("toggle");live();renderFp();render()};box.append(c)}
function renderCmp(){ // the Compare row: one button, or the two groups the tiles follow; "End compare" sits in the Filters header
  const row=$("#fcats .fcmp"),b=(cls,html,fn)=>{const x=el("button",cls);x.innerHTML=html;x.onclick=e=>{e.stopPropagation();sfx.play("tick");fn();renderFp();render()};return x};
  row.replaceChildren(...(!S.compare?[b("ftile wide",CMP_ICON+'<span class="lb">Compare</span>',()=>setCompare(true))]
    :["A","B"].map(g=>{const x=b("ftile fg"+(S.group===g?" on":""),`<i style="background:${GROUP_COL[g]}">${g}</i><span class="lb">Group ${g}</span>`,()=>S.group=g);x.setAttribute("aria-pressed",S.group===g);return x})));
  let end=$("#fcats .fend");if(!end){end=b("fend",ICON.close+'End compare',()=>setCompare(false));$("#fcats .fch").append(end)}
  end.hidden=!S.compare;
  $("#fcats").style.setProperty("--grp",S.compare?GROUP_COL[S.group]:"transparent");
}
// the panel's footer line: what is chosen, short (Figma: "2,3,7" · "Fairway, Green" · "M. Brennan, C. Conners, +7")
function summary(k,v){
  if(!v) return "All";const f=FILTERS[k];
  if(f.ui==="range"||k==="Hole") return fmt(k,v);
  if(k==="Player"){const n=p=>p.split(" ")[0][0]+". "+surname(p);return v.slice(0,2).map(n).join(", ")+(v.length>2?`, +${v.length-2}`:"")}
  if(k==="Region") return v.map(f.name).join(", ");
  if(k==="Sector") return v.map(sectorName).join(", ");
  if(k==="Round") return v.map(r=>r.slice(1)).join(", ");
  return v.join(", ");
}
function renderFTabs(){ // the tiles' state: set filters dotted, the open one cream; the panel footer
  renderCmp();
  document.querySelectorAll(".ftile[data-k]").forEach(t=>{const k=t.dataset.k,v=F()[k];
    t.classList.toggle("has",!!v);t.classList.toggle("open",S.panel==="filters"&&S.fpFilter===k)});
  $("#fClear").disabled=!Object.keys(F()).length;
  const k=S.fpFilter;if(k&&FILTERS[k]){$("#fpSum").textContent=summary(k,F()[k]);$("#fpClear").disabled=!F()[k]}
}
// the panel: the tapped filter's control, for the group the Compare row has selected (Figma Filter v3: header, control, footer)
$("#fpClear").onclick=e=>{e.stopPropagation();const k=S.fpFilter;if(!k)return;setF(k,[]);sfx.play("toggle");renderFp()};
function renderFp(){
  const k=S.fpFilter,f=FILTERS[k],body=$("#fpBody");body.replaceChildren();
  if(!f){renderFTabs();return}
  $("#fpHead").innerHTML=`${icon(k)}<span>${LABEL(k)}</span>${S.compare?`<small>Group ${S.group}</small>`:""}`;
  body.append(BUILD[f.ui](k,f));
  renderFTabs();
}

// choose any number: press a tile and keep dragging to give the same state to every tile you pass over. An "All" tile clears
function paintable(k,f,box){
  const sel=new Set(F()[k]||[]);
  const sync=()=>{box.querySelectorAll(".ft[data-opt]").forEach(b=>b.setAttribute("aria-pressed",sel.has(b.dataset.opt)));
    const a=box.querySelector(".ft.all");if(a)a.setAttribute("aria-pressed",!sel.size)};
  let mode=null;
  const hit=e=>{const b=document.elementFromPoint(e.clientX,e.clientY)?.closest(".ft[data-opt]");return b&&box.contains(b)?b:null};
  const apply=b=>{if(!b||sel.has(b.dataset.opt)===mode)return;mode?sel.add(b.dataset.opt):sel.delete(b.dataset.opt);sync();sfx.play("tick");setF(k,f.opts.filter(o=>sel.has(o)))};
  box.onpointerdown=e=>{if(e.target.closest(".ft.all")){sel.clear();sync();sfx.play("tick");setF(k,[]);return}
    const b=hit(e);if(!b)return;try{box.setPointerCapture(e.pointerId)}catch{};mode=!sel.has(b.dataset.opt);apply(b)};
  box.onpointermove=e=>{if(mode!==null)apply(hit(e))};
  box.onpointerup=box.onpointercancel=()=>{mode=null};
  box.onclick=e=>e.stopPropagation();
  sync();return box;
}
const grid=(cols,cls="")=>{const g=el("div","ftiles "+cls);g.style.setProperty("--cols",cols);return g};
function tiles(k,f){ // Hole (All + 1–18, seven across), Round (four large)
  const g=grid(f.cols,f.big?"big":"sq");
  if(f.all)g.append(Object.assign(el("button","ft all","All")));
  f.opts.forEach(o=>{const b=el("button","ft",f.name?f.name(o):o);b.dataset.opt=o;g.append(b)});
  return paintable(k,f,g);
}
function color(k,f){ // Region, Score: the data colour along the top; a chosen tile fills with it
  const g=grid(f.cols,"color");
  f.opts.forEach(o=>{const b=el("button","ft");b.dataset.opt=o;b.style.setProperty("--c",f.color(o));
    b.innerHTML=`<b>${f.name(o)}</b>${f.caption?`<small>${f.caption(o)}</small>`:""}`;g.append(b)});
  return paintable(k,f,g);
}
const sectorName=o=>o.replace("Greenside ","").replace(/^./,c=>c.toUpperCase());
function sectors(k,f){ // around the green (back row at the top), then the fairway sides
  const box=el("div","fsectors");
  for(const [t,os,c] of [["Around the green",f.opts.filter(o=>o.startsWith("Greenside")),3],["Fairway",f.opts.filter(o=>o.startsWith("Fairway")),2]]){
    box.append(el("div","fgl",t));const g=grid(c);os.forEach(o=>{const b=el("button","ft",sectorName(o));b.dataset.opt=o;g.append(b)});box.append(g)}
  return paintable(k,f,box);
}
function seg(k,f){ // choose exactly one; the first option means all
  const box=el("div","fseg"),cur=()=>F()[k]?.[0]??f.opts[0];
  const sync=()=>box.querySelectorAll(".ft").forEach(b=>b.setAttribute("aria-pressed",b.dataset.opt===cur()));
  f.opts.forEach(o=>{const b=el("button","ft",o);b.dataset.opt=o;b.onclick=e=>{e.stopPropagation();setF(k,o===f.opts[0]?[]:[o]);sfx.play("tick");sync()};box.append(b)});
  sync();return box;
}

// two endpoints on ordered values: the bar is a row of cells (a year, a stroke, 10 yd); the chosen span is light, a grip at each end
function range(k,f){
  const cur=F()[k]||[f.min,f.max],v=[cur[0],Math.min(cur[1],f.max)];
  const n=Math.round((f.max-f.min)/f.step)+1,cell=x=>Math.round((x-f.min)/f.step),val=i=>Math.min(f.max,f.min+i*f.step);
  const bar=el("div","fbar"),sel=el("div","fsel"),lab=el("span");sel.append(lab,el("i","grip"),el("i","grip"));bar.append(sel);
  const every=Math.round((f.markStep||f.step)/f.step),ticks=[];
  for(let i=every;i<n;i+=every){const t=el("i","fstep");t.style.left=i/n*100+"%";bar.append(t);ticks.push([i,t])}
  function draw(){const a=cell(v[0]),b=cell(v[1])+1;sel.style.left=a/n*100+"%";sel.style.width=(b-a)/n*100+"%";
    lab.textContent=fmt(k,v);sel.classList.toggle("narrow",b-a<2);ticks.forEach(([i,t])=>t.classList.toggle("in",i>a&&i<b))}
  const at=e=>{const r=bar.getBoundingClientRect();return val(Math.min(n-1,Math.max(0,Math.floor((e.clientX-r.left)/r.width*n))))};
  let which=null;
  const move=e=>{const x=at(e),nv=which?Math.max(x,v[0]):Math.min(x,v[1]);if(nv===v[which])return;v[which]=nv;draw();sfx.play("tickSoft");setF(k,[...v])};
  bar.onpointerdown=e=>{try{bar.setPointerCapture(e.pointerId)}catch{};const x=at(e);which=Math.abs(x-v[1])<Math.abs(x-v[0])||(v[0]===v[1]&&x>v[1])?1:0;move(e)};
  bar.onpointermove=e=>{if(which!==null)move(e)};
  bar.onpointerup=bar.onpointercancel=()=>{which=null};
  bar.onclick=e=>e.stopPropagation();
  draw();return bar;
}

// players: no typing on a 110" screen. Letter sections of name cards (first name quiet, surname lead) and an A–Z index to jump
const LAST=new Map(MASTERS_DATA.players.map((n,i)=>[n,MASTERS_DATA.lastNames[i]])); // real last names from the data
const surname=p=>LAST.get(p)||p.split(" ").at(-1); // "Fernandez de Oliveira", "Howell III"
const initial=p=>surname(p).normalize("NFD")[0].toUpperCase(); // Åberg -> A
function players(k,f){
  const box=el("div","pdir"),list=el("div","plist"),az=el("div","az"),sel=()=>new Set(F()[k]||[]),secs={};
  const byL=new Map();[...f.opts].sort((a,b)=>surname(a).localeCompare(surname(b))).forEach(o=>{const L=initial(o);byL.has(L)?byL.get(L).push(o):byL.set(L,[o])});
  const marks=()=>{const s2=sel();az.querySelectorAll("button").forEach(b=>b.classList.toggle("has",(byL.get(b.textContent)||[]).some(o=>s2.has(o))))};
  for(const [L,ps] of [...byL].sort()){
    const sec=el("section");sec.append(el("h5",null,L));const g=el("div","pcards");
    ps.forEach(o=>{const b=el("button","pcard"),last=surname(o);b.innerHTML=`<span>${o.slice(0,-last.length).trim()}</span><span>${last}</span>`;
      b.setAttribute("aria-pressed",sel().has(o));
      b.onclick=e=>{e.stopPropagation();const s3=sel();s3.has(o)?s3.delete(o):s3.add(o);b.setAttribute("aria-pressed",s3.has(o));sfx.play("tick");setF(k,f.opts.filter(x=>s3.has(x)));marks()};
      g.append(b)});
    sec.append(g);list.append(sec);secs[L]=sec;
  }
  [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].forEach(L=>{const b=el("button",null,L);b.disabled=!secs[L];az.append(b)});
  // tap or slide along the index: the list jumps to that letter
  let scrub=false;const jump=e=>{const b=document.elementFromPoint(e.clientX,e.clientY)?.closest(".az button");
    if(b&&!b.disabled&&secs[b.textContent])list.scrollTop=secs[b.textContent].offsetTop-list.offsetTop};
  az.onpointerdown=e=>{scrub=true;try{az.setPointerCapture(e.pointerId)}catch{};jump(e)};az.onpointermove=e=>{if(scrub)jump(e)};az.onpointerup=az.onpointercancel=()=>{scrub=false};
  az.onclick=e=>e.stopPropagation();
  box.append(list,az);marks();
  const first=(F()[k]||[])[0];if(first)requestAnimationFrame(()=>{const s4=secs[initial(first)];if(s4)list.scrollTop=s4.offsetTop-list.offsetTop}); // open at the selection
  return box;
}
const BUILD={tiles,color,sectors,seg,range,players};
