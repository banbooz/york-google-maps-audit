const mapFrame=document.querySelector('#mapFrame');
const progressText=document.querySelector('#progressText');
const nextStopCard=document.querySelector('#nextStopCard');
const detailPanel=document.querySelector('#detailPanel');
const bottomSheet=document.querySelector('#bottomSheet');
const menuBtn=document.querySelector('#menuBtn');
const closeMenu=document.querySelector('#closeMenu');
const sideMenu=document.querySelector('#sideMenu');
const menuBackdrop=document.querySelector('#menuBackdrop');
const menuContent=document.querySelector('#menuContent');
const locateBtn=document.querySelector('#locateBtn');

const notesKey='york-notes-v4';
const skippedKey='york-skipped-v2';
const notes=JSON.parse(localStorage.getItem(notesKey)||'{}');
const skipped=new Set(JSON.parse(localStorage.getItem(skippedKey)||'[]'));
let route=businesses.slice().sort((a,b)=>a.score-b.score);
let currentIndex=route.findIndex(b=>!skipped.has(b.id));
if(currentIndex<0)currentIndex=0;
let sx=0,sy=0;

function stop(){return route[currentIndex]||route[0];}
function dir(b){return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(b.name+' York');}
function map(b){return 'https://www.google.com/maps?q='+encodeURIComponent(b.name+' '+b.area+' York')+'&output=embed';}

function render(){
 const b=stop();
 progressText.textContent='Stop '+(currentIndex+1)+' of '+route.length;
 mapFrame.src=map(b);
 nextStopCard.innerHTML='<div class="stop-top"><div><span class="mini-label">Next stop</span><h1>'+b.name+'</h1><p>'+b.area+'</p></div><div class="score-badge">'+b.score+'/10</div></div><div class="stop-tags"><span>'+b.priority+' target</span><span>'+b.category+'</span></div><div class="primary-actions"><a class="start-route" href="'+dir(b)+'" target="_blank" rel="noreferrer">Start route</a><button id="skipBtn">Skip</button></div>';
 detailPanel.innerHTML='<div class="detail-row"><strong>Assess this shop</strong><p>Check the first photos, reviews, opening times, menu/products and whether the listing feels professional.</p></div><div class="detail-actions"><a href="'+b.maps+'" target="_blank" rel="noreferrer">View Google listing</a><button id="saveNoteBtn">Save note</button></div><textarea id="noteBox" placeholder="Write notes here...">'+(notes[b.id]||'')+'</textarea>';
 document.querySelector('#skipBtn').onclick=skip;
 document.querySelector('#saveNoteBtn').onclick=saveNote;
 renderMenu(document.querySelector('.menu-item.active')?.dataset.section||'route');
}

function skip(){
 skipped.add(stop().id);
 localStorage.setItem(skippedKey,JSON.stringify([...skipped]));
 let next=route.findIndex((b,i)=>i>currentIndex&&!skipped.has(b.id));
 currentIndex=next>-1?next:0;
 bottomSheet.classList.remove('expanded');
 render();
}
function saveNote(){
 notes[stop().id]=document.querySelector('#noteBox').value.trim();
 localStorage.setItem(notesKey,JSON.stringify(notes));
 document.querySelector('#saveNoteBtn').textContent='Saved';
}
function openMenu(){sideMenu.classList.add('open');menuBackdrop.classList.add('open');}
function shutMenu(){sideMenu.classList.remove('open');menuBackdrop.classList.remove('open');}
function renderMenu(section){
 document.querySelectorAll('.menu-item').forEach(b=>b.classList.toggle('active',b.dataset.section===section));
 if(section==='route'){
  menuContent.innerHTML='<h2>Current route</h2>'+route.map((b,i)=>'<button class="shop-row '+(i===currentIndex?'selected':'')+'" data-i="'+i+'"><span>'+(i+1)+'</span><div><strong>'+b.name+'</strong><small>'+b.area+' · '+b.score+'/10</small></div></button>').join('');
  menuContent.querySelectorAll('.shop-row').forEach(r=>r.onclick=()=>{currentIndex=Number(r.dataset.i);shutMenu();render();});
 }
 if(section==='shops')menuContent.innerHTML='<h2>All possible shops</h2>'+route.map(b=>'<a class="shop-row" href="'+b.maps+'" target="_blank"><span>↗</span><div><strong>'+b.name+'</strong><small>'+b.category+' · '+b.priority+'</small></div></a>').join('');
 if(section==='notes')menuContent.innerHTML='<h2>Saved notes</h2>'+Object.entries(notes).map(([id,n])=>{let b=route.find(x=>x.id===id);return '<div class="note-row"><strong>'+(b?b.name:id)+'</strong><p>'+n+'</p></div>';}).join('')||'<p class="empty-text">No notes yet.</p>';
 if(section==='help')menuContent.innerHTML='<h2>How to use</h2><div class="help-card"><p>Tap Start route to navigate.</p><p>Swipe left on the bottom card to skip.</p><p>Swipe up to view details and notes.</p><p>Use the menu to see all shops.</p></div>';
}

bottomSheet.ontouchstart=e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY;};
bottomSheet.ontouchend=e=>{let dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;if(dx<-70&&Math.abs(dx)>Math.abs(dy))skip();if(dy<-55)bottomSheet.classList.add('expanded');if(dy>55)bottomSheet.classList.remove('expanded');};
bottomSheet.onclick=e=>{if(e.target.className==='sheet-handle'||e.target.className==='swipe-hint')bottomSheet.classList.toggle('expanded');};
menuBtn.onclick=openMenu;closeMenu.onclick=shutMenu;menuBackdrop.onclick=shutMenu;locateBtn.onclick=render;
document.querySelectorAll('.menu-item').forEach(b=>b.onclick=()=>renderMenu(b.dataset.section));
render();
