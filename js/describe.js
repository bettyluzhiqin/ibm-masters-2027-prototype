// The story in words: the overview card's title and context, written from the filters (Freeplay and comparisons).
// ---------- the story in words, written from the filters (Freeplay) ----------
const SCORE_PL={"Hole in One":"Holes in one",Albatross:"Albatrosses",Eagle:"Eagles",Birdie:"Birdies",Par:"Pars",Bogey:"Bogeys","Double Bogey":"Double bogeys","Triple Bogey":"Triple bogeys"};
const SHOT_PL={Tee:"Tee shots",Approach:"Approach shots",Chip:"Chips",Putt:"Putts"};
const REGION_IN={Water:"in the water",Bunker:"in bunkers","Greenside bunker":"in greenside bunkers",Green:"on the green",Fairway:"on the fairway","Second cut":"in the second cut","Pine straw":"in the pine straw",Other:"elsewhere"};
const DAY={R1:"Thursday",R2:"Friday",R3:"Saturday",R4:"Sunday"};
const lastName=n=>n.split(" ").slice(-1)[0];
const holeList=h=>h.length===1?h[0]:fmt("Hole",h).replace(/, ([^,]*)$/," and $1");
function describe(f){
  const used=new Set(),u=k=>{used.add(k);return f[k]};
  let subj=null;
  if(f.Score&&f.Score.length<=2) subj=u("Score").map((x,i)=>i?SCORE_PL[x].toLowerCase():SCORE_PL[x]).join(" and ");
  else if(f.Shot?.length===1) subj=f.Shot[0]==="Tee"&&f.Distance?"Drives":SHOT_PL[u("Shot")[0]];
  if(f.Shot?.length===1&&f.Shot[0]==="Tee"&&f.Distance) used.add("Shot");
  if(!subj&&f.ShotPos) subj=u("ShotPos")[0]==="First stroke"?"Tee shots":"Final strokes"; // Shot › first / last stroke on the hole
  const one=f.Player?.length===1;
  const bits=[];
  if(!subj&&one) subj=u("Player")[0];
  if(!subj&&f.Region?.length===1) subj=f.Region[0]==="Water"?"Balls":"Shots";
  if(f.Distance){const [lo,hi]=u("Distance"),open=hi>=FILTERS.Distance.max;bits.push(lo>0&&open?`over ${lo} yards`:lo===0?`under ${hi} yards`:`of ${lo}–${hi} yards`)}
  if(f.Region?.length===1) bits.push(REGION_IN[u("Region")[0]]);
  if(f.Hole){const h=u("Hole");bits.push((subj==="Approach shots"&&h.length===1?"into ":"on ")+holeList(h))}
  if(f.Player&&!used.has("Player")) bits.push("by "+(f.Player.length<=2?u("Player").map(lastName).join(" and "):`${u("Player").length} players`));
  if(f.Trophy?.length===1) bits.push(u("Trophy")[0]==="Masters champion"?"by Masters champions":"by players who never won");
  if(!subj&&f.Hole?.length===1&&Object.keys(f).every(k=>["Hole","Year","Round"].includes(k))) return {text:`How the field plays ${f.Hole[0]}`+when(f,used),used};
  const text=(subj||"Every shot")+(bits.length?" "+bits.join(" "):f.Hole?"":" at Augusta")+when(f,used);
  return {text,used};
}
function when(f,used){ // ", Sunday 2024" / ", 2016–2019" / ", Sunday"
  const parts=[];
  if(f.Round?.length===1){used.add("Round");parts.push(DAY[f.Round[0]])}
  if(f.Year){used.add("Year");parts.push(fmt("Year",f.Year))}
  return parts.length?", "+parts.join(" "):"";
}
// one quiet line for everything the headline does not say: the hole (name, par), who, when, the other filters
function contextOf(f,used=new Set(),skip=new Set()){ // skip: what a comparison compares (the groups say it)
  const h=f.Hole?.length===1?MASTERS.holes[f.Hole[0]-1]:null,out=[];
  if(h) out.push(`Hole ${h.n} · ${h.name} · Par ${h.par}`); else if(f.Hole&&!used.has("Hole")) out.push("Holes "+fmt("Hole",f.Hole));
  if(!f.Player&&!f.Trophy&&!skip.has("Player")&&!skip.has("Trophy")) out.push("All players"); else if(f.Player&&!used.has("Player")) out.push(f.Player.length<=2?f.Player.join(", "):f.Player.length+" players");
  if(!f.Year){if(!skip.has("Year")) out.push(`${MASTERS.years[0]}–${MASTERS.years.at(-1)}`)} else if(!used.has("Year")) out.push(fmt("Year",f.Year));
  if(f.Round&&!used.has("Round")) out.push("Round "+f.Round.map(r=>r.slice(1)).join(", ")); else if(!f.Round&&!skip.has("Round")) out.push("All rounds");
  for(const k of ["Shot","ShotPos","Stroke","Region","Sector","Distance","Score","Trophy"]) if(f[k]&&!used.has(k)) out.push(`${SEL_LABEL[k]} ${selValue(k,f[k])}`);
  if(!f.Hole&&!skip.has("Hole")) out.push("All holes");
  return out.join(" · ");
}
// filters both groups share (the comparison's context) and names for what differs (the groups)
const sharedFilters=(a,b)=>Object.fromEntries(Object.entries(a).filter(([k,v])=>JSON.stringify(b[k])===JSON.stringify(v)));
function groupNames(a,b,given){
  if(given) return {full:given,short:given.map(n=>MASTERS.players.includes(n)?lastName(n):n)};
  const diff=[...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k]));
  const k=diff.length===1?diff[0]:null;
  const nm=g=>{const v=g[k];if(!v) return "Everyone else";
    if(k==="Player") return v.length<=2?v.join(" & "):v.length+" players";
    if(k==="Year") return fmt("Year",v); if(k==="Round") return v.map(r=>DAY[r]).join(", "); if(k==="Hole") return "Hole "+fmt("Hole",v);
    if(k==="Trophy") return v[0]==="Masters champion"?"Masters champions":"Never won"; return selValue(k,v);};
  const full=k?[nm(a),nm(b)]:["Group A","Group B"];
  return {full,short:full.map(n=>MASTERS.players.includes(n)?lastName(n):n)};
}
