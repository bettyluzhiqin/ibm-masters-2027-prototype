// Tours: the pinned list from the iPad (Creation Console), every tour's chapters as data, and the game-focus step builders.
// Idle, Media and End stay as Unreal stills; the Digital Twin views are drawn live by sim.js
const IMG={}; // Idle is the live course fly-through; the video chapter plays on a dark screen (Figma D1)
// pinned tours published to this screen from the iPad Library. ?unavailable=<id> drops one, to try the fallback.
// Pinned tours live in the Creation Console on the iPad; the screen keeps the last synced copy.
// Prototype: the iPad has one tour the screen has not synced yet, to show what Sync is for. ?unavailable=<id> drops one, to try the fallback.
const DROP=new URLSearchParams(location.search).get("unavailable");
const PINNED_ON_IPAD=[{id:"amen",title:"Amen Corner",info:"4 chapters · 12 min"},{id:"precision",title:"Precision vs. Power",info:"5 chapters · 13 min"},
  {id:"rory",title:"Rory's Approach",info:"1 chapter · 3 min"},{id:"back9",title:"The Back Nine",info:"5 chapters · 15 min"},
  {id:"champs",title:"Champions' Moments",info:"6 chapters · 18 min"},{id:"decade",title:"Ten Years at Augusta",info:"4 chapters · 10 min"},
  {id:"slam",title:"Rory's Grand Slam",info:"5 chapters · 14 min"}].filter(t=>t.id!==DROP);
const pinnedCache={get(){try{return JSON.parse(localStorage.getItem("masters.pinned.v2"))}catch{return null}},set(v){try{localStorage.setItem("masters.pinned.v2",JSON.stringify(v))}catch{}}}; // v2: the list now has the story tours
let TOURS=pinnedCache.get()?.tours||PINNED_ON_IPAD.slice(0,6), newTours=new Set(), syncing=false;
// the screen remembers its tour (per device): chosen once at setup, not again unless someone changes it
const tourMemory={get(){try{return JSON.parse(localStorage.getItem("masters.tour"))}catch{return null}},set(t){try{localStorage.setItem("masters.tour",JSON.stringify({id:t.id,title:t.title}))}catch{}}};
const chosenTour=()=>TOURS.find(t=>t.id===tourMemory.get()?.id);
// Tours are data. Chapter types:
//   media     video chapter (plays in Unreal)
//   filterset data story: its own filters; optional compare (filtersB + group labels, A teal / B orange); optional insight lines
//   round     game focus: a sequence from data/meta.js (player, year, round, holes), optional holes + stroke range [from, to];
//             preShot adds "Shot 0", the lie before the first shot of the range. content[i] sets each step's cards:
//             insight true = the hole insight, "spot" = the field's odds from this spot (before the shot) or from where it finished,
//             a string = that text, false = none; video true/false
//             seqB: side by side, a second player on the same holes, shot for shot (each hole opens on the drives, ends on the result + video)
//   freeplay  explore the data
const SEQ=MASTERS_DATA.sequences, STORY=MASTERS_DATA.stories;
const LvD=(f={})=>[{Player:["Bernhard Langer"],Year:[2020,2020],Round:["R4"],...f},{Player:["Bryson DeChambeau"],Year:[2020,2020],Round:["R4"],...f}];
const L20=STORY["Langer-2020-4"],D20=STORY["DeChambeau-2020-4"],par=d=>d===0?"even":(d>0?"+":"−")+Math.abs(d);
const TOUR_DEFS={
  amen:{title:"Amen Corner",chapters:[
    {type:"media",title:"Welcome to Augusta",n:2,length:"60 s"},
    {type:"filterset",title:"Approach shots into 13",filters:{Hole:["13"],Shot:["Approach"]}},
    {type:"round",title:"McIlroy through Amen Corner",seq:"mcilroy-2025-amen"}, // every shot of 11–13, hole insight + video each step
    {type:"freeplay",title:"Explore the data"}]},
  precision:{title:"Precision vs. Power",chapters:[
    {type:"filterset",title:"Langer vs DeChambeau, 2020, Round 4, All Holes",headline:"Langer vs DeChambeau",filters:LvD()[0],filtersB:LvD()[1],groups:["Bernhard Langer","Bryson DeChambeau"],
      insight:[`2020 final round: Langer ${L20.strokes} (${par(L20.toPar)}), DeChambeau ${D20.strokes} (${par(D20.toPar)}).`,
               `DeChambeau's drives averaged ${D20.drive} yd on the par 4s and 5s, Langer's ${L20.drive} yd: ${D20.drive-L20.drive} yards more, two shots worse.`]},
    {type:"filterset",title:"Langer vs DeChambeau, 2020, Round 4, Hole No. 7",headline:"Langer vs DeChambeau",filters:LvD({Hole:["7"]})[0],filtersB:LvD({Hole:["7"]})[1],groups:["Bernhard Langer","Bryson DeChambeau"]},
    {type:"round",title:"2nd Shot, Bernhard Langer, 2020, Round 4, Hole No. 7",seq:"langer-2020-7",shots:[2,2],preShot:true,
      content:[{insight:"spot",video:false},{insight:"spot",video:true}]},   // tee view, then shot playback with video
    {type:"round",title:"2nd Shot, Bryson DeChambeau, 2020, Round 4, Hole No. 7",seq:"dechambeau-2020-7",shots:[2,2],preShot:true,
      content:[{insight:"spot",video:false},{insight:"spot",video:false}]},  // tee view, then shot playback (no video)
    {type:"round",title:"Langer vs DeChambeau, hole by hole",seq:"langer-2020-duel",seqB:"dechambeau-2020-duel"}]}, // C3 side by side: both players, same holes, shot for shot
  rory:{title:"Rory's Approach",chapters:[
    {type:"round",title:"Rory McIlroy, 2025, Final Round, Hole No. 15",seq:"mcilroy-2025-15",shots:[2,2],preShot:true,
      content:[{insight:"spot",video:false},{insight:"spot",video:true}]}]}, // shot 0: "from this spot…", shot 1: insight + video
  // the story audit (Figma, Betty's page): every story type the Creation Console can make has a chapter in one of these tours
  back9:{title:"The Back Nine",chapters:[
    {type:"filterset",title:"How the field plays 12",filters:{Hole:["12"]}},                                   // A1 hole profile
    {type:"filterset",title:"Into Rae's Creek on 12",filters:{Hole:["12"],Region:["Water"]}},                 // A4 trouble
    {type:"filterset",title:"Every eagle on 13 and 15",filters:{Hole:["13","15"],Score:["Eagle"]}},           // A3 outcome
    {type:"filterset",title:"Where Sunday tee shots finished on 16",filters:{Hole:["16"],Year:[2024,2024],Round:["R4"],Shot:["Tee"]}}, // A6 landing
    {type:"freeplay",title:"Explore the data"}]},                                                             // D2
  champs:{title:"Champions' Moments",chapters:[
    {type:"media",title:"The Green Jacket",n:1,length:"45 s"},                                                // D1 video
    {type:"filterset",title:"Champions vs the field into 13",headline:"Champions vs the field",
      filters:{Hole:["13"],Shot:["Approach"],Trophy:["Masters champion"]},filtersB:{Hole:["13"],Shot:["Approach"],Trophy:["Never won"]},
      groups:["Masters champions","Never won"]},                                                              // B3 champions vs field
    {type:"filterset",title:"Scottie Scheffler on 13, Sunday 2024",
      filters:{Player:["Scottie Scheffler"],Hole:["13"],Year:[2024,2024],Round:["R4"],Stroke:[1,3]}},          // A7 player sequence
    {type:"round",title:"Rory McIlroy, 2025, Final Round, Hole No. 15",seq:"mcilroy-2025-15",shots:[2,2],preShot:true,
      content:[{insight:"spot",video:false},{insight:"spot",video:true}]},                                     // C1 signature shot
    {type:"round",title:"Rory McIlroy, 2025, Final Round, Hole No. 13",seq:"mcilroy-2025-amen",holes:[13]},   // C2 one hole
    {type:"freeplay",title:"Explore the data"}]},
  decade:{title:"Ten Years at Augusta",chapters:[
    {type:"filterset",title:"Drives over 320 yards",filters:{Shot:["Tee"],Distance:[320,579.37]}},           // A5 distance
    {type:"filterset",title:"16, then and now",headline:"16, then and now",
      filters:{Hole:["16"],Year:[2016,2019]},filtersB:{Hole:["16"],Year:[2023,2026]},groups:["2016–2019","2023–2026"]}, // B2 era vs era
    {type:"filterset",title:"Thursday vs Sunday on 12",headline:"Thursday vs Sunday on 12",
      filters:{Hole:["12"],Round:["R1"]},filtersB:{Hole:["12"],Round:["R4"]},groups:["Thursday","Sunday"]},  // B4 round pressure
    {type:"freeplay",title:"Explore the data"}]},
  slam:{title:"Rory's Grand Slam",chapters:[
    {type:"media",title:"The Grand Slam",n:2,length:"90 s"},
    {type:"filterset",title:"Rory McIlroy's approach shots, 2025",filters:{Player:["Rory McIlroy"],Year:[2025,2025],Shot:["Approach"]}},
    {type:"round",title:"McIlroy through Amen Corner",seq:"mcilroy-2025-amen"},
    {type:"round",title:"Rory McIlroy, 2025, Final Round, Hole No. 15",seq:"mcilroy-2025-15",shots:[2,2],preShot:true,
      content:[{insight:"spot",video:false},{insight:"spot",video:true}]},
    {type:"freeplay",title:"Explore the data"}]},
};
// game focus steps: every stroke with a flight in the range (a drop is shown with the next shot, not a step); sim.js reads these
function focusSteps(c){
  const sq=SEQ[c.seq],holes=sq.holes.filter(h=>!c.holes||c.holes.includes(h.hole)),[lo,hi]=c.shots||[1,99],out=[];
  holes.forEach((fh,h)=>{
    const played=fh.shots.filter(sh=>sh.from&&sh.kind!=="Drop"),last=played.at(-1),inRange=played.filter(sh=>sh.no>=lo&&sh.no<=hi);
    inRange.forEach((shot,k)=>{const base={...fh,seq:sq,hi:h,si:fh.shots.indexOf(shot),shot,n:shot.no,res:`${fh.score} · ${fh.strokes}`};
      if(c.preShot&&k===0) out.push({...base,pre:true}); // "Shot 0": standing at the ball, before it is hit
      out.push({...base,lastOfHole:shot===last});});
  });
  out.forEach((st,i)=>{const ct=c.content?.[i]??{insight:true,video:!st.pre};
    st.video=!!ct.video;
    st.text=ct.insight===false?[]:ct.insight==="spot"?[st.pre?st.shot.pre:st.shot.post]:typeof ct.insight==="string"?[ct.insight]:st.insights;});
  return out;
}
// side by side: both players' shots k on the same hole are one step; a player who has holed out stays finished
function duelSteps(c){
  const A=SEQ[c.seq],B=SEQ[c.seqB],sur=p=>p.split(" ").at(-1),out=[];
  A.holes.forEach((fa,h)=>{const fb=B.holes[h],play=fh=>fh.shots.filter(sh=>sh.from&&sh.kind!=="Drop"),pa=play(fa),pb=play(fb),K=Math.max(pa.length,pb.length);
    for(let k=0;k<K;k++){const a=pa[Math.min(k,pa.length-1)],b=pb[Math.min(k,pb.length-1)];
      out.push({...fa,seq:A,hi:h,si:fa.shots.indexOf(a),shot:a,n:k+1,done:k>=pa.length,lastOfHole:k===K-1,res:`${fa.score} · ${fa.strokes}`,
        b:{...fb,seq:B,si:fb.shots.indexOf(b),shot:b,n:k+1,done:k>=pb.length,res:`${fb.score} · ${fb.strokes}`}});}
    const first=out.find(st=>st.hi===h),last=out.at(-1),drive=fh=>fh.shots.find(sh=>sh.no===1).yd;
    first.text=[`Off the tee on ${fa.hole}: ${sur(B.player)} ${drive(fb)} yd, ${sur(A.player)} ${drive(fa)} yd.`];
    last.text=[`${fa.hole}: ${sur(A.player)} ${fa.strokes} (${fa.score.toLowerCase()}), ${sur(B.player)} ${fb.strokes} (${fb.score.toLowerCase()}).`];
    last.video=true;});
  out.forEach(st=>{st.text||=[];st.video=!!st.video});
  return out;
}
const builtTours={};
function tourFor(t){ // the tour this screen runs: its definition (or Amen Corner's chapters) under the pinned title
  const id=TOUR_DEFS[t?.id]?t.id:"amen",def=builtTours[id]||=({...TOUR_DEFS[id],chapters:TOUR_DEFS[id].chapters.map(c=>c.type==="round"?{...c,steps:c.seqB?duelSteps(c):focusSteps(c)}:c)});
  return {...def,id,title:t?.title||def.title};
}
let TOUR=tourFor(null);
