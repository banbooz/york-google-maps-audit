(() => {
  const VERSION = '27';
  const REMOVED = 'york-removed-v1';
  const PRICES = 'york-prices-v1';
  const CONTACTS = 'york-contacts-v1';
  const COMPLETED = 'york-completed-v1';
  let lastRemoved = null;
  let observer = null;

  const read = (k, f) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(f)); } catch { return f; } };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const sync = () => { if (window.YorkSync?.push) YorkSync.push().catch(() => {}); };
  const activeInput = () => ['INPUT','TEXTAREA'].includes(document.activeElement?.tagName || '');
  const shopName = () => document.querySelector('#nextStopCard h1')?.textContent?.trim() || '';
  const shop = () => (window.businesses || []).find(b => b.name === shopName());

  function refreshApp() {
    if (typeof window.rebuildRoute === 'function' && typeof window.render === 'function') {
      window.rebuildRoute();
      window.render();
    } else setTimeout(() => location.reload(), 300);
  }

  function menu() {
    document.querySelector('[data-section="notes"]')?.remove();
    document.querySelector('[data-section="shops"]')?.remove();
    const sub = document.querySelector('.menu-head span');
    if (sub) sub.textContent = 'York route · v: ' + VERSION;
    const syncBtn = document.querySelector('[data-section="sync"]');
    if (syncBtn) syncBtn.textContent = 'Team';
  }

  function priceText() {
    const b = shop(); if (!b) return;
    const val = read(PRICES, {})[b.id] || '';
    const badge = document.querySelector('.score-badge');
    if (badge) badge.textContent = val ? '£' + val : 'Set price';
  }

  function price() {
    const b = shop(); if (!b) return;
    const val = read(PRICES, {})[b.id] || '';
    const badge = document.querySelector('.score-badge');
    if (badge && !badge.dataset.stablePriceClick) {
      badge.dataset.stablePriceClick = '1';
      badge.classList.add('set-price-badge');
      badge.onclick = e => {
        e.preventDefault(); e.stopPropagation();
        const current = read(PRICES, {})[b.id] || '';
        const nextVal = prompt('Enter price for ' + b.name, current);
        if (nextVal === null) return;
        const all = read(PRICES, {});
        if (String(nextVal).trim()) all[b.id] = Number(nextVal);
        else delete all[b.id];
        write(PRICES, all); sync(); priceText();
      };
    }
    priceText();
    const row = [...document.querySelectorAll('#detailPanel .detail-row')].find(r => r.querySelector('#priceInput'));
    if (row && !row.dataset.stablePriceRow && !activeInput()) {
      row.dataset.stablePriceRow = '1';
      row.innerHTML = `<strong>Price</strong><div class="inline-price"><span>£</span><input id="priceInput" class="money-input" type="number" inputmode="numeric" placeholder="Price" value="${val}"></div>`;
      const input = row.querySelector('#priceInput');
      let t;
      input.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          const all = read(PRICES, {});
          if (input.value) all[b.id] = Number(input.value); else delete all[b.id];
          write(PRICES, all); sync(); priceText();
        }, 400);
      });
    }
    document.querySelector('#savePriceBtn')?.remove();
  }

  function contact() {
    if (activeInput()) return;
    const row = [...document.querySelectorAll('#detailPanel .detail-row')].find(r => /Client contact details/i.test(r.textContent || ''));
    if (!row || row.dataset.stableContact) return;
    row.dataset.stableContact = '1';
    const body = row.innerHTML.replace(/<strong>Client contact details<\/strong>/i, '');
    row.innerHTML = `<details class="home-contact-drop"><summary>Contact details</summary>${body}<button id="saveContactInline" class="small-save-btn">Save contact</button></details>`;
    row.querySelector('#saveContactInline').onclick = e => {
      e.preventDefault(); e.stopPropagation();
      const b = shop(); if (!b) return;
      const c = read(CONTACTS, {});
      c[b.id] = {
        owner: row.querySelector('#ownerInput')?.value.trim() || '',
        phone: row.querySelector('#phoneInput')?.value.trim() || '',
        email: row.querySelector('#emailInput')?.value.trim() || '',
        instagram: row.querySelector('#instaInput')?.value.trim() || '',
        bestTime: row.querySelector('#timeInput')?.value.trim() || ''
      };
      write(CONTACTS, c); sync();
      if (window.ProjectHub?.create) ProjectHub.create(b.name);
      e.target.textContent = 'Saved';
      setTimeout(() => e.target.textContent = 'Save contact', 900);
    };
    document.querySelector('#saveContactBtn')?.remove();
  }

  function notes() {
    const box = document.querySelector('#noteBox');
    const btn = document.querySelector('#saveNoteBtn');
    if (box && btn && !btn.dataset.stableMoved) {
      btn.dataset.stableMoved = '1';
      btn.classList.add('note-save-btn');
      box.insertAdjacentElement('afterend', btn);
    }
  }

  function confirmBox(text, yes) {
    document.querySelector('#confirmPop')?.remove();
    const pop = document.createElement('div');
    pop.id = 'confirmPop';
    pop.className = 'confirm-pop';
    pop.innerHTML = `<div><strong>${text}</strong><div><button id="noBtn">No</button><button id="yesBtn">Yes</button></div></div>`;
    document.body.appendChild(pop);
    pop.querySelector('#noBtn').onclick = () => pop.remove();
    pop.querySelector('#yesBtn').onclick = () => { pop.remove(); yes(); };
  }

  function toast(text, undo) {
    document.querySelector('#undoToast')?.remove();
    const t = document.createElement('div');
    t.id = 'undoToast';
    t.className = 'undo-toast';
    t.innerHTML = `<span>${text}</span><button>Undo</button>`;
    document.body.appendChild(t);
    t.querySelector('button').onclick = () => { t.remove(); undo(); };
    setTimeout(() => t.remove(), 5000);
  }

  function removeShop() {
    const btn = document.querySelector('#removeBtn');
    const view = document.querySelector('.detail-actions a');
    if (!btn || btn.dataset.stableRemove) return;
    btn.dataset.stableRemove = '1';
    btn.textContent = 'Remove shop';
    if (view) view.insertAdjacentElement('afterend', btn);
    btn.onclick = e => {
      e.preventDefault(); e.stopPropagation();
      const b = shop(); if (!b) return;
      confirmBox('Remove this shop?', () => {
        const r = new Set(read(REMOVED, []));
        r.add(b.id); write(REMOVED, [...r]); sync(); lastRemoved = b.id;
        refreshApp();
        toast('Shop removed', () => {
          const now = new Set(read(REMOVED, []));
          now.delete(lastRemoved); write(REMOVED, [...now]); sync(); refreshApp();
        });
      });
    };
  }

  function mainPanel() {
    if (activeInput()) { menu(); priceText(); return; }
    menu(); price(); contact(); notes(); removeShop();
    document.querySelectorAll('#bestRouteBtn,#walkRouteBtn,#savePriceBtn').forEach(x => x.remove());
    const actions = document.querySelector('.primary-actions');
    const start = document.querySelector('#startProjectBtn');
    if (actions && start && !actions.querySelector('#startProjectBtn')) actions.appendChild(start);
    document.querySelector('.start-route')?.classList.add('route-pulse');
  }

  function pagePatches() {
    const title = document.querySelector('#cleanPage.open #cleanPageTitle');
    const content = document.querySelector('#cleanPageContent');
    if (title && /Money/i.test(title.textContent) && content && !document.querySelector('#resetMoneyBtn')) {
      const btn = document.createElement('button');
      btn.id = 'resetMoneyBtn';
      btn.className = 'reset-money-btn';
      btn.textContent = 'Reset money tracker';
      btn.onclick = () => confirmBox('Reset all completed money?', () => { write(COMPLETED, {}); sync(); location.reload(); });
      content.prepend(btn);
    }
    if (title && /Route/i.test(title.textContent)) {
      document.querySelectorAll('#cleanPageContent .clean-row small').forEach(s => {
        s.textContent = s.textContent.replace(/ · £\d+/g, '').replace(/£\d+ · /g, '');
      });
    }
  }

  function watch() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => setTimeout(mainPanel, 80));
    const d = document.querySelector('#detailPanel');
    const c = document.querySelector('#nextStopCard');
    if (d) observer.observe(d, { childList: true });
    if (c) observer.observe(c, { childList: true });
  }

  window.addEventListener('load', () => setTimeout(() => { mainPanel(); pagePatches(); watch(); }, 500));
  document.addEventListener('click', e => {
    if (e.target.closest('.menu-item,#projectHubBtn')) setTimeout(() => { menu(); pagePatches(); }, 160);
  }, true);
})();
