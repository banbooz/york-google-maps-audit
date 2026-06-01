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

const notesKey='york-notes-v4',skippedKey='york-skipped-v2',removedKey='york-removed-v1',pricesKey='york-prices-v1',completedKey='york-completed-v1',routeModeKey='york-route-mode-v1';
const notes=JSON.parse(localStorage.getItem(notesKey)||'{}');
const prices=JSON.parse(localStorage.getItem(pricesKey)||'{}');
const completed=JSON.parse(localStorage.getItem(completedKey)||'{}');
const skipped=new Set(JSON.parse(localStorage.getItem(skippedKey)||'[]'));
const removed=new Set(JSON.parse(localStorage.getItem(removedKey)||'[]'));
let routeMode=localStorage.getItem(routeModeKey)||'best';
let currentIndex=0,sx=0,sy=0,menuSx=0,menuSy=0,lastMapUrl='',activeMenu='route',swipeLocked=false;
let route=[];
const areaOrder=['Shambles','Shambles Market','Stonegate','Goodramgate','Fossgate','Coppergate','Castlegate','Piccadilly','Micklegate','Museum Street','Walmgate Bar'];

function areaRank(b){let a=areaOrder.findIndex(x=>b.area.includes(x));return a<0?99:a;}
function recommendedPrice(b){let base=b.score<=4?100:b.score<=5?85:b.score<=6?75:50;if(['Jewellery','Retail','Tourist shop'].includes(b.category))base+=10;if(b.priority==='High')base+=15;if(b.priority==='Low')base-=15;return Math.max(40,base);}
function price(b){return Number(prices[b.id]||recommendedPrice(b));}
function rebuildRoute(){let list=businesses.filter(b=>!removed.has(b.id));route=list.sort((a,b)=>routeMode==='walk'?(areaRank(a)-areaRank(b)||a.score-b.score):(a.score-b.score||areaRank(a)-areaRank(b)));if(currentIndex>=route.length)currentIndex=0;}
function stop(){return route[currentIndex]||route[0];}
function cleanQuery(b){return b.name+' '+b.area+' York';}
function listing(b){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(cleanQuery(b));}
function dir(b){return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(b.name+' York');}
function map(b){return 'https://www.google.com/maps?q='+encodeURIComponent(cleanQuery(b))+'&output=embed';}
function recenterMap(){const b=stop();if(!b)return;const fresh=map(b)+'&t='+(Date.now());mapFrame.src=fresh;lastMapUrl=fresh;locateBtn.textContent='✓';setTimeout(()=>locateBtn.textContent='⌖',700);}
function scriptFor(b){return 'Hi, sorry to bother you. I am local in York and I help small businesses improve how they look on Google Maps. I was checking your listing and I think there may be a few quick improvements with photos, wording, review replies or a review QR code. I can do a one-off Google Maps upgrade for around £'+price(b)+'. No monthly contract. Would the owner or manager be the best person to speak to?';}
function balance(){return Object.values(completed).reduce((sum,n)=>sum+Number(n||0),0);}

function render(updateMap=true){
 const b=stop();
 if(!b){progressText.textContent='No shops left';nextStopCard.innerHTML='<div class="stop-top"><div><span class="mini-label">Route complete</span><h1>No shops left</h1><p>You removed every shop from this device.</p></div></div>';detailPanel.innerHTML='';return;}
 progressText.textContent='Stop '+(currentIndex+1)+' of '+route.length+' · £'+balance()+' made';
 const newMap=map(b);if(updateMap&&newMap!==lastMapUrl){mapFrame.src=newMap;lastMapUrl=newMap;}
 nextStopCard.innerHTML='<div class="stop-top"><div><span class="mini-label">Next stop</span><h1>'+b.name+'</h1><p>'+b.area+'</p></div><div class="score-badge">£'+price(b)+'</div></div><div class="stop-tags"><span>'+b.priority+' target</span><span>'+b.category+'</span><span>'+routeMode+' route</span></div><div class="primary-actions"><a class="start-route" href="'+dir(b)+'" target="_blank" rel="noreferrer">Start route</a><button id="skipBtn">Skip</button></div>';
 detailPanel.innerHTML='<div class="detail-row"><strong>In-person script</strong><p>'+scriptFor(b)+'</p></div><div class="detail-row"><strong>Recommended ask price</strong><p>Suggested: £'+recommendedPrice(b)+' · Your price: £<input id="priceInput" class="money-input" type="number" min="0" value="'+price(b)+'"></p></div><div class="detail-actions"><a href="'+listing(b)+'" target="_blank" rel="noreferrer">View listing</a><button id="savePriceBtn">Save price</button><button id="completeBtn">Complete +£'+price(b)+'</button><button id="saveNoteBtn">Save note</button><button id="removeBtn" class="danger-btn">Remove shop</button></div><textarea id="noteBox" placeholder="Write notes here...">'+(notes[b.id]||'')+'</textarea>';
 document.querySelector('#skipBtn').onclick=skip;
 document.querySelector('#saveNoteBtn').onclick=saveNote;
 document.querySelector('#removeBtn').onclick=removeShop;
 document.querySelector('#savePriceBtn').onclick=savePrice;
 document.querySelector('#completeBtn').onclick=completeShop;
 if(sideMenu.classList.contains('open'))renderMenu(activeMenu);
}
function flash(){nextStopCard.classList.add('skip-flash');setTimeout(()=>nextStopCard.classList.remove('skip-flash'),180);}
function lockSwipe(){swipeLocked=true;setTimeout(()=>swipeLocked=false,450);}
function skip(){if(!stop()||swipeLocked)return;lockSwipe();skipped.add(stop().id);localStorage.setItem(skippedKey,JSON.stringify([...skipped]));let next=route.findIndex((b,i)=>i>currentIndex&&!skipped.has(b.id));currentIndex=next>-1?next:0;bottomSheet.classList.remove('expanded');flash();render();}
function previous(){if(!route.length||swipeLocked)return;lockSwipe();currentIndex=currentIndex>0?currentIndex-1:route.length-1;bottomSheet.classList.remove('expanded');flash();render();}
function removeShop(){const b=stop();if(!b)return;removed.add(b.id);skipped.delete(b.id);localStorage.setItem(removedKey,JSON.stringify([...removed]));localStorage.setItem(skippedKey,JSON.stringify([...skipped]));rebuildRoute();bottomSheet.classList.remove('expanded');flash();render();}
function saveNote(){if(!stop())return;notes[stop().id]=document.querySelector('#noteBox').value.trim();localStorage.setItem(notesKey,JSON.stringify(notes));document.querySelector('#saveNoteBtn').textContent='Saved';}
function savePrice(){if(!stop())return;prices[stop().id]=Number(document.querySelector('#priceInput').value||0);localStorage.setItem(pricesKey,JSON.stringify(prices));render(false);}
function completeShop(){const b=stop();if(!b)return;completed[b.id]=price(b);localStorage.setItem(completedKey,JSON.stringify(completed));document.querySelector('#completeBtn').textContent='Completed';render(false);}
function setRouteMode(mode){routeMode=mode;localStorage.setItem(routeModeKey,mode);rebuildRoute();currentIndex=0;render();renderMenu('route');}
function openMenu(){sideMenu.classList.add('open');menuBackdrop.classList.add('open');renderMenu(activeMenu);}function shutMenu(){sideMenu.classList.remove('open');menuBackdrop.classList.remove('open');}
function restoreShop(id){removed.delete(id);localStorage.setItem(removedKey,JSON.stringify([...removed]));rebuildRoute();renderMenu(activeMenu);render();}
function renderMenu(section){
 activeMenu=section;document.querySelectorAll('.menu-item').forEach(b=>b.classList.toggle('active',b.dataset.section===section));
 if(section==='route'){
  menuContent.innerHTML='<h2>Current route</h2><div class="detail-actions"><button id="bestRouteBtn">Best target route</button><button id="walkRouteBtn">Walking route</button></div>'+route.map((b,i)=>'<button class="shop-row '+(i===currentIndex?'selected':'')+'" data-i="'+i+'"><span>'+(i+1)+'</span><div><strong>'+b.name+'</strong><small>'+b.area+' · £'+price(b)+' · '+b.score+'/10</small></div></button>').join('')+(removed.size?'<div class="note-row"><strong>Removed shops</strong><p>'+removed.size+' hidden on this device.</p></div>':'');
  document.querySelector('#bestRouteBtn').onclick=()=>setRouteMode('best');document.querySelector('#walkRouteBtn').onclick=()=>setRouteMode('walk');menuContent.querySelectorAll('.shop-row').forEach(r=>r.onclick=()=>{currentIndex=Number(r.dataset.i);shutMenu();render();});
 }
 if(section==='shops'){
  menuContent.innerHTML='<h2>All possible shops</h2>'+route.map(b=>'<a class="shop-row" href="'+listing(b)+'" target="_blank" rel="noreferrer"><span>↗</span><div><strong>'+b.name+'</strong><small>'+b.category+' · £'+price(b)+'</small></div></a>').join('')+(removed.size?'<h2>Removed</h2>'+businesses.filter(b=>removed.has(b.id)).map(b=>'<button class="shop-row restore-row" data-id="'+b.id+'"><span>↺</span><div><strong>'+b.name+'</strong><small>Tap to restore</small></div></button>').join(''):'');
  menuContent.querySelectorAll('.restore-row').forEach(r=>r.onclick=()=>restoreShop(r.dataset.id));
 }
 if(section==='money')menuContent.innerHTML='<h2>Money tracker</h2><div class="money-card"><strong>£'+balance()+'</strong><span>Total completed value</span></div>'+Object.entries(completed).map(([id,n])=>{let b=businesses.find(x=>x.id===id);return '<div class="note-row"><strong>'+((b&&b.name)||id)+'</strong><p>Completed for £'+n+'</p></div>';}).join('')||'<p class="empty-text">No completed jobs yet.</p>';
 if(section==='sync')menuContent.innerHTML='<h2>Partner sync</h2><div class="help-card"><p><strong>Not connected yet.</strong></p><p>Google login, friend codes and live shared routes need Firebase or another backend. This GitHub Pages version can store data on one phone only.</p><p>I can add this properly once a Firebase project is made and connected.</p></div>';
 if(section==='notes')menuContent.innerHTML='<h2>Saved notes</h2>'+Object.entries(notes).map(([id,n])=>{let b=businesses.find(x=>x.id===id);return '<div class="note-row"><strong>'+(b?b.name:id)+'</strong><p>'+n+'</p></div>';}).join('')||'<p class="empty-text">No notes yet.</p>';
 if(section==='help')menuContent.innerHTML='<h2>How to use</h2><div class="help-card"><p>Use Walking route to group shops by area so you do not walk back and forth.</p><p>Swipe up for script, pricing and completion tools.</p><p>Save a custom price, then tap Complete when the work is paid/done.</p><p>Tap ⌖ to recentre the map on the current shop.</p><p>Google login/live partner sync needs Firebase.</p></div>';
}

rebuildRoute();
bottomSheet.ontouchstart=e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY;};
bottomSheet.ontouchend=e=>{if(swipeLocked)return;let dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;if(dx<-90&&Math.abs(dx)>Math.abs(dy)*1.4){skip();return;}if(dx>90&&Math.abs(dx)>Math.abs(dy)*1.4){previous();return;}if(dy<-55)bottomSheet.classList.add('expanded');if(dy>55)bottomSheet.classList.remove('expanded');};
bottomSheet.onclick=e=>{if(e.target.className==='sheet-handle'||e.target.className==='swipe-hint')bottomSheet.classList.toggle('expanded');};
sideMenu.ontouchstart=e=>{menuSx=e.touches[0].clientX;menuSy=e.touches[0].clientY;};sideMenu.ontouchend=e=>{let dx=e.changedTouches[0].clientX-menuSx,dy=e.changedTouches[0].clientY-menuSy;if(dx<-70&&Math.abs(dx)>Math.abs(dy))shutMenu();};
menuBtn.onclick=openMenu;closeMenu.onclick=shutMenu;menuBackdrop.onclick=shutMenu;locateBtn.onclick=recenterMap;document.querySelectorAll('.menu-item').forEach(b=>b.onclick=()=>renderMenu(b.dataset.section));render();
