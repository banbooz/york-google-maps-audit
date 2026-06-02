(() => {
  const PROJECT_KEY = 'york-projects-v1';

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function shopName() { return document.querySelector('#nextStopCard h1')?.textContent?.trim() || ''; }
  function shopByName(name) { return (window.businesses || businesses || []).find(b => b.name === name); }
  function sync() { if (window.YorkSync && YorkSync.push) YorkSync.push().catch(() => {}); }

  function createProject(name) {
    const b = shopByName(name);
    if (!b) return null;
    const all = read(PROJECT_KEY, {});
    const old = all[b.id] || {};
    all[b.id] = {
      id: b.id,
      name: b.name,
      area: b.area || old.area || '',
      category: b.category || old.category || '',
      website: old.website || '',
      status: old.status || 'Started',
      progress: old.progress || {},
      completed: old.completed || false,
      created: old.created || Date.now(),
      updated: Date.now()
    };
    write(PROJECT_KEY, all);
    sync();
    return all[b.id];
  }

  function patchStartButton() {
    const name = shopName();
    if (!name) return;
    const completeBtn = document.querySelector('#completeBtn');
    if (completeBtn && !document.querySelector('#startProjectBtn')) {
      completeBtn.id = 'startProjectBtn';
      completeBtn.textContent = 'Start project';
    }
    const startBtn = document.querySelector('#startProjectBtn');
    if (startBtn && !startBtn.dataset.stableStart) {
      startBtn.dataset.stableStart = '1';
      startBtn.onclick = e => {
        e.preventDefault();
        e.stopPropagation();
        createProject(shopName());
        startBtn.textContent = 'Project started';
        setTimeout(() => { startBtn.textContent = 'Start project'; }, 1000);
      };
    }
  }

  document.addEventListener('click', e => {
    if (['saveContactBtn', 'saveNoteBtn'].includes(e.target?.id)) {
      setTimeout(() => createProject(shopName()), 250);
    }
  }, true);

  const obs = new MutationObserver(() => {
    if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    setTimeout(patchStartButton, 50);
  });
  obs.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('load', () => setTimeout(patchStartButton, 300));
  window.StartProject = { create: createProject, patch: patchStartButton };
})();
