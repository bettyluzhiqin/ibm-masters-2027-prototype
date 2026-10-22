// Physical screen size and UI scale (More › Screen), and touch-kiosk behaviour for the page itself.
/* ---------- physical screen size ----------
   SCREEN_MM is the visible width of the panel. Override with ?width=<mm>, e.g. ?width=2435 for a 110" 16:9 panel.
   UI is designed at 2435 mm; on a narrower screen it grows (same mm on the wall), on a wider one it shrinks. */
// Screen is a setting (More > Screen): pick the venue, then fine-tune UI size 0–100. Browsers can't measure a panel,
// so the choice is remembered per screen.
const DESIGN_MM=2435;
// scale: UI size relative to the stage. A smaller screen is viewed from closer, so it only needs a little more than
// proportional; matching the physical size of the 2.43 m wall would cover too much of the course.
const SCREENS={augusta:{name:"Augusta",mm:2435,short:"Augusta",scale:1},studio:{name:"Think & Innovation Studio",mm:1500,short:"Innovation Studio",scale:1.1}};
const mem=k=>({get(){try{const v=localStorage.getItem(k);return v==null?null:+v}catch{return null}},set(v){try{localStorage.setItem(k,v)}catch{}}});
const screenMem=mem("masters.screen"), uiSizeMem=mem("masters.uisize");
// UI size 0–100 fine-tunes on top of the screen preset: 50 = the recommended size for that screen, 0 = 0.7x, 100 = 1.3x
const sizeMult=n=>0.7+n/100*0.6;
// every scale is capped so the layout always fits the 16:9 stage (presenter column, filters, menus, audience cards)
const CAP={controls:0.865,audience:1.5,reading:1.95}; // controls: the tallest column (a Freeplay chapter, comparing) fits the 2970 px stage up to ~0.87
function applyScreen(mm,size=window.UI_SIZE??50){
  const base=Object.values(SCREENS).find(x=>x.mm===mm)?.scale??Math.sqrt(DESIGN_MM/mm); // other widths (?width=): between proportional and physical
  window.SCREEN_MM=mm; window.UI_SIZE=size; window.UI_SCALE=base*sizeMult(size);
  const r=document.documentElement.style;
  for(const [k,v] of [["--ui","controls"],["--ui-aud","audience"],["--ui-read","reading"]]) r.setProperty(k,Math.min(UI_SCALE*SIZE[v],CAP[v]));
}
// Keep the course visible: presenter controls are compact (only the presenter, at arm's length, needs them);
// audience-facing content stays larger so it reads from the back of the room.
// reading = what the audience reads from the sofa (overview, insight): ~19 mm body text, ~42 mm headlines on a 2.43 m screen
const SIZE={controls:0.845,audience:0.8,reading:1.3};
applyScreen(+new URLSearchParams(location.search).get("width")||screenMem.get()||SCREENS.augusta.mm,uiSizeMem.get()??50); // ?width=<mm> still overrides the screen

// touch kiosk: no long-press menus, no double-tap or pinch zoom of the page itself (pads and sliders handle their own gestures)
addEventListener("contextmenu",e=>e.preventDefault());
addEventListener("gesturestart",e=>e.preventDefault()); // Safari page pinch
addEventListener("dblclick",e=>e.preventDefault());
