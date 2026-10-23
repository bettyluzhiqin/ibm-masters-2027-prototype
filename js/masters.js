// Masters reference data (course, players, champions) and the Freeplay filter definitions.
// Masters reference data. Course, players and shots come from the Data API export in data/ (real); champions are listed here.
window.MASTERS={
  years:MASTERS_DATA.years, // Masters in the data: 2016–2026
  holes:MASTERS_DATA.holes, // Augusta National from the data: name, par, yards
  champions:{2016:"Danny Willett",2017:"Sergio Garcia",2018:"Patrick Reed",2019:"Tiger Woods",2020:"Dustin Johnson",
    2021:"Hideki Matsuyama",2022:"Scottie Scheffler",2023:"Jon Rahm",2024:"Scottie Scheffler",2025:"Rory McIlroy"},
  earlierWinners:["Phil Mickelson","Bubba Watson","Adam Scott","Jordan Spieth"], // won before 2016 (Woods too, already above)
  players:MASTERS_DATA.players}; // every player with shots 2016–2026, sorted by surname
const MASTERS=window.MASTERS;
MASTERS.winners=[...new Set([...Object.values(MASTERS.champions),...MASTERS.earlierWinners])];

// surface swatches for Region, and score as a number to par (Hole in One shows its 1 stroke)
// colours are CSS tokens (css/app.css :root); tok() reads one for JS that needs the value, e.g. the course
const tok=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const SCORE_COL=MASTERS_DATA.scores.map(n=>tok("--score-"+n.toLowerCase().replace(/ /g,"-"))); // Hole in One → --score-hole-in-one
const GROUP_COL={A:tok("--group-a"),B:tok("--group-b")};
const SURFACE={"Bunker":"var(--surface-bunker)","Fairway":"var(--surface-fairway)","Green":"var(--surface-green)","Greenside bunker":"linear-gradient(90deg,var(--surface-bunker) 60%,var(--surface-green) 60%)","Pine straw":"var(--surface-pine-straw)","Second cut":"var(--surface-second-cut)","Water":"var(--surface-water)","Other":"var(--surface-other)"};
const TO_PAR={"Hole in One":"1","Albatross":"−3","Eagle":"−2","Birdie":"−1","Par":"E","Bogey":"+1","Double Bogey":"+2","Triple Bogey":"+3"};
// Filter v3 (Figma › Filter v3, 23 Oct). The control follows the data (how the selection logic differs):
//  tiles:   choose any number; none = all. Hole (with an All tile), Round, Sector (grouped)
//  color:   tiles with the data colour along the top, filled when chosen: Region, Score
//  seg:     choose exactly one; the first option is "all": Shot (first / last stroke), Champions
//  range:   two endpoints on ordered values: Year, Strokes, Distance
//  players: the directory by surname with an A–Z index
// label / icon: the column tile and panel header (assets/icons/filters/*.svg, IBM Carbon 32). Hidden filters have no tile: tours still use them
const TITLE=o=>o.replace(/\b\w/g,c=>c.toUpperCase()); // Pine straw → Pine Straw, as the panels show them
const FILTERS={
  Hole:{ui:"tiles",icon:"hole",cols:7,all:true,opts:Array.from({length:18},(_,i)=>String(i+1))},
  Year:{ui:"range",icon:"year",min:MASTERS_DATA.years[0],max:MASTERS_DATA.years.at(-1),step:1},
  Round:{ui:"tiles",icon:"round",cols:4,big:true,opts:["R1","R2","R3","R4"],name:o=>o.slice(1)},
  Player:{ui:"players",icon:"player",opts:MASTERS.players},
  ShotPos:{ui:"seg",icon:"shot",label:"Shot",opts:["All strokes","First stroke","Last stroke"]}, // first = the tee shot, last = the stroke that finished the hole
  Stroke:{ui:"range",icon:"stroke",label:"Strokes",min:1,max:8,step:1,open:true}, // 8 means 8 or more
  Region:{ui:"color",icon:"region",cols:4,opts:MASTERS_DATA.regions,name:TITLE,color:o=>SURFACE[o]},
  Sector:{ui:"sectors",icon:"sector",opts:MASTERS_DATA.sectors},
  Distance:{ui:"range",icon:"distance",min:0,max:579.37,step:10,unit:" yd",markStep:50},
  Score:{ui:"color",icon:"score",cols:8,opts:MASTERS_DATA.scores,name:o=>o==="Hole in One"?"Ace":TO_PAR[o],caption:o=>({"Hole in One":"In one","Double Bogey":"Double","Triple Bogey":"Triple+"})[o]||o,
    color:o=>SCORE_COL[MASTERS_DATA.scores.indexOf(o)]},
  Trophy:{ui:"seg",icon:"trophy",label:"Champions",opts:["All players","Masters champion"]}, // tours also compare "Never won"
  Shot:{hidden:true,opts:["Tee","Approach","Chip","Putt"]}}; // shot type: tours' story filters only (Approach shots into 13…)
