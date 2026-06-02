(() => {
  const PROJECT_KEY = 'york-projects-v1';
  const NOTES_KEY = 'york-notes-v4';
  const CONTACTS_KEY = 'york-contacts-v1';
  const PRICES_KEY = 'york-prices-v1';

  function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function projects() { return read(PROJECT_KEY, {}); }
  function notes() { return read(NOTES_KEY, {}); }
  function contacts() { return read(CONTACTS_KEY, {}); }
  function prices() { return read(PRICES_KEY, {}); }
  function sync() { if (window.YorkSync && YorkSync.push) YorkSync.push().catch(() => {}); }
  function byName(name) { return (window.businesses || []).find(b => b.name === name); }
  function byId(id) { return (window.businesses || []).find(b => b.id === id); }
  function currentName() { return document.querySelector('#nextStopCard h1')?.textContent?.trim() || ''; }
  function mapsLink(p) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((p.name || '') + ', York, UK'); }
  function safeUrl(url) { if (!url) return ''; return /^https?:\/\//i.test(url) ? url : 'https://' + url; }

  function saveProjects(all) { write(PROJECT_KEY, all); sync(); }

  function createProjectFromShop(name) {
    if (!name) return;
    const b = byName(name);
    const id = b?.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const all = projects();
    const old = all[id] || {};
    all[id] = {
      id,
      name: b?.name || name,
      area: b?.area || old.area || '',
      category: b?.category || old.category || '',
      website: old.website || '',
      status: old.status || 'Started',
      progress: old.progress || {},
      completed: old.completed || false,
      created: old.created || Date.now(),
      updated: Date.now()
    };
    saveProjects(all);
    return all[id];
  }

  function hydrateProjects() {
    const all = projects();
    Object.keys(all).forEach(id => {
      const b = byId(id);
      if (!b) return;
      all[id] = { ...all[id], name: all[id].name || b.name, area: all[id].area || b.area, category: all[id].category || b.category, progress: all[id].progress || {} };
    });
    write(PROJECT_KEY, all);
  }

  function activeCount(list) { return list.filter(p => !p.completed).length; }
  function tick(p, key, label) { return `<label class="project-tick"><input type="checkbox" class="project-progress" data-id="${p.id}" data-key="${key}" ${p.progress?.[key] ? 'checked' : ''}><span>${label}</span></label>`; }

  function card(p) {
    const price = prices()[p.id];
    return `<div class="project-card" data-id="${p.id}"><div class="project-top"><div><strong>${p.name}</strong><small>${p.area || 'York'} · ${p.completed ? 'Completed' : p.status || 'Started'}${price ? ' · £' + price : ''}</small></div><span>${p.completed ? 'Done' : 'Active'}</span></div><div class="project-actions"><button class="project-open" data-id="${p.id}">Open</button><button class="project-complete" data-id="${p.id}">${p.completed ? 'Uncomplete' : 'Complete'}</button></div><div id="project-detail-${p.id}" class="project-detail"></div></div>`;
  }

  function detail(p) {
    const n = notes()[p.id] || 'No notes saved yet.';
    const c = contacts()[p.id] || {};
    const web = safeUrl(p.website);
    return `<button class="project-close-detail" data-id="${p.id}">Close project</button><div class="project-progress-box"><strong>Progress</strong>${tick(p,'photos','Photos made')}${tick(p,'website','Website made')}${tick(p,'maps','Google Maps updated')}${tick(p,'reviewqr','Review QR made')}${tick(p,'sent','Sent to client')}</div><div class="note-row"><strong>Contact</strong><p>${c.owner || 'No owner saved'} ${c.phone ? '· ' + c.phone : ''}</p><p>${c.email || ''} ${c.instagram ? '· ' + c.instagram : ''}</p><p>${c.bestTime ? 'Best time: ' + c.bestTime : ''}</p></div><div class="note-row"><strong>Website</strong><p>${web ? `<a href="${web}" target="_blank" rel="noreferrer">${web}</a>` : 'No website link saved yet.'}</p></div><div class="note-row"><strong>Notes</strong><p>${String(n).replace(/\n/g, '<br>')}</p></div><div class="detail-actions"><a href="${mapsLink(p)}" target="_blank" rel="noreferrer">Google listing</a><button class="project-website" data-id="${p.id}">Add website</button><button class="project-reset" data-id="${p.id}">Reset</button><button class="project-delete danger-btn" data-id="${p.id}">Delete</button></div>`;
  }

  function ensurePage() {
    let page = document.querySelector('#projectHubPage');
    if (page) return page;
    page = document.createElement('section');
    page.id = 'projectHubPage';
    page.className = 'project-page';
    page.innerHTML = '<div class="project-page-head"><button id="projectBackBtn">‹</button><div><strong>Projects</strong><span>Client work</span></div><em id="projectCounter">0</em></div><div id="projectPageContent" class="project-page-content"></div>';
    document.body.appendChild(page);
    document.querySelector('#projectBackBtn').onclick = () => page.classList.remove('open');
    return page;
  }

  function openHub() {
    hydrateProjects();
    const page = ensurePage();
    const content = page.querySelector('#projectPageContent');
    const list = Object.values(projects()).sort((a,b)=>(b.updated||0)-(a.updated||0));
    page.querySelector('#projectCounter').textContent = activeCount(list);
    content.innerHTML = `<div class="project-toolbar"><button id="uncompleteAllBtn">Uncomplete all</button></div>${list.length ? list.map(card).join('') : '<p class="empty-text">No projects yet. Tap Start project on a shop.</p>'}`;
    page.classList.add('open');
    document.querySelector('#sideMenu')?.classList.remove('open');
    document.querySelector('#menuBackdrop')?.classList.remove('open');
    wire(content);
  }

  function wire(root) {
    const all = () => projects();
    const save = saveProjects;
    root.querySelector('#uncompleteAllBtn')?.addEventListener('click', () => { const p = all(); Object.values(p).forEach(x => x.completed = false); save(p); openHub(); });
    root.querySelectorAll('.project-open').forEach(btn => btn.onclick = () => { const p = all()[btn.dataset.id]; const box = document.querySelector('#project-detail-' + btn.dataset.id); if (!p || !box) return; if (box.innerHTML) { box.innerHTML=''; btn.textContent='Open'; return; } box.innerHTML = detail(p); btn.textContent='Close project'; wire(box); });
    root.querySelectorAll('.project-close-detail').forEach(btn => btn.onclick = () => { const box = document.querySelector('#project-detail-' + btn.dataset.id); if (box) box.innerHTML=''; const openBtn = document.querySelector('.project-open[data-id="'+btn.dataset.id+'"]'); if(openBtn) openBtn.textContent='Open'; });
    root.querySelectorAll('.project-complete').forEach(btn => btn.onclick = () => { const p = all(); p[btn.dataset.id].completed = !p[btn.dataset.id].completed; p[btn.dataset.id].status = p[btn.dataset.id].completed ? 'Completed' : 'Started'; p[btn.dataset.id].updated = Date.now(); save(p); openHub(); });
    root.querySelectorAll('.project-progress').forEach(input => input.onchange = () => { const p = all(); p[input.dataset.id].progress = p[input.dataset.id].progress || {}; p[input.dataset.id].progress[input.dataset.key] = input.checked; p[input.dataset.id].updated = Date.now(); save(p); });
    root.querySelectorAll('.project-website').forEach(btn => btn.onclick = () => { const p = all(); const item = p[btn.dataset.id]; const link = prompt('Paste the website link for ' + item.name, item.website || ''); if (link === null) return; item.website = link.trim(); item.progress = item.progress || {}; if (item.website) item.progress.website = true; item.updated = Date.now(); save(p); openHub(); });
    root.querySelectorAll('.project-reset').forEach(btn => btn.onclick = () => { const p = all(); p[btn.dataset.id].completed = false; p[btn.dataset.id].status = 'Started'; p[btn.dataset.id].progress = {}; p[btn.dataset.id].updated = Date.now(); save(p); openHub(); });
    root.querySelectorAll('.project-delete').forEach(btn => btn.onclick = () => { if(!confirm('Delete this project?')) return; const p = all(); delete p[btn.dataset.id]; save(p); openHub(); });
  }

  function addMenuButton() {
    const notesBtn = document.querySelector('[data-section="notes"]');
    const menu = notesBtn?.parentElement;
    if (!menu || document.querySelector('#projectHubBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'projectHubBtn';
    btn.className = 'menu-item';
    btn.textContent = 'Projects';
    btn.onclick = openHub;
    menu.insertBefore(btn, notesBtn);
  }

  document.addEventListener('click', e => { if (['startProjectBtn','saveContactBtn','saveNoteBtn','savePriceBtn'].includes(e.target?.id)) setTimeout(() => createProjectFromShop(currentName()), 300); }, true);
  window.ProjectHub = { open: openHub, render: openHub, create: createProjectFromShop };
  window.addEventListener('load', () => setTimeout(addMenuButton, 400));
  new MutationObserver(addMenuButton).observe(document.body, { childList:true, subtree:true });
})();