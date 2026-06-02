(() => {
  const notesKey = 'york-notes-v4';
  const removedKey = 'york-removed-v1';
  const pricesKey = 'york-prices-v1';
  const completedKey = 'york-completed-v1';
  const contactsKey = 'york-contacts-v1';

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }

  function price(b) {
    const prices = read('york-prices-v1', {});
    if (prices[b.id]) return Number(prices[b.id]);
    let base = b.score <= 4 ? 100 : b.score <= 5 ? 85 : b.score <= 6 ? 75 : 50;
    if (['Jewellery', 'Retail', 'Tourist shop'].includes(b.category)) base += 10;
    if (b.priority === 'High') base += 15;
    if (b.priority === 'Low') base -= 15;
    return Math.max(40, base);
  }

  function mapsLink(b) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(b.name + ', York, UK');
  }

  function page() {
    let p = document.querySelector('#cleanPage');
    if (p) return p;
    p = document.createElement('section');
    p.id = 'cleanPage';
    p.className = 'clean-page';
    p.innerHTML = '<div class="clean-page-head"><button id="cleanPageBack">‹</button><div><strong id="cleanPageTitle">Page</strong><span id="cleanPageSub">York route app</span></div></div><div id="cleanPageContent" class="clean-page-content"></div>';
    document.body.appendChild(p);
    document.querySelector('#cleanPageBack').onclick = close;
    return p;
  }

  function close() {
    document.querySelector('#cleanPage')?.classList.remove('open');
  }

  function open(title, sub, html) {
    const p = page();
    p.querySelector('#cleanPageTitle').textContent = title;
    p.querySelector('#cleanPageSub').textContent = sub;
    p.querySelector('#cleanPageContent').innerHTML = html;
    p.classList.add('open');
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
      <a class="clean-row" href="${mapsLink(b)}" target="_blank" rel="noreferrer">
        <span>${i + 1}</span>
        <div><strong>${b.name}</strong><small>${b.area} · £${price(b)} · ${b.priority}</small></div>
      </a>`).join(''));
  }

  function renderShops() {
    const list = activeBusinesses().sort((a, b) => a.name.localeCompare(b.name));
    open('All shops', list.length + ' shops saved', list.map(b => `
      <a class="clean-row" href="${mapsLink(b)}" target="_blank" rel="noreferrer">
        <span>↗</span>
        <div><strong>${b.name}</strong><small>${b.category} · ${b.area}</small></div>
      </a>`).join(''));
  }

  function renderMoney() {
    const completed = read(completedKey, {});
    const total = Object.values(completed).reduce((s, n) => s + Number(n || 0), 0);
    const rows = Object.entries(completed).map(([id, amount]) => {
      const b = (window.businesses || []).find(x => x.id === id);
      return `<div class="clean-card"><strong>${b?.name || id}</strong><p>Completed for £${amount}</p></div>`;
    }).join('');
    open('Money tracker', '£' + total + ' total completed value', `<div class="mini-stat"><strong>£${total}</strong><span>Total made</span></div>${rows || '<p class="empty-text">No completed jobs yet.</p>'}`);
  }

  function renderNotes() {
    const notes = read(notesKey, {});
    const contacts = read(contactsKey, {});
    const ids = new Set([...Object.keys(notes), ...Object.keys(contacts)]);
    const rows = [...ids].map(id => {
      const b = (window.businesses || []).find(x => x.id === id);
      const c = contacts[id] || {};
      return `<div class="clean-card"><strong>${b?.name || id}</strong><p>${c.owner || ''} ${c.phone ? '· ' + c.phone : ''}</p><p>${String(notes[id] || 'No note saved.').replace(/\n/g, '<br>')}</p></div>`;
    }).join('');
    open('Saved notes', ids.size + ' shops with saved info', rows || '<p class="empty-text">No notes saved yet.</p>');
  }

  function removeHowTo() {
    document.querySelector('[data-section="help"]')?.remove();
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest?.('.menu-item[data-section]');
    if (!btn) return;
    const section = btn.dataset.section;
    if (section === 'sync') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (section === 'route') renderRoute();
    if (section === 'shops') renderShops();
    if (section === 'money') renderMoney();
    if (section === 'notes') renderNotes();
  }, true);

  window.addEventListener('load', removeHowTo);
  new MutationObserver(removeHowTo).observe(document.body, { childList: true, subtree: true });
})();
