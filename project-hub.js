(() => {
  const PROJECT_KEY = 'york-projects-v1';
  const NOTES_KEY = 'york-notes-v4';
  const CONTACTS_KEY = 'york-contacts-v1';
  const COMPLETED_KEY = 'york-completed-v1';

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }

  function writeProjects(projects) {
    localStorage.setItem(PROJECT_KEY, JSON.stringify(projects));
    if (window.YorkSync && YorkSync.push) YorkSync.push().catch(() => {});
  }

  function projects() { return read(PROJECT_KEY, {}); }
  function notes() { return read(NOTES_KEY, {}); }
  function contacts() { return read(CONTACTS_KEY, {}); }
  function completed() { return read(COMPLETED_KEY, {}); }
  function currentName() { return document.querySelector('#nextStopCard h1')?.textContent?.trim() || ''; }
  function byName(name) { return (window.businesses || []).find(b => b.name === name); }
  function byId(id) { return (window.businesses || []).find(b => b.id === id); }

  function createProjectFromShop(name) {
    if (!name) return;
    const b = byName(name);
    const id = b?.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const all = projects();
    all[id] = {
      id,
      name,
      area: b?.area || '',
      category: b?.category || '',
      website: all[id]?.website || '',
      status: all[id]?.status || 'Active project',
      created: all[id]?.created || Date.now(),
      updated: Date.now()
    };
    writeProjects(all);
  }

  function autoCreateExistingProjects() {
    const all = projects();
    const ids = new Set([...Object.keys(notes()), ...Object.keys(contacts()), ...Object.keys(completed())]);
    ids.forEach(id => {
      const b = byId(id);
      if (!b) return;
      all[id] = {
        id,
        name: b.name,
        area: b.area || '',
        category: b.category || '',
        website: all[id]?.website || '',
        status: completed()[id] ? 'Completed' : (all[id]?.status || 'Active project'),
        created: all[id]?.created || Date.now(),
        updated: Date.now()
      };
    });
    localStorage.setItem(PROJECT_KEY, JSON.stringify(all));
  }

  function mapsLink(p) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((p.name || '') + ', York, UK');
  }

  function safeUrl(url) {
    if (!url) return '';
    return /^https?:\/\//i.test(url) ? url : 'https://' + url;
  }

  function projectCard(p) {
    const n = notes()[p.id] || '';
    const c = contacts()[p.id] || {};
    const done = completed()[p.id];
    return `
      <div class="project-card" data-id="${p.id}">
        <div class="project-top">
          <div>
            <strong>${p.name}</strong>
            <small>${p.area || 'York'} · ${p.category || 'Project'} · ${done ? 'Completed' : p.status}</small>
          </div>
          <span>${p.website ? 'Site saved' : 'No site'}</span>
        </div>
        <div class="project-actions">
          <button class="project-open" data-id="${p.id}">Open project</button>
          <button class="project-website" data-id="${p.id}">${p.website ? 'Change website' : 'Add website'}</button>
        </div>
        <div id="project-detail-${p.id}" class="project-detail"></div>
      </div>`;
  }

  function detailHtml(p) {
    const n = notes()[p.id] || 'No notes saved yet.';
    const c = contacts()[p.id] || {};
    const web = safeUrl(p.website);
    return `
      <div class="note-row">
        <strong>Contact</strong>
        <p>${c.owner || 'No owner saved'} ${c.phone ? '· ' + c.phone : ''}</p>
        <p>${c.email || ''} ${c.instagram ? '· ' + c.instagram : ''}</p>
        <p>${c.bestTime ? 'Best time: ' + c.bestTime : ''}</p>
      </div>
      <div class="note-row">
        <strong>Website</strong>
        <p>${web ? `<a href="${web}" target="_blank" rel="noreferrer">${web}</a>` : 'No website link saved yet.'}</p>
      </div>
      <div class="note-row">
        <strong>Notes</strong>
        <p>${String(n).replace(/\n/g, '<br>')}</p>
      </div>
      <div class="detail-actions">
        <a href="${mapsLink(p)}" target="_blank" rel="noreferrer">Google listing</a>
        <button class="project-website" data-id="${p.id}">Add website</button>
      </div>`;
  }

  function renderHub() {
    autoCreateExistingProjects();
    const menuContent = document.querySelector('#menuContent');
    if (!menuContent) return;
    document.querySelectorAll('.menu-item').forEach(btn => btn.classList.remove('active'));
    document.querySelector('#projectHubBtn')?.classList.add('active');
    const list = Object.values(projects()).sort((a, b) => (b.updated || 0) - (a.updated || 0));
    menuContent.innerHTML = `
      <h2>Project Hub</h2>
      <div class="help-card"><p>Projects are created when you save notes, contact details, or complete a shop. Use this to track real jobs after speaking to a business.</p></div>
      ${list.length ? list.map(projectCard).join('') : '<p class="empty-text">No projects yet. Save contact details or notes on a shop first.</p>'}`;

    menuContent.querySelectorAll('.project-open').forEach(btn => {
      btn.onclick = () => {
        const p = projects()[btn.dataset.id];
        const box = document.querySelector('#project-detail-' + btn.dataset.id);
        if (!p || !box) return;
        box.innerHTML = box.innerHTML ? '' : detailHtml(p);
      };
    });

    menuContent.querySelectorAll('.project-website').forEach(btn => {
      btn.onclick = () => {
        const all = projects();
        const p = all[btn.dataset.id];
        if (!p) return;
        const link = prompt('Paste the website link for ' + p.name, p.website || '');
        if (link === null) return;
        p.website = link.trim();
        p.updated = Date.now();
        all[p.id] = p;
        writeProjects(all);
        renderHub();
      };
    });
  }

  function addMenuButton() {
    const notesBtn = document.querySelector('[data-section="notes"]');
    const menu = notesBtn?.parentElement;
    if (!menu || document.querySelector('#projectHubBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'projectHubBtn';
    btn.className = 'menu-item';
    btn.textContent = 'Project hub';
    btn.onclick = renderHub;
    menu.insertBefore(btn, notesBtn);
  }

  document.addEventListener('click', e => {
    if (e.target && ['saveContactBtn', 'saveNoteBtn', 'completeBtn'].includes(e.target.id)) {
      setTimeout(() => createProjectFromShop(currentName()), 150);
    }
  }, true);

  window.ProjectHub = { render: renderHub, create: createProjectFromShop };
  window.addEventListener('load', () => setTimeout(addMenuButton, 400));
  const obs = new MutationObserver(addMenuButton);
  obs.observe(document.body, { childList: true, subtree: true });
})();
