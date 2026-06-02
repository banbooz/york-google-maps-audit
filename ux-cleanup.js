(() => {
  const REMOVED_KEY = 'york-removed-v1';
  const PRICES_KEY = 'york-prices-v1';
  const NOTES_KEY = 'york-notes-v4';
  const CONTACTS_KEY = 'york-contacts-v1';
  const COMPLETED_KEY = 'york-completed-v1';
  const PROJECT_KEY = 'york-projects-v1';
  let lastRemoved = null;

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function sync() { if (window.YorkSync && YorkSync.push) YorkSync.push().catch(() => {}); }
  function currentName() { return document.querySelector('#nextStopCard h1')?.textContent?.trim() || ''; }
  function shopByName(name) { return (window.businesses || []).find(b => b.name === name); }
  function currentShop() { return shopByName(currentName()); }

  function pushPageState(id) {
    if (!history.state || history.state.page !== id) history.pushState({ page: id }, '', '#' + id);
  }
  function closePages() {
    document.querySelectorAll('.clean-page.open,.project-page.open').forEach(p => p.classList.remove('open'));
  }
  window.addEventListener('popstate', () => closePages());

  function patchMenu() {
    document.querySelector('[data-section="notes"]')?.remove();
    document.querySelector('[data-section="shops"]')?.remove();
    const route = document.querySelector('[data-section="route"]');
    if (route) route.textContent = 'Route';
    const money = document.querySelector('[data-section="money"]');
    if (money) money.textContent = 'Money';
    const syncBtn = document.querySelector('[data-section="sync"]');
    if (syncBtn) syncBtn.textContent = 'Team';
  }

  function patchFullPageHistory() {
    document.querySelectorAll('.menu-item[data-section="route"],.menu-item[data-section="money"],#projectHubBtn').forEach(btn => {
      if (btn.dataset.historyPatched) return;
      btn.dataset.historyPatched = '1';
      btn.addEventListener('click', () => {
        const id = btn.id === 'projectHubBtn' ? 'projects' : btn.dataset.section;
        setTimeout(() => pushPageState(id), 50);
      }, true);
    });
  }

  function patchPriceUI() {
    const b = currentShop();
    if (!b) return;
    const prices = read(PRICES_KEY, {});
    const custom = prices[b.id] || '';
    const badge = document.querySelector('.score-badge');
    if (badge) {
      badge.classList.add('set-price-badge');
      badge.textContent = custom ? '£' + custom : 'Set price';
      badge.onclick = () => {
        const val = prompt('Enter price for ' + b.name, custom || '');
        if (val === null) return;
        const next = read(PRICES_KEY, {});
        if (String(val).trim()) next[b.id] = Number(val);
        else delete next[b.id];
        write(PRICES_KEY, next); sync(); patchMainSheet();
      };
    }
    const row = [...document.querySelectorAll('.detail-row')].find(r => /Recommended ask price|Your price|Suggested:/i.test(r.textContent || ''));
    if (row && !row.dataset.rebuiltPrice) {
      row.dataset.rebuiltPrice = '1';
      row.innerHTML = `<strong>Price</strong><div class="inline-price"><span>£</span><input id="priceInput" class="money-input" type="number" inputmode="numeric" placeholder="Price" value="${custom}"></div>`;
      const input = row.querySelector('#priceInput');
      input.addEventListener('change', () => {
        const next = read(PRICES_KEY, {});
        if (input.value) next[b.id] = Number(input.value);
        else delete next[b.id];
        write(PRICES_KEY, next); sync(); patchMainSheet();
      });
    }
    document.querySelector('#savePriceBtn')?.remove();
  }

  function makeContactCollapsible() {
    const row = [...document.querySelectorAll('.detail-row')].find(r => /Client contact details/i.test(r.textContent || ''));
    if (!row || row.dataset.contactCollapsible) return;
    row.dataset.contactCollapsible = '1';
    const content = row.innerHTML.replace(/<strong>Client contact details<\/strong>/i, '');
    row.innerHTML = `<details class="home-contact-drop"><summary>Contact details</summary>${content}<button id="saveContactInline" class="small-save-btn">Save contact</button></details>`;
    const save = row.querySelector('#saveContactInline');
    save.onclick = () => {
      const b = currentShop(); if (!b) return;
      const contacts = read(CONTACTS_KEY, {});
      contacts[b.id] = {
        owner: row.querySelector('#ownerInput')?.value.trim() || '',
        phone: row.querySelector('#phoneInput')?.value.trim() || '',
        email: row.querySelector('#emailInput')?.value.trim() || '',
        instagram: row.querySelector('#instaInput')?.value.trim() || '',
        bestTime: row.querySelector('#timeInput')?.value.trim() || ''
      };
      write(CONTACTS_KEY, contacts); sync();
      if (window.ProjectHub?.create) ProjectHub.create(b.name);
      save.textContent = 'Saved'; setTimeout(() => save.textContent = 'Save contact', 900);
    };
    document.querySelector('#saveContactBtn')?.remove();
  }

  function moveNotesSave() {
    const note = document.querySelector('#noteBox');
    const save = document.querySelector('#saveNoteBtn');
    if (!note || !save || save.dataset.moved) return;
    save.dataset.moved = '1';
    save.classList.add('note-save-btn');
    note.insertAdjacentElement('afterend', save);
  }

  function confirmRemoveFlow() {
    const remove = document.querySelector('#removeBtn');
    const view = document.querySelector('.detail-actions a');
    if (!remove || remove.dataset.confirmPatched) return;
    remove.dataset.confirmPatched = '1';
    remove.textContent = 'Remove shop';
    if (view) view.insertAdjacentElement('afterend', remove);
    remove.onclick = e => {
      e.preventDefault();
      const b = currentShop(); if (!b) return;
      showConfirm('Remove this shop?', () => {
        const removed = new Set(read(REMOVED_KEY, []));
        removed.add(b.id); write(REMOVED_KEY, [...removed]); sync(); lastRemoved = b.id;
        showUndo('Shop removed', () => {
          const now = new Set(read(REMOVED_KEY, []));
          now.delete(lastRemoved); write(REMOVED_KEY, [...now]); sync(); location.reload();
        });
        setTimeout(() => location.reload(), 450);
      });
    };
  }

  function showConfirm(text, yes) {
    document.querySelector('#confirmPop')?.remove();
    const pop = document.createElement('div');
    pop.id = 'confirmPop';
    pop.className = 'confirm-pop';
    pop.innerHTML = `<div><strong>${text}</strong><div><button id="noBtn">No</button><button id="yesBtn">Yes</button></div></div>`;
    document.body.appendChild(pop);
    pop.querySelector('#noBtn').onclick = () => pop.remove();
    pop.querySelector('#yesBtn').onclick = () => { pop.remove(); yes(); };
  }

  function showUndo(text, undo) {
    document.querySelector('#undoToast')?.remove();
    const toast = document.createElement('div');
    toast.id = 'undoToast';
    toast.className = 'undo-toast';
    toast.innerHTML = `<span>${text}</span><button>Undo</button>`;
    document.body.appendChild(toast);
    toast.querySelector('button').onclick = () => { toast.remove(); undo(); };
    setTimeout(() => toast.remove(), 5000);
  }

  function reorderActions() {
    const actions = document.querySelector('.primary-actions');
    const start = document.querySelector('#startProjectBtn');
    if (actions && start && !actions.querySelector('#startProjectBtn')) actions.appendChild(start);
    const route = document.querySelector('.start-route');
    if (route) route.classList.add('route-pulse');
  }

  function patchMainSheet() {
    patchMenu(); patchFullPageHistory(); patchPriceUI(); makeContactCollapsible(); moveNotesSave(); confirmRemoveFlow(); reorderActions();
    document.querySelectorAll('#bestRouteBtn,#walkRouteBtn').forEach(b => b.remove());
  }

  function patchMoneyPage() {
    const page = document.querySelector('#cleanPage.open #cleanPageTitle');
    if (!page || !/Money/i.test(page.textContent)) return;
    const content = document.querySelector('#cleanPageContent');
    if (!content || document.querySelector('#resetMoneyBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'resetMoneyBtn';
    btn.className = 'reset-money-btn';
    btn.textContent = 'Reset money tracker';
    btn.onclick = () => showConfirm('Reset all completed money?', () => { write(COMPLETED_KEY, {}); sync(); location.reload(); });
    content.prepend(btn);
  }

  function patchRoutePage() {
    const page = document.querySelector('#cleanPage.open #cleanPageTitle');
    if (!page || !/Route/i.test(page.textContent)) return;
    document.querySelectorAll('#cleanPageContent .clean-row small').forEach(s => {
      s.textContent = s.textContent.replace(/ · £\d+/g, '').replace(/£\d+ · /g, '');
    });
  }

  const obs = new MutationObserver(() => setTimeout(() => { patchMainSheet(); patchMoneyPage(); patchRoutePage(); }, 60));
  obs.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('load', () => setTimeout(() => { patchMainSheet(); patchMoneyPage(); patchRoutePage(); }, 400));
})();
