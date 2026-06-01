const grid = document.querySelector('#grid');
const searchInput = document.querySelector('#searchInput');
const categoryFilter = document.querySelector('#categoryFilter');
const priorityFilter = document.querySelector('#priorityFilter');
const totalCount = document.querySelector('#totalCount');
const hotCount = document.querySelector('#hotCount');
const visibleCount = document.querySelector('#visibleCount');
const modal = document.querySelector('#modal');
const modalBody = document.querySelector('#modalBody');
const closeModal = document.querySelector('#closeModal');
const exportBtn = document.querySelector('#exportBtn');

const notesKey = 'york-maps-audit-notes-v2';
const notes = JSON.parse(localStorage.getItem(notesKey) || '{}');
const categories = [...new Set(businesses.map(b => b.category))].sort();

categories.forEach(category => {
  const option = document.createElement('option');
  option.value = category;
  option.textContent = category;
  categoryFilter.append(option);
});

totalCount.textContent = businesses.length;
hotCount.textContent = businesses.filter(b => b.priority === 'High').length;

function filteredBusinesses(){
  const query = searchInput.value.trim().toLowerCase();
  return businesses.filter(b => {
    const matchesSearch = !query || [b.name,b.category,b.area,b.insight].join(' ').toLowerCase().includes(query);
    const matchesCategory = categoryFilter.value === 'all' || b.category === categoryFilter.value;
    const matchesPriority = priorityFilter.value === 'all' || b.priority === priorityFilter.value;
    return matchesSearch && matchesCategory && matchesPriority;
  }).sort((a,b) => a.score - b.score);
}

function render(){
  const items = filteredBusinesses();
  grid.innerHTML = '';
  visibleCount.textContent = `${items.length} shown`;
  items.forEach(b => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="art ${b.art}"><div class="art-icon">${b.icon}</div></div>
      <div class="card-body">
        <div class="topline"><span class="tag">${b.category}</span><span class="tag priority ${b.priority}">${b.priority}</span></div>
        <h3>${b.name}</h3>
        <p class="area">${b.area}</p>
        <p class="insight">${b.insight}</p>
        <div class="score-row"><div class="meter"><span style="width:${b.score * 10}%"></span></div><strong>${b.score}/10</strong></div>
        <div class="actions">
          <button data-id="${b.id}">Open audit</button>
          <a class="view-btn" href="${b.maps}" target="_blank" rel="noreferrer">View on Google Maps</a>
        </div>
      </div>`;
    card.querySelector('button').addEventListener('click', () => openAudit(b.id));
    grid.append(card);
  });
}

function openAudit(id){
  const b = businesses.find(item => item.id === id);
  modalBody.innerHTML = `
    <div class="modal-hero art ${b.art}"><div class="art-icon">${b.icon}</div></div>
    <h2>${b.name}</h2>
    <div class="modal-meta"><span>${b.category}</span><span>${b.area}</span><span>${b.priority} priority</span><span>${b.score}/10 current score</span></div>
    <p>${b.insight}</p>
    <div class="map-callout">
      <strong>Assess their current Google photos</strong>
      <p>Open the listing, look at the first 5 photos, check if they are dark, blurry, outdated, badly cropped, or mostly uploaded by customers.</p>
      <a href="${b.maps}" target="_blank" rel="noreferrer">View on Google Maps</a>
    </div>
    <h3>What to check on Google Maps</h3>
    <ul class="weaknesses">${b.weaknesses.map(w => `<li>${w}</li>`).join('')}</ul>
    <div class="pitch"><strong>Possible pitch</strong><p>${b.pitch}</p></div>
    <label><strong>Your notes</strong><textarea class="notes" id="noteBox" placeholder="Example: main photo is dark, no reply to recent bad review, missing product photos...">${notes[b.id] || ''}</textarea></label>
    <div class="modal-actions">
      <a class="view-btn" href="${b.maps}" target="_blank" rel="noreferrer">View on Google Maps</a>
      <button id="saveNote">Save note</button>
      <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(b.name + ' York') }" target="_blank" rel="noreferrer">Route</a>
    </div>`;
  modal.showModal();
  document.querySelector('#saveNote').addEventListener('click', () => {
    notes[b.id] = document.querySelector('#noteBox').value.trim();
    localStorage.setItem(notesKey, JSON.stringify(notes));
    document.querySelector('#saveNote').textContent = 'Saved';
  });
}

function exportNotes(){
  const rows = businesses.map(b => ({
    business: b.name,
    category: b.category,
    area: b.area,
    priority: b.priority,
    score: b.score,
    maps: b.maps,
    notes: notes[b.id] || ''
  }));
  const header = Object.keys(rows[0]).join(',');
  const body = rows.map(row => Object.values(row).map(value => `"${String(value).replaceAll('"','""')}"`).join(',')).join('\n');
  const blob = new Blob([header + '\n' + body], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'york-google-maps-audit-notes.csv';
  a.click();
  URL.revokeObjectURL(url);
}

searchInput.addEventListener('input', render);
categoryFilter.addEventListener('change', render);
priorityFilter.addEventListener('change', render);
closeModal.addEventListener('click', () => modal.close());
exportBtn.addEventListener('click', exportNotes);
render();
