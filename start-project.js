(() => {
  const PROJECT_KEY = 'york-projects-v1';
  const PRICES_KEY = 'york-prices-v1';
  const NOTES_KEY = 'york-notes-v4';
  const CONTACTS_KEY = 'york-contacts-v1';

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function shopName() { return document.querySelector('#nextStopCard h1')?.textContent?.trim() || ''; }
  function shopByName(name) { return (window.businesses || businesses || []).find(b => b.name === name); }
  function priceFor(id) { return read(PRICES_KEY, {})[id] || ''; }

  function createProject(name) {
    const b = shopByName(name);
    if (!b) return;
    const all = read(PROJECT_KEY, {});
    all[b.id] = Object.assign({
      id: b.id,
      name: b.name,
      area: b.area || '',
      category: b.category || '',
      website: '',
      status: 'Started',
      progress: {},
      completed: false,
      created: Date.now()
    }, all[b.id] || {}, { updated: Date.now() });
    write(PROJECT_KEY, all);
    if (window.YorkSync && YorkSync.push) YorkSync.push().catch(() => {});
    return all[b.id];
  }

  function saveCurrentProjectData() {
    const name = shopName();
    const b = shopByName(name);
    if (!b) return;
    createProject(name);
  }

  function patchMainDetails() {
    const name = shopName();
    const b = shopByName(name);
    if (!b) return;

    const completeBtn = document.querySelector('#completeBtn');
    if (completeBtn) {
      completeBtn.id = 'startProjectBtn';
      completeBtn.textContent = 'Start project';
      completeBtn.onclick = () => {
        createProject(name);
        completeBtn.textContent = 'Project started';
        if (window.ProjectHub && ProjectHub.open) setTimeout(() => ProjectHub.open(), 250);
      };
    }

    const score = document.querySelector('.score-badge');
    if (score) score.textContent = priceFor(b.id) ? '£' + priceFor(b.id) : 'Set price';

    const priceInput = document.querySelector('#priceInput');
    if (priceInput && !priceInput.dataset.blankPatched) {
      priceInput.dataset.blankPatched = '1';
      priceInput.value = priceFor(b.id) || '';
      priceInput.placeholder = 'Enter price';
      const row = priceInput.closest('.detail-row');
      if (row) {
        const p = row.querySelector('p');
        if (p) p.innerHTML = 'Your price: £<input id="priceInput" class="money-input" type="number" min="0" placeholder="Enter price" value="' + (priceFor(b.id) || '') + '">';
        const newInput = document.querySelector('#priceInput');
        const saveBtn = document.querySelector('#savePriceBtn');
        if (saveBtn) saveBtn.onclick = () => {
          const prices = read(PRICES_KEY, {});
          if (newInput.value) prices[b.id] = Number(newInput.value);
          else delete prices[b.id];
          write(PRICES_KEY, prices);
          saveCurrentProjectData();
          saveBtn.textContent = 'Saved';
          patchMainDetails();
        };
      }
    }
  }

  document.addEventListener('click', e => {
    if (['saveContactBtn', 'saveNoteBtn', 'savePriceBtn'].includes(e.target?.id)) {
      setTimeout(saveCurrentProjectData, 250);
    }
  }, true);

  const obs = new MutationObserver(() => setTimeout(patchMainDetails, 60));
  obs.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('load', () => setTimeout(patchMainDetails, 400));
})();
