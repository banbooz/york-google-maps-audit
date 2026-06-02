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
const APP_VERSION='29';

const notesKey='york-notes-v4',skippedKey='york-skipped-v2',removedKey='york-removed-v1',pricesKey='york-prices-v1',completedKey='york-completed-v1',routeModeKey='york-route-mode-v1',contactsKey='york-contacts-v1',projectsKey='york-projects-v1';
let notes={},prices={},completed={},contacts={},skipped=new Set(),removed=new Set();
let currentIndex=0,sx=0,sy=0,menuSx=0,menuSy=0,lastMapUrl='',activeMenu='route',swipeLocked=false,route=[],teamMembers=[],sheetGesture=false,lastRemoved=null;
const aquiloNumber='7886180242';
const areaOrder=['Shambles','Shambles Market','Stonegate','Goodramgate','Fossgate','Coppergate','Castlegate','Piccadilly','Micklegate','Museum Street','Walmgate Bar'];

function safeParse(k,f){try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f));}catch{return f;}}
function readLocal(){notes=safeParse(notesKey,{});prices=safeParse(pricesKey,{});completed=safeParse(completedKey,{});contacts=safeParse(contactsKey,{});skipped=new Set(safeParse(skippedKey,[]));removed=new Set(safeParse(removedKey,[]));}
function cloudPush(){if(window.YorkSync&&YorkSync.push)YorkSync.push().catch(()=>{});}
function areaRank(b){let a=areaOrder.findIndex(x=>b.area.includes(x));return a<0?99:a;}
function price(b){return prices[b.id]?Number(prices[b.id]):0;}
function priceLabel(b){return price(b)?'£'+price(b):'Set price';}
function rebuildRoute(){let current=stop()?.id;route=businesses.filter(b=>!removed.has(b.id)).sort((a,b)=>a.score-b.score||areaRank(a)-areaRank(b));let found=route.findIndex(b=>b.id===current);if(found>-1)currentIndex=found;if(currentIndex>=route.length)currentIndex=0;}
function stop(){return route[currentIndex]||route[0];}
function cleanQuery(b){return b.name+', York, UK';}
function listing(b){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(cleanQuery(b));}
function dir(b){return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(cleanQuery(b));}
function map(b){return 'https://maps.google.com/maps?f=q&source=s_q&hl=en&q='+encodeURIComponent(cleanQuery(b))+'&z=18&output=embed';}
function recenterMap(){const b=stop();if(!b)return;const fresh=map(b)+'&reload='+Date.now();mapFrame.src=fresh;lastMapUrl=fresh;locateBtn.textContent='✓';setTimeout(()=>locateBtn.textContent='⌖',700);}
function scriptFor(b){let p=price(b);return 'Hi, sorry to bother you. I am local in York and I help small businesses improve how they look on Google Maps. I was checking your listing and I think there may be a few quick improvements with photos, wording, review replies or a review QR code. '+(p?'I can do a one-off Google Maps upgrade for £'+p+'. ':'I can give you a quick one-off price after checking what needs doing. ')+'No monthly contract. Would the owner or manager be the best person to speak to?';}
function defaultNote(b){return 'Aquilo number: '+aquiloNumber+'\n\nQuick notes for '+b.name+':\n- Photos:\n- Reviews/replies:\n- Description/menu:\n- Owner/manager:';}
function noteFor(b){return notes[b.id]||defaultNote(b);}
function contactFor(b){return contacts[b.id]||{};}
function balance(){return Object.values(completed).reduce((sum,n)=>sum+Number(n||0),0);}
function proofText(){return 'We would improve your Google Maps listing by making the first impression clearer: stronger photos, better wording, review QR system, and simple reply templates.';}
function setMenuVersion(){let sub=document.querySelector('.menu-head span');if(sub)sub.textContent='York route · v: '+APP_VERSION;}

function render(updateMap=true){
 const b=stop();setMenuVersion();
 if(!b){progressText.textContent='No shops left';nextStopCard.innerHTML='<div class="stop-top"><div><span class="mini-label">Route complete</span><h1>No shops left</h1><p>You removed every shop from this device.</p></div></div>';detailPanel.innerHTML='';return;}
 const c=contactFor(b);progressText.textContent='Stop '+(currentIndex+1)+' of '+route.length+' · £'+balance()+' made';
 const newMap=map(b);if(updateMap&&newMap!==lastMapUrl){mapFrame.src=newMap;lastMapUrl=newMap;}
 nextStopCard.innerHTML='<div class="stop-top"><div><span class="mini-label">Next stop</span><h1>'+b.name+'</h1><p>'+b.area+'</p></div><button class="score-badge" id="setPriceBtn">'+priceLabel(b)+'</button></div><div class="stop-tags"><span>'+b.priority+' target</span><span>'+b.category+'</span><span>best route</span></div><div class="primary-actions"><a class="start-route" href="'+dir(b)+'" target="_blank" rel="noreferrer">Start route</a><button id="startProjectBtn">Start project</button><button id="skipBtn">Skip</button></div>';
 detailPanel.innerHTML='<div class="detail-row"><strong>In-person script</strong><p>'+scriptFor(b)+'</p></div><div class="detail-row proof-card"><strong>Proof/demo mode</strong><h3>'+b.name+'</h3><p>'+proofText(b)+'</p><ul><li>Improve first 5 Google photos</li><li>Add clearer service/product wording</li><li>Create review QR code</li><li>Give review reply templates</li></ul></div><div class="detail-row"><details class="home-contact-drop"><summary>Contact details</summary><div class="contact-grid"><input id="ownerInput" placeholder="Owner/manager name" value="'+(c.owner||'')+'"><input id="phoneInput" placeholder="Phone" value="'+(c.phone||'')+'"><input id="emailInput" placeholder="Email" value="'+(c.email||'')+'"><input id="instaInput" placeholder="Instagram" value="'+(c.instagram||'')+'"><input id="timeInput" placeholder="Best time to contact" value="'+(c.bestTime||'')+'"></div><button id="saveContactBtn" class="small-save-btn">Save contact</button></details></div><div class="detail-row"><strong>Price</strong><div class="inline-price"><span>£</span><input id="priceInput" class="money-input" type="number" inputmode="numeric" placeholder="Price" value="'+(price(b)||'')+'"></div></div><div class="detail-actions"><a href="'+listing(b)+'" target="_blank" rel="noreferrer">View listing</a><button id="removeBtn" class="danger-btn">Remove shop</button></div><textarea id="noteBox" placeholder="Write notes here...">'+noteFor(b)+'</textarea><button id="saveNoteBtn" class="note-save-btn">Save note</button>';
 document.querySelector('#skipBtn').onclick=skip;
 document.querySelector('#setPriceBtn').onclick=()=>setPrice(b);
 document.querySelector('#priceInput').oninput=e=>savePriceValue(b,e.target.value,false);
 document.querySelector('#startProjectBtn').onclick=()=>startProject(b,true);
 document.querySelector('#saveNoteBtn').onclick=saveNote;
 document.querySelector('#saveContactBtn').onclick=saveContact;
 document.querySelector('#removeBtn').onclick=()=>confirmRemove(b);
}

function setPrice(b){let val=prompt('Enter price for '+b.name,price(b)||'');if(val===null)return;savePriceValue(b,val,true);}
function savePriceValue(b,val,rerender){if(val)prices[b.id]=Number(val);else delete prices[b.id];localStorage.setItem(pricesKey,JSON.stringify(prices));cloudPush();if(rerender)render(false);else{let badge=document.querySelector('#setPriceBtn');if(badge)badge.textContent=priceLabel(b);}}
function startProject(b,openHub=false){let projects=safeParse(projectsKey,{});let old=projects[b.id]||{};projects[b.id]={id:b.id,name:b.name,area:b.area,category:b.category,website:old.website||'',status:old.status||'Started',progress:old.progress||{},completed:old.completed||false,created:old.created||Date.now(),updated:Date.now()};localStorage.setItem(projectsKey,JSON.stringify(projects));cloudPush();if(openHub&&window.ProjectHub)ProjectHub.open(b.id);}
function flash(){nextStopCard.classList.add('skip-flash');setTimeout(()=>nextStopCard.classList.remove('skip-flash'),180);}
function lockSwipe(){swipeLocked=true;setTimeout(()=>swipeLocked=false,450);}
function skip(){if(!stop()||swipeLocked)return;lockSwipe();skipped.add(stop().id);localStorage.setItem(skippedKey,JSON.stringify([...skipped]));currentIndex=(currentIndex+1)%route.length;bottomSheet.classList.remove('expanded');flash();cloudPush();render();}
function previous(){if(!route.length||swipeLocked)return;lockSwipe();currentIndex=currentIndex>0?currentIndex-1:route.length-1;bottomSheet.classList.remove('expanded');flash();render();}
function confirmRemove(b){showConfirm('Remove this shop?',()=>removeShop(b));}
function removeShop(b){lastRemoved=b.id;removed.add(b.id);skipped.delete(b.id);localStorage.setItem(removedKey,JSON.stringify([...removed]));localStorage.setItem(skippedKey,JSON.stringify([...skipped]));readLocal();rebuildRoute();bottomSheet.classList.remove('expanded');cloudPush();render();showUndo('Shop removed',()=>{removed.delete(lastRemoved);localStorage.setItem(removedKey,JSON.stringify([...removed]));readLocal();rebuildRoute();cloudPush();render();});}
function saveNote(){if(!stop())return;notes[stop().id]=document.querySelector('#noteBox').value.trim();localStorage.setItem(notesKey,JSON.stringify(notes));let btn=document.querySelector('#saveNoteBtn');btn.textContent='Saved';setTimeout(()=>btn.textContent='Save note',900);cloudPush();startProject(stop());}
function saveContact(){if(!stop())return;contacts[stop().id]={owner:document.querySelector('#ownerInput').value.trim(),phone:document.querySelector('#phoneInput').value.trim(),email:document.querySelector('#emailInput').value.trim(),instagram:document.querySelector('#instaInput').value.trim(),bestTime:document.querySelector('#timeInput').value.trim()};localStorage.setItem(contactsKey,JSON.stringify(contacts));let btn=document.querySelector('#saveContactBtn');btn.textContent='Saved';setTimeout(()=>btn.textContent='Save contact',900);cloudPush();startProject(stop());}
function showConfirm(text,yes){document.querySelector('#confirmPop')?.remove();let pop=document.createElement('div');pop.id='confirmPop';pop.className='confirm-pop';pop.innerHTML='<div><strong>'+text+'</strong><div><button id="noBtn">No</button><button id="yesBtn">Yes</button></div></div>';document.body.appendChild(pop);pop.querySelector('#noBtn').onclick=()=>pop.remove();pop.querySelector('#yesBtn').onclick=()=>{pop.remove();yes();};}
function showUndo(text,undo){document.querySelector('#undoToast')?.remove();let toast=document.createElement('div');toast.id='undoToast';toast.className='undo-toast';toast.innerHTML='<span>'+text+'</span><button>Undo</button>';document.body.appendChild(toast);toast.querySelector('button').onclick=()=>{toast.remove();undo();};setTimeout(()=>toast.remove(),5000);}
function setRouteMode(){localStorage.setItem(routeModeKey,'best');rebuildRoute();currentIndex=0;cloudPush();render();renderMenu('route');}
function openMenu(){sideMenu.classList.add('open');menuBackdrop.classList.add('open');renderMenu(activeMenu);setMenuVersion();}
function shutMenu(){sideMenu.classList.remove('open');menuBackdrop.classList.remove('open');}
function restoreShop(id){removed.delete(id);localStorage.setItem(removedKey,JSON.stringify([...removed]));readLocal();rebuildRoute();cloudPush();renderMenu(activeMenu);render();}
function teamListHtml(){let list=(window.YorkSync&&YorkSync.members?YorkSync.members():teamMembers)||[];if(!list.length)return '<p class="empty-text">No team members loaded yet.</p>';return list.map(m=>'<div class="note-row"><strong>'+(m.name||'Team member')+'</strong><p>'+(m.email||'')+' · '+(m.code||'')+'</p></div>').join('');}
function renderMenu(section){
 activeMenu=section;setMenuVersion();document.querySelectorAll('.menu-item').forEach(b=>b.classList.toggle('active',b.dataset.section===section));
 if(section==='projects'){if(window.ProjectHub)ProjectHub.open();return;}
 if(section==='route'){menuContent.innerHTML='<h2>Route</h2>'+route.map((b,i)=>'<button class="shop-row '+(i===currentIndex?'selected':'')+'" data-i="'+i+'"><span>'+(i+1)+'</span><div><strong>'+b.name+'</strong><small>'+b.area+' · '+b.score+'/10</small></div></button>').join('')+(removed.size?'<div class="note-row"><strong>Removed shops</strong><p>'+removed.size+' hidden on this device.</p></div>':'');menuContent.querySelectorAll('.shop-row').forEach(r=>r.onclick=()=>{currentIndex=Number(r.dataset.i);shutMenu();render();});}
 if(section==='money'){menuContent.innerHTML='<h2>Money tracker</h2><button id="resetMoneyBtn" class="reset-money-btn">Reset money tracker</button><div class="money-card"><strong>£'+balance()+'</strong><span>Total completed value</span></div>'+Object.entries(completed).map(([id,n])=>{let b=businesses.find(x=>x.id===id);return '<div class="note-row"><strong>'+((b&&b.name)||id)+'</strong><p>Completed for £'+n+'</p></div>';}).join('');document.querySelector('#resetMoneyBtn').onclick=()=>showConfirm('Reset all completed money?',()=>{completed={};localStorage.setItem(completedKey,'{}');cloudPush();renderMenu('money');});}
 if(section==='sync'){menuContent.innerHTML='<h2>Team</h2><div class="help-card"><p id="syncStatus">'+((window.YorkSync&&YorkSync.status())||'Loading sync...')+'</p></div><h2>Team members</h2><div id="teamMembersBox">'+teamListHtml()+'</div><div class="detail-actions"><button id="signInBtn">Sign in with Google</button><button id="makeTeamBtn">Create team code</button></div><div class="detail-row"><strong>Join a team</strong><p><input id="teamCodeInput" class="money-input" placeholder="CODE"><button id="joinTeamBtn">Join</button></p></div>';document.querySelector('#signInBtn').onclick=async()=>{try{await YorkSync.signIn();renderMenu('sync')}catch(e){alert(e.message)}};document.querySelector('#makeTeamBtn').onclick=async()=>{try{let c=await YorkSync.createTeam();alert('Team code: '+c);renderMenu('sync')}catch(e){alert(e.message)}};document.querySelector('#joinTeamBtn').onclick=async()=>{try{let c=await YorkSync.joinTeam(document.querySelector('#teamCodeInput').value);alert('Joined team: '+c);renderMenu('sync')}catch(e){alert(e.message)}};}
}
window.applyCloudUpdate=function(){let before=stop()?.id;readLocal();rebuildRoute();let after=stop()?.id;render(before!==after);if(activeMenu==='sync'&&sideMenu.classList.contains('open'))renderMenu('sync');};
window.updateTeamMembers=function(m){teamMembers=m||[];if(activeMenu==='sync'&&sideMenu.classList.contains('open'))renderMenu('sync');};
window.rebuildRoute=rebuildRoute;window.render=render;
readLocal();localStorage.setItem(routeModeKey,'best');rebuildRoute();
function isSheetGestureTarget(t){return !!(t.closest&&t.closest('.sheet-handle,.swipe-hint,#nextStopCard'))}
bottomSheet.ontouchstart=e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY;sheetGesture=isSheetGestureTarget(e.target)};
bottomSheet.ontouchend=e=>{if(!sheetGesture||swipeLocked)return;let dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;if(dx<-90&&Math.abs(dx)>Math.abs(dy)*1.4){skip();return}if(dx>90&&Math.abs(dx)>Math.abs(dy)*1.4){previous();return}if(Math.abs(dy)>55&&Math.abs(dy)>Math.abs(dx)*1.2){if(dy<0)bottomSheet.classList.add('expanded');else bottomSheet.classList.remove('expanded')}};
bottomSheet.onclick=e=>{if(e.target.closest&&e.target.closest('.sheet-handle,.swipe-hint'))bottomSheet.classList.toggle('expanded')};
sideMenu.ontouchstart=e=>{menuSx=e.touches[0].clientX;menuSy=e.touches[0].clientY};sideMenu.ontouchend=e=>{let dx=e.changedTouches[0].clientX-menuSx,dy=e.changedTouches[0].clientY-menuSy;if(dx<-70&&Math.abs(dx)>Math.abs(dy))shutMenu()};
menuBtn.onclick=openMenu;closeMenu.onclick=shutMenu;menuBackdrop.onclick=shutMenu;locateBtn.onclick=recenterMap;document.querySelectorAll('.menu-item').forEach(b=>b.onclick=()=>renderMenu(b.dataset.section));render();
