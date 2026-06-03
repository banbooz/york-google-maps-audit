(() => {
  const notesKey = 'york-notes-v4';
  const removedKey = 'york-removed-v1';
  const completedKey = 'york-completed-v1';
  const moneyHistoryKey = 'york-money-history-v1';
  const contactsKey = 'york-contacts-v1';
  const statusKey = 'york-shop-status-v1';

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }

  function mapsLink(b) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(b.name);
  }

  function statusFor(b) {
    const statuses = read(statusKey, {});
    const projects = read('york-projects-v1', {});
    if (statuses[b.id] === 'comeback') return 'comeback';
    return projects[b.id] ? 'visited' : 'not-visited';
  }

  function statusLabel(status) {
    if (status === 'visited') return 'Visited';
    if (status === 'comeback') return 'Come back later';
    return 'Not visited';
  }

  function statusTag(b) {
    const status = statusFor(b);
    return `<span class="shop-status-tag shop-status-${status}">${statusLabel(status)}</span>`;
  }

  function page() {
    let p = document.querySelector('#cleanPage');
    if (p) return p;
    p = document.createElement('section');
    p.id = 'cleanPage';
    p.className = 'clean-page';
    p.innerHTML = '<div class="clean-page-head"><button id="cleanPageBack">&lsaquo;</button><div><strong id="cleanPageTitle">Page</strong><span id="cleanPageSub">York route app</span></div></div><div id="cleanPageContent" class="clean-page-content"></div>';
    document.body.appendChild(p);
    document.querySelector('#cleanPageBack').onclick = () => close();
    return p;
  }

  function baseUrl() {
    const url = new URL(location.href);
    url.searchParams.delete('page');
    return url.toString();
  }

  function pageUrl(name) {
    const url = new URL(baseUrl());
    url.searchParams.set('page', name);
    return url.toString();
  }

  function close(fromHistory = false) {
    const p = document.querySelector('#cleanPage');
    if (!p?.classList.contains('open')) return;
    if (!fromHistory && history.state?.cleanPage) { history.back(); return; }
    p.classList.add('exit-left');
    document.querySelector('#menuBtn')?.click();
    setTimeout(() => p.classList.remove('open', 'exit-left'), 240);
  }

  function open(title, sub, html, pageName = 'page') {
    const p = page();
    p.querySelector('#cleanPageTitle').textContent = title;
    p.querySelector('#cleanPageSub').innerHTML = sub;
    p.querySelector('#cleanPageContent').innerHTML = html;
    p.classList.remove('exit-left');
    p.classList.add('open');
    if (!history.state?.cleanPage) {
      if (new URL(location.href).searchParams.get('page') === 'projects') history.replaceState({}, '', baseUrl());
      history.pushState({ cleanPage: true, cleanPageName: pageName }, '', pageUrl(pageName));
    }
    document.querySelector('#sideMenu')?.classList.remove('open');
    document.querySelector('#menuBackdrop')?.classList.remove('open');
  }

  function activeBusinesses() {
    const removed = new Set(read(removedKey, []));
    return (window.businesses || []).filter(b => !removed.has(b.id));
  }

  function renderRoute() {
    const list = activeBusinesses().sort((a, b) => a.score - b.score);
    open('Current route', list.length + ' possible shops', list.map((b, i) => `
      <a class="clean-row shop-status-${statusFor(b)}" href="${mapsLink(b)}" target="_blank" rel="noreferrer">
        <span>${i + 1}</span>
        <div><strong>${b.name}</strong>${statusTag(b)}<small>${b.area} &middot; ${b.priority}</small></div>
      </a>`).join(''), 'route');
  }

  function renderShops() {
    const list = activeBusinesses().sort((a, b) => a.name.localeCompare(b.name));
    open('All shops', list.length + ' shops saved', list.map(b => `
      <a class="clean-row shop-status-${statusFor(b)}" href="${mapsLink(b)}" target="_blank" rel="noreferrer">
        <span>&nearr;</span>
        <div><strong>${b.name}</strong>${statusTag(b)}<small>${b.category} &middot; ${b.area}</small></div>
      </a>`).join(''), 'shops');
  }

  function renderMoney() {
    const completed = read(completedKey, {});
    const saved = read(moneyHistoryKey, []);
    const total = Object.values(completed).reduce((s, n) => s + Number(n || 0), 0);
    const rows = Object.entries(completed).map(([id, amount]) => {
      const b = (window.businesses || []).find(x => x.id === id);
      return `<div class="clean-card"><strong>${b?.name || id}</strong>${b ? statusTag(b) : ''}<p>Completed for &pound;${amount}</p></div>`;
    }).join('');
    const savedRows = saved.map(item => `<div class="clean-card saved-money-row"><strong>&pound;${item.total || 0}</strong><p>${item.date || 'Saved total'} &middot; ${item.count || 0} completed job${item.count === 1 ? '' : 's'}</p></div>`).join('');
    open('Money tracker', '&pound;' + total + ' total completed value', `<div class="mini-stat"><strong>&pound;${total}</strong><span>Total made</span></div><div class="money-actions"><button id="saveMoneyBtn">Save current total</button><button id="resetMoneyBtn" class="danger-money-btn">Reset to &pound;0</button></div><h2>Current history</h2>${rows || '<p class="empty-text">No completed jobs yet.</p>'}<h2>Saved history</h2>${savedRows || '<p class="empty-text">No saved money history yet.</p>'}`, 'money');
    document.querySelector('#saveMoneyBtn').onclick = () => {
      const current = read(completedKey, {});
      const currentTotal = Object.values(current).reduce((s, n) => s + Number(n || 0), 0);
      const history = read(moneyHistoryKey, []);
      history.unshift({ total: currentTotal, count: Object.keys(current).length, date: new Date().toLocaleDateString('en-GB'), savedAt: Date.now(), entries: current });
      localStorage.setItem(moneyHistoryKey, JSON.stringify(history));
      renderMoney();
    };
    document.querySelector('#resetMoneyBtn').onclick = () => {
      if (!confirm('Reset current money back to GBP 0? Saved history will stay.')) return;
      localStorage.setItem(completedKey, '{}');
      if (window.YorkSync && YorkSync.push) YorkSync.push().catch(() => {});
      renderMoney();
    };
  }

  function renderNotes() {
    const notes = read(notesKey, {});
    const contacts = read(contactsKey, {});
    const ids = new Set([...Object.keys(notes), ...Object.keys(contacts)]);
    const rows = [...ids].map(id => {
      const b = (window.businesses || []).find(x => x.id === id);
      const c = contacts[id] || {};
      return `<div class="clean-card"><strong>${b?.name || id}</strong>${b ? statusTag(b) : ''}<p>${c.owner || ''} ${c.phone ? '&middot; ' + c.phone : ''}</p><p>${String(notes[id] || 'No note saved.').replace(/\n/g, '<br>')}</p></div>`;
    }).join('');
    open('Saved notes', ids.size + ' shops with saved info', rows || '<p class="empty-text">No notes saved yet.</p>', 'notes');
  }

  function removeHowTo() {
    document.querySelector('[data-section="help"]')?.remove();
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest?.('.menu-item[data-section]');
    if (!btn) return;
    const section = btn.dataset.section;
    if (section === 'sync' || section === 'projects' || section === 'shop' || section === 'route') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (section === 'route') renderRoute();
    if (section === 'shops') renderShops();
    if (section === 'money') renderMoney();
    if (section === 'notes') renderNotes();
  }, true);

  window.addEventListener('load', removeHowTo);
  window.addEventListener('popstate', () => close(true));
  new MutationObserver(removeHowTo).observe(document.body, { childList: true, subtree: true });
})();
