(() => {
  const DB_NAME = 'york-voice-notes-v1';
  const STORE = 'voiceNotes';
  let dbPromise;
  let recorder = null;
  let chunks = [];
  let activeShop = '';

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function getNotes(shop) {
    const db = await openDb();
    return new Promise(resolve => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(shop);
      req.onsuccess = () => {
        const value = req.result;
        if (!value) return resolve([]);
        if (Array.isArray(value)) return resolve(value);
        if (value.blob) return resolve([value]);
        resolve([]);
      };
      req.onerror = () => resolve([]);
    });
  }

  async function saveNote(shop, blob) {
    const db = await openDb();
    const existing = await getNotes(shop);
    existing.unshift({ blob, created: Date.now(), type: blob.type || 'audio/webm' });
    return new Promise(resolve => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(existing, shop);
      tx.oncomplete = resolve;
    });
  }

  async function renameNote(shop, index, name) {
    const db = await openDb();
    const existing = await getNotes(shop);
    if (!existing[index]) return;
    existing[index].name = name;
    return new Promise(resolve => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(existing, shop);
      tx.oncomplete = resolve;
    });
  }

  async function deleteNote(shop, index) {
    const db = await openDb();
    const existing = await getNotes(shop);
    existing.splice(index, 1);
    return new Promise(resolve => {
      const tx = db.transaction(STORE, 'readwrite');
      if (existing.length) tx.objectStore(STORE).put(existing, shop);
      else tx.objectStore(STORE).delete(shop);
      tx.oncomplete = resolve;
    });
  }

  function currentShopName() {
    return document.querySelector('#nextStopCard h1')?.textContent?.trim() || '';
  }

  function esc(text) {
    return String(text || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function sectionHtml() {
    return `
      <details class="detail-row voice-note-box collapsible-row" id="voiceNoteBox">
        <summary><strong>Voice notes</strong><span id="voiceStatus">No voice notes yet</span></summary>
        <p class="voice-help">Record quick notes after leaving the shop. New recordings are saved underneath.</p>
        <div class="voice-actions">
          <button id="voiceRecordBtn" type="button">Record voice note</button>
        </div>
        <div id="voicePlayback" class="voice-playback-list"></div>
      </details>`;
  }

  async function refreshPlayback() {
    const shop = currentShopName();
    const playback = document.querySelector('#voicePlayback');
    const status = document.querySelector('#voiceStatus');
    if (!shop || !playback || !status) return;
    const notes = await getNotes(shop);
    playback.innerHTML = '';
    if (!notes.length) {
      status.textContent = 'No voice notes yet';
      return;
    }
    status.textContent = notes.length + ' saved';
    playback.innerHTML = notes.map((note, index) => {
      const url = URL.createObjectURL(note.blob);
      const date = new Date(note.created || Date.now()).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
      const title = note.name || `Voice note ${index + 1}`;
      return `<div class="voice-playback-item"><div><button class="voice-title" data-index="${index}" type="button">${esc(title)}</button><small>${esc(date)}</small></div><audio controls src="${url}"></audio><button class="deleteVoiceBtn" data-index="${index}" type="button" aria-label="Delete voice note">&times;</button></div>`;
    }).join('');
    playback.querySelectorAll('.voice-title').forEach(btn => {
      btn.onclick = async e => {
        e.stopPropagation();
        const notesNow = await getNotes(shop);
        const current = notesNow[Number(btn.dataset.index)]?.name || btn.textContent.trim();
        const name = prompt('Name this voice note', current);
        if (name === null) return;
        await renameNote(shop, Number(btn.dataset.index), name.trim() || current);
        refreshPlayback();
      };
    });
    playback.querySelectorAll('.deleteVoiceBtn').forEach(btn => {
      btn.onclick = async e => {
        e.stopPropagation();
        await deleteNote(shop, Number(btn.dataset.index));
        refreshPlayback();
      };
    });
  }

  async function startRecording() {
    const shop = currentShopName();
    if (!shop) return;
    activeShop = shop;
    chunks = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      stream.getTracks().forEach(track => track.stop());
      await saveNote(activeShop, blob);
      recorder = null;
      updateRecordButtons(false);
      await refreshPlayback();
    };
    recorder.start();
    document.querySelector('#voiceNoteBox')?.setAttribute('open', '');
    updateRecordButtons(true);
    const status = document.querySelector('#voiceStatus');
    if (status) status.textContent = 'Recording...';
  }

  function stopRecording() {
    if (recorder && recorder.state === 'recording') recorder.stop();
  }

  async function toggleRecording() {
    try {
      if (recorder && recorder.state === 'recording') stopRecording();
      else await startRecording();
    } catch (err) {
      const status = document.querySelector('#voiceStatus');
      if (status) status.textContent = 'Microphone blocked or not available';
      updateRecordButtons(false);
    }
  }

  function updateRecordButtons(recording) {
    document.querySelectorAll('#voiceRecordBtn,#topVoiceRecordBtn').forEach(btn => {
      if (!btn) return;
      btn.classList.toggle('is-recording', recording);
      if (btn.id === 'voiceRecordBtn') btn.textContent = recording ? 'Stop and save' : 'Record voice note';
      if (btn.id === 'topVoiceRecordBtn') btn.setAttribute('aria-label', recording ? 'Stop recording voice note' : 'Record voice note');
    });
  }

  function wireTopButton() {
    const priceBtn = document.querySelector('#setPriceBtn');
    if (priceBtn && !document.querySelector('#topVoiceRecordBtn')) {
      let stack = priceBtn.closest('.top-action-stack');
      if (!stack) {
        stack = document.createElement('div');
        stack.className = 'top-action-stack';
        priceBtn.parentNode.insertBefore(stack, priceBtn);
        stack.appendChild(priceBtn);
      }
      const mic = document.createElement('button');
      mic.className = 'quick-voice-btn';
      mic.id = 'topVoiceRecordBtn';
      mic.type = 'button';
      mic.setAttribute('aria-label', 'Record voice note');
      mic.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14c1.7 0 3-1.3 3-3V6c0-1.7-1.3-3-3-3S9 4.3 9 6v5c0 1.7 1.3 3 3 3zm5-3c0 2.8-2.2 5-5 5s-5-2.2-5-5H5c0 3.5 2.6 6.4 6 6.9V21h4v-3.1c3.4-.5 6-3.4 6-6.9h-2z"/></svg>';
      stack.appendChild(mic);
    }
    const btn = document.querySelector('#topVoiceRecordBtn');
    if (!btn || btn.dataset.voiceReady === '1') return;
    btn.dataset.voiceReady = '1';
    btn.onclick = e => {
      e.stopPropagation();
      ensureVoiceSection();
      document.querySelector('#voiceNoteBox')?.setAttribute('open', '');
      toggleRecording();
    };
    updateRecordButtons(recorder?.state === 'recording');
  }

  function ensureVoiceSection() {
    const detail = document.querySelector('#detailPanel');
    wireTopButton();
    if (!detail || !document.querySelector('#noteBox')) return;
    const shop = currentShopName();
    if (!shop) return;
    const existing = document.querySelector('#voiceNoteBox');
    if (existing && existing.dataset.shop === shop) return;
    if (existing) existing.remove();
    document.querySelector('#noteBox').insertAdjacentHTML('beforebegin', sectionHtml());
    document.querySelector('#voiceNoteBox').dataset.shop = shop;
    document.querySelector('#voiceRecordBtn').onclick = async e => {
      e.stopPropagation();
      toggleRecording();
    };
    updateRecordButtons(recorder?.state === 'recording');
    refreshPlayback();
  }

  const observer = new MutationObserver(() => setTimeout(ensureVoiceSection, 80));
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('load', () => setTimeout(ensureVoiceSection, 300));
})();
