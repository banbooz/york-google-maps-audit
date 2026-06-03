const mapFrame = document.querySelector('#mapFrame');
const progressText = document.querySelector('#progressText');
const nextStopCard = document.querySelector('#nextStopCard');
const detailPanel = document.querySelector('#detailPanel');
const bottomSheet = document.querySelector('#bottomSheet');
const menuBtn = document.querySelector('#menuBtn');
const closeMenu = document.querySelector('#closeMenu');
const sideMenu = document.querySelector('#sideMenu');
const menuBackdrop = document.querySelector('#menuBackdrop');
const menuContent = document.querySelector('#menuContent');
const locateBtn = document.querySelector('#locateBtn');
const APP_VERSION = '38';

const notesKey = 'york-notes-v4';
const skippedKey = 'york-skipped-v2';
const removedKey = 'york-removed-v1';
const pricesKey = 'york-prices-v1';
const completedKey = 'york-completed-v1';
const routeModeKey = 'york-route-mode-v1';
const contactsKey = 'york-contacts-v1';
const projectsKey = 'york-projects-v1';
const statusKey = 'york-shop-status-v1';

let notes = {}, prices = {}, completed = {}, contacts = {}, statuses = {};
let skipped = new Set(), removed = new Set();
let currentIndex = 0, sx = 0, sy = 0, menuSx = 0, menuSy = 0;
let lastMapUrl = '', activeMenu = 'route', swipeLocked = false, route = [], teamMembers = [], sheetGesture = false, lastRemoved = null;
const aquiloNumber = '7886180242';
const areaOrder = ['Shambles', 'Shambles Market', 'Stonegate', 'Goodramgate', 'Fossgate', 'Coppergate', 'Castlegate', 'Piccadilly', 'Micklegate', 'Museum Street', 'Walmgate Bar'];

function safeParse(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}

function readLocal() {
  notes = safeParse(notesKey, {});
  prices = safeParse(pricesKey, {});
  completed = safeParse(completedKey, {});
  contacts = safeParse(contactsKey, {});
  statuses = safeParse(statusKey, {});
  skipped = new Set(safeParse(skippedKey, []));
  removed = new Set(safeParse(removedKey, []));
}

function cloudPush() {
  if (window.YorkSync && YorkSync.push) YorkSync.push().catch(() => {});
}

function areaRank(b) {
  const area = areaOrder.findIndex(x => b.area.includes(x));
  return area < 0 ? 99 : area;
}

function price(b) { return prices[b.id] ? Number(prices[b.id]) : 0; }
function priceLabel(b) { return price(b) ? '\u00a3' + price(b) : 'Set price'; }
function stop() { return route[currentIndex] || route[0]; }
function cleanQuery(b) { return b.name + ', York, UK'; }
function listing(b) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(b.name); }
function dir(b) { return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(cleanQuery(b)); }
function map(b) { return 'https://maps.google.com/maps?f=q&source=s_q&hl=en&q=' + encodeURIComponent(cleanQuery(b)) + '&z=18&output=embed'; }
function balance() { return Object.values(completed).reduce((sum, n) => sum + Number(n || 0), 0); }

function statusFor(b) {
  if (statuses[b.id] === 'comeback') return 'comeback';
  return safeParse(projectsKey, {})[b.id] ? 'visited' : 'not-visited';
}

function statusLabel(status) {
  if (status === 'visited') return 'Visited';
  if (status === 'comeback') return 'Come back later';
  return 'Not visited';
}

function statusClassFor(b) {
  return 'shop-status-' + statusFor(b);
}

function statusTag(b) {
  const status = statusFor(b);
  return `<span class="shop-status-tag ${statusClassFor(b)}">${statusLabel(status)}</span>`;
}

function setShopStatus(id, status) {
  if (status) statuses[id] = status;
  else delete statuses[id];
  localStorage.setItem(statusKey, JSON.stringify(statuses));
  cloudPush();
}

function rebuildRoute() {
  const current = stop()?.id;
  route = businesses.filter(b => !removed.has(b.id)).sort((a, b) => a.score - b.score || areaRank(a) - areaRank(b));
  const found = route.findIndex(b => b.id === current);
  if (found > -1) currentIndex = found;
  if (currentIndex >= route.length) currentIndex = 0;
}

function recenterMap() {
  const b = stop();
  if (!b) return;
  const fresh = map(b) + '&reload=' + Date.now();
  mapFrame.src = fresh;
  lastMapUrl = fresh;
  locateBtn.textContent = 'OK';
  setTimeout(() => { locateBtn.textContent = '\u2316'; }, 700);
}

function scriptFor(b) {
  const p = price(b);
  return 'Hi, sorry to bother you. I am local in York and I help small businesses improve how they look on Google Maps. I was checking your listing and I think there may be a few quick improvements with photos, wording, review replies or a review QR code. ' + (p ? 'I can do a one-off Google Maps upgrade for \u00a3' + p + '. ' : 'I can give you a quick one-off price after checking what needs doing. ') + 'No monthly contract. Would the owner or manager be the best person to speak to?';
}

function defaultNote(b) {
  return 'Aquilo number: ' + aquiloNumber + '\n\nQuick notes for ' + b.name + ':\n- Photos:\n- Reviews/replies:\n- Description/menu:\n- Owner/manager:';
}

function noteFor(b) { return notes[b.id] || defaultNote(b); }
function contactFor(b) { return contacts[b.id] || {}; }
function proofText() { return 'We would improve your Google Maps listing by making the first impression clearer: stronger photos, better wording, review QR system, and simple reply templates.'; }
function setMenuVersion() {
  const sub = document.querySelector('.menu-head span');
  if (sub) sub.textContent = 'York route \u00b7 v: ' + APP_VERSION;
}

function render(updateMap = true) {
  const b = stop();
  setMenuVersion();
  if (!b) {
    progressText.textContent = 'No shops left';
    nextStopCard.innerHTML = '<div class="stop-top"><div><span class="mini-label">Route complete</span><h1>No shops left</h1><p>You removed every shop from this device.</p></div></div>';
    detailPanel.innerHTML = '';
    return;
  }

  const c = contactFor(b);
  progressText.textContent = 'Stop ' + (currentIndex + 1) + ' of ' + route.length + ' \u00b7 \u00a3' + balance() + ' made';
  nextStopCard.classList.toggle('shop-comeback-card', statusFor(b) === 'comeback');
  nextStopCard.classList.toggle('shop-visited-card', statusFor(b) === 'visited');

  const newMap = map(b);
  if (updateMap && newMap !== lastMapUrl) {
    mapFrame.src = newMap;
    lastMapUrl = newMap;
  }

  nextStopCard.innerHTML =
    '<div class="stop-top"><div><span class="mini-label">Next stop</span><h1>' + b.name + '</h1><div class="status-line">' + statusTag(b) + '<span>' + b.area + '</span></div></div><button class="score-badge" id="setPriceBtn">' + priceLabel(b) + '</button></div>' +
    '<div class="stop-tags"><span>' + b.priority + ' target</span><span>' + b.category + '</span><span>best route</span></div>' +
    '<div class="primary-actions"><a class="start-route route-pulse" href="' + dir(b) + '" target="_blank" rel="noreferrer">Start route</a><button id="startProjectBtn">Start project</button><button id="comebackBtn">' + (statusFor(b) === 'comeback' ? 'Undo come back later' : 'Come back later') + '</button></div>';

  detailPanel.innerHTML =
    '<details class="detail-row script-card collapsible-row"><summary><strong>In-person script</strong><span>Tap to open</span></summary><p>' + scriptFor(b) + '</p></details>' +
    '<details class="detail-row proof-card demo-card collapsible-row"><summary><strong>Proof/demo mode</strong><span>Tap to open</span></summary><h3>' + b.name + '</h3><p>' + proofText(b) + '</p><ul><li>Improve first 5 Google photos</li><li>Add clearer service/product wording</li><li>Create review QR code</li><li>Give review reply templates</li></ul></details>' +
    '<div class="detail-row"><details class="home-contact-drop"><summary>Contact details</summary><div class="contact-grid"><input id="ownerInput" placeholder="Owner/manager name" value="' + (c.owner || '') + '"><input id="phoneInput" placeholder="Phone" value="' + (c.phone || '') + '"><input id="emailInput" placeholder="Email" value="' + (c.email || '') + '"><input id="instaInput" placeholder="Instagram" value="' + (c.instagram || '') + '"><input id="timeInput" placeholder="Best time to contact" value="' + (c.bestTime || '') + '"></div><button id="saveContactBtn" class="small-save-btn">Save contact</button></details></div>' +
    '<div class="detail-row"><strong>Price</strong><div class="inline-price"><span>\u00a3</span><input id="priceInput" class="money-input" type="number" inputmode="numeric" placeholder="Price" value="' + (price(b) || '') + '"></div></div>' +
    '<div class="detail-actions"><a href="' + listing(b) + '" target="_blank" rel="noreferrer">View listing</a><button id="removeBtn" class="danger-btn">Remove shop</button></div>' +
    '<textarea id="noteBox" placeholder="Write notes here...">' + noteFor(b) + '</textarea><button id="saveNoteBtn" class="note-save-btn">Save note</button>';

  document.querySelector('#setPriceBtn').onclick = () => setPrice(b);
  document.querySelector('#priceInput').oninput = e => savePriceValue(b, e.target.value, false);
  document.querySelector('#startProjectBtn').onclick = () => startProject(b, true);
  document.querySelector('#comebackBtn').onclick = () => comebackLater(b);
  document.querySelector('#saveNoteBtn').onclick = saveNote;
  document.querySelector('#saveContactBtn').onclick = saveContact;
  document.querySelector('#removeBtn').onclick = () => confirmRemove(b);
}

function setPrice(b) {
  const val = prompt('Enter price for ' + b.name, price(b) || '');
  if (val === null) return;
  savePriceValue(b, val, true);
}

function savePriceValue(b, val, rerender) {
  if (val) prices[b.id] = Number(val);
  else delete prices[b.id];
  localStorage.setItem(pricesKey, JSON.stringify(prices));
  cloudPush();
  if (rerender) render(false);
  else {
    const badge = document.querySelector('#setPriceBtn');
    if (badge) badge.textContent = priceLabel(b);
  }
}

function startProject(b, openHub = false) {
  const projects = safeParse(projectsKey, {});
  const old = projects[b.id] || {};
  projects[b.id] = { id: b.id, name: b.name, area: b.area, category: b.category, website: old.website || '', status: old.status || 'Started', progress: old.progress || {}, completed: old.completed || false, created: old.created || Date.now(), updated: Date.now() };
  localStorage.setItem(projectsKey, JSON.stringify(projects));
  setShopStatus(b.id, 'visited');
  cloudPush();
  if (openHub && window.ProjectHub) ProjectHub.open(b.id);
}

function flash() {
  nextStopCard.classList.add('skip-flash');
  setTimeout(() => nextStopCard.classList.remove('skip-flash'), 180);
}

function lockSwipe() {
  swipeLocked = true;
  setTimeout(() => { swipeLocked = false; }, 450);
}

function skip() {
  if (!stop() || swipeLocked) return;
  lockSwipe();
  const current = stop();
  skipped.add(current.id);
  localStorage.setItem(skippedKey, JSON.stringify([...skipped]));
  currentIndex = (currentIndex + 1) % route.length;
  bottomSheet.classList.remove('expanded');
  flash();
  render();
}

function comebackLater(b) {
  if (!b) return;
  if (statusFor(b) === 'comeback') {
    setShopStatus(b.id, null);
    bottomSheet.classList.remove('expanded');
    flash();
    render();
    return;
  }
  if (swipeLocked) return;
  lockSwipe();
  setShopStatus(b.id, 'comeback');
  currentIndex = (currentIndex + 1) % route.length;
  bottomSheet.classList.remove('expanded');
  flash();
  render();
}

function previous() {
  if (!route.length || swipeLocked) return;
  lockSwipe();
  currentIndex = currentIndex > 0 ? currentIndex - 1 : route.length - 1;
  bottomSheet.classList.remove('expanded');
  flash();
  render();
}

function confirmRemove(b) { showConfirm('Remove this shop?', () => removeShop(b)); }
function removeShop(b) {
  lastRemoved = b.id;
  removed.add(b.id);
  skipped.delete(b.id);
  localStorage.setItem(removedKey, JSON.stringify([...removed]));
  localStorage.setItem(skippedKey, JSON.stringify([...skipped]));
  readLocal();
  rebuildRoute();
  bottomSheet.classList.remove('expanded');
  cloudPush();
  render();
  showUndo('Shop removed', () => {
    removed.delete(lastRemoved);
    localStorage.setItem(removedKey, JSON.stringify([...removed]));
    readLocal();
    rebuildRoute();
    cloudPush();
    render();
  });
}

function saveNote() {
  if (!stop()) return;
  notes[stop().id] = document.querySelector('#noteBox').value.trim();
  localStorage.setItem(notesKey, JSON.stringify(notes));
  const btn = document.querySelector('#saveNoteBtn');
  btn.textContent = 'Saved';
  setTimeout(() => { btn.textContent = 'Save note'; }, 900);
  cloudPush();
  startProject(stop());
}

function saveContact() {
  if (!stop()) return;
  contacts[stop().id] = {
    owner: document.querySelector('#ownerInput').value.trim(),
    phone: document.querySelector('#phoneInput').value.trim(),
    email: document.querySelector('#emailInput').value.trim(),
    instagram: document.querySelector('#instaInput').value.trim(),
    bestTime: document.querySelector('#timeInput').value.trim()
  };
  localStorage.setItem(contactsKey, JSON.stringify(contacts));
  const btn = document.querySelector('#saveContactBtn');
  btn.textContent = 'Saved';
  setTimeout(() => { btn.textContent = 'Save contact'; }, 900);
  cloudPush();
  startProject(stop());
}

function showConfirm(text, yes) {
  document.querySelector('#confirmPop')?.remove();
  const pop = document.createElement('div');
  pop.id = 'confirmPop';
  pop.className = 'confirm-pop';
  pop.innerHTML = '<div><strong>' + text + '</strong><div><button id="noBtn">No</button><button id="yesBtn">Yes</button></div></div>';
  document.body.appendChild(pop);
  pop.querySelector('#noBtn').onclick = () => pop.remove();
  pop.querySelector('#yesBtn').onclick = () => { pop.remove(); yes(); };
}

function showUndo(text, undo) {
  document.querySelector('#undoToast')?.remove();
  const toast = document.createElement('div');
  toast.id = 'undoToast';
  toast.className = 'undo-toast';
  toast.innerHTML = '<span>' + text + '</span><button>Undo</button>';
  document.body.appendChild(toast);
  toast.querySelector('button').onclick = () => { toast.remove(); undo(); };
  setTimeout(() => toast.remove(), 5000);
}

function openMenu() {
  activeMenu = 'route';
  sideMenu.classList.add('open');
  menuBackdrop.classList.add('open');
  renderMenu('route');
  setMenuVersion();
}

function shutMenu() {
  sideMenu.classList.remove('open');
  menuBackdrop.classList.remove('open');
  activeMenu = 'route';
}

function teamListHtml() {
  const list = (window.YorkSync && YorkSync.members ? YorkSync.members() : teamMembers) || [];
  if (!list.length) return '<p class="empty-text">No team members loaded yet.</p>';
  return list.map(m => '<div class="note-row"><strong>' + (m.name || 'Team member') + '</strong><p>' + (m.email || '') + '</p></div>').join('');
}

function routeRow(b, i) {
  const selected = i === currentIndex ? ' selected' : '';
  return '<button class="shop-row ' + statusClassFor(b) + selected + '" data-i="' + i + '"><span>' + (i + 1) + '</span><div><strong>' + b.name + '</strong><div class="row-status">' + statusTag(b) + '</div><small>' + b.area + ' \u00b7 ' + b.score + '/10</small></div></button>';
}

function renderMenu(section) {
  activeMenu = section;
  setMenuVersion();
  document.querySelectorAll('.menu-item').forEach(b => b.classList.toggle('active', b.dataset.section === section));

  if (section === 'shop') { if (window.ShopPage) ShopPage.open(); return; }
  if (section === 'projects') { if (window.ProjectHub) ProjectHub.open(); return; }
  if (section === 'route') {
    menuContent.innerHTML = '<h2>Today\'s route</h2>' + route.map(routeRow).join('') + (removed.size ? '<div class="note-row"><strong>Removed shops</strong><p>' + removed.size + ' hidden on this device.</p></div>' : '');
    menuContent.querySelectorAll('.shop-row').forEach(r => {
      r.onclick = () => {
        currentIndex = Number(r.dataset.i);
        shutMenu();
        render();
      };
    });
  }
  if (section === 'money') {
    menuContent.innerHTML = '<h2>Money tracker</h2><div class="money-card"><strong>\u00a3' + balance() + '</strong><span>Total completed value</span></div>' + Object.entries(completed).map(([id, n]) => {
      const b = businesses.find(x => x.id === id);
      return '<div class="note-row"><strong>' + ((b && b.name) || id) + '</strong><p>Completed for \u00a3' + n + '</p></div>';
    }).join('');
  }
  if (section === 'sync') {
    const signed = !!(window.YorkSync && YorkSync.signed && YorkSync.signed());
    const signInButton = signed ? '' : '<button id="signInBtn">Sign in with Google</button>';
    menuContent.innerHTML = '<h2>Team</h2><div class="help-card"><p id="syncStatus">' + ((window.YorkSync && YorkSync.status()) || 'Loading sync...') + '</p></div><h2>Team members</h2><div id="teamMembersBox">' + teamListHtml() + '</div><div class="detail-actions team-actions">' + signInButton + '<button id="makeTeamBtn">Create team code</button></div><div class="detail-row"><strong>Join a team</strong><p><input id="teamCodeInput" class="money-input" placeholder="CODE"><button id="joinTeamBtn">Join</button></p></div>';
    if (!signed) document.querySelector('#signInBtn').onclick = async () => { try { await YorkSync.signIn(); renderMenu('sync'); } catch (e) { alert(e.message); } };
    document.querySelector('#makeTeamBtn').onclick = async () => { try { const c = await YorkSync.createTeam(); alert('Team code: ' + c); renderMenu('sync'); } catch (e) { alert(e.message); } };
    document.querySelector('#joinTeamBtn').onclick = async () => { try { const c = await YorkSync.joinTeam(document.querySelector('#teamCodeInput').value); alert('Joined team: ' + c); renderMenu('sync'); } catch (e) { alert(e.message); } };
  }
}

window.applyCloudUpdate = function () {
  const before = stop()?.id;
  readLocal();
  rebuildRoute();
  const after = stop()?.id;
  render(before !== after);
  if (activeMenu === 'sync' && sideMenu.classList.contains('open')) renderMenu('sync');
};

window.updateTeamMembers = function (m) {
  teamMembers = m || [];
  if (activeMenu === 'sync' && sideMenu.classList.contains('open')) renderMenu('sync');
};

window.rebuildRoute = rebuildRoute;
window.render = render;
readLocal();
localStorage.setItem(routeModeKey, 'best');
rebuildRoute();

function isSheetGestureTarget(t) {
  return !!(t.closest && t.closest('.sheet-handle,.swipe-hint,#nextStopCard'));
}

bottomSheet.ontouchstart = e => {
  sx = e.touches[0].clientX;
  sy = e.touches[0].clientY;
  sheetGesture = isSheetGestureTarget(e.target);
};

bottomSheet.ontouchend = e => {
  if (!sheetGesture || swipeLocked) return;
  const dx = e.changedTouches[0].clientX - sx;
  const dy = e.changedTouches[0].clientY - sy;
  if (dx < -90 && Math.abs(dx) > Math.abs(dy) * 1.4) { skip(); return; }
  if (dx > 90 && Math.abs(dx) > Math.abs(dy) * 1.4) { previous(); return; }
  if (Math.abs(dy) > 55 && Math.abs(dy) > Math.abs(dx) * 1.2) {
    if (dy < 0) bottomSheet.classList.add('expanded');
    else bottomSheet.classList.remove('expanded');
  }
};

bottomSheet.onclick = e => {
  if (e.target.closest && e.target.closest('.sheet-handle,.swipe-hint')) bottomSheet.classList.toggle('expanded');
};

sideMenu.ontouchstart = e => {
  menuSx = e.touches[0].clientX;
  menuSy = e.touches[0].clientY;
};

sideMenu.ontouchend = e => {
  const dx = e.changedTouches[0].clientX - menuSx;
  const dy = e.changedTouches[0].clientY - menuSy;
  if (dx < -70 && Math.abs(dx) > Math.abs(dy)) shutMenu();
};

menuBtn.onclick = openMenu;
closeMenu.onclick = shutMenu;
menuBackdrop.onclick = shutMenu;
locateBtn.onclick = recenterMap;
document.querySelectorAll('.menu-item').forEach(b => { b.onclick = () => renderMenu(b.dataset.section); });
render();
window.openMainMenu = openMenu;
