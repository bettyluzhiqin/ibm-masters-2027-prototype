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
const SURFACE={"Bunker":"#e8dcc0","Fairway":"#3d7230","Green":"#6fb04f","Greenside bunker":"linear-gradient(#e8dcc0,#e8dcc0) padding-box,#6fb04f","Pine straw":"#8a5a35","Second cut":"#2c5424","Water":"#2d6fb3","Other":"#8d8d8d"};
const TO_PAR={"Hole in One":"1","Albatross":"−3","Eagle":"−2","Birdie":"−1","Par":"E","Bogey":"+1","Double Bogey":"+2","Triple Bogey":"+3"};
// Every filter is multi-select. The control depends on the data:
//  paint: short fixed sets; tap, or drag across to select several at once
//  range: ordered numbers; drag two handles
//  players: long list; A–Z surname rail (drag to scrub) + tiles for that letter, no typing
const FILTERS={
  Hole:{ui:"paint",layout:"grid hgrid",opts:Array.from({length:18},(_,i)=>String(i+1)),label:o=>`<b>${o}</b><span>${MASTERS.holes[o-1].name}</span>`}, // number + readable name
  Year:{ui:"range",min:MASTERS_DATA.years[0],max:MASTERS_DATA.years.at(-1),step:1,ticks:[2016,2019,2022,2026],marks:true}, // slider; a tick for every year, labels on a few
  Round:{ui:"paint",layout:"seg",opts:["R1","R2","R3","R4"]},
  Player:{ui:"players",opts:MASTERS.players},
  Shot:{ui:"paint",layout:"seg",opts:["Tee","Approach","Chip","Putt"]},
  Stroke:{ui:"range",min:1,max:8,step:1,ticks:[1,2,3,4,5,6,7,8],marks:true,open:true,hint:"Stroke number on the hole: 1 is the tee shot, 8 means 8 or more"}, // "shots 1–5" stories
  Region:{ui:"paint",layout:"grid rgrid",opts:MASTERS_DATA.regions,label:o=>`<i class="sw" style="background:${SURFACE[o]}"></i><span>${o}</span>`}, // 8 surfaces, each with a swatch
  Sector:{ui:"paint",layout:"grid secmap",opts:MASTERS_DATA.sectors,label:o=>o.startsWith("Fairway")?o:o.replace("Greenside ","").replace(/^./,x=>x.toUpperCase()),cls:o=>o.startsWith("Fairway")?"fw":"",hint:"Where it landed: around the green (back at the top) or which side of the fairway"}, // greenside areas from the data; fairway side derived from the line of play
  Distance:{ui:"range",min:0,max:579.37,step:10,unit:" yd",ticks:[0,200,400,579.37],marks:true,markStep:50}, // yards, up to the longest shot; same look as Year
  Score:{ui:"paint",layout:"grid hgrid",opts:MASTERS_DATA.scores,label:o=>`<b>${TO_PAR[o]}</b><span>${o}</span>`}, // number to par first
  Trophy:{ui:"paint",layout:"seg",opts:["Masters champion","Never won"]}};
const HINT={paint:"Tap, or drag across to select several",range:"Drag the handles",players:"Drag along the letters, then tap or drag across players"};
