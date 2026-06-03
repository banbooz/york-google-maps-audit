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
      return `<div class="voice-playback-item"><div><strong>Voice note ${notes.length - index}</strong><small>${date}</small></div><audio controls src="${url}"></audio><button class="deleteVoiceBtn" data-index="${index}" type="button" aria-label="Delete voice note">&times;</button></div>`;
    }).join('');
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
      const btn = document.querySelector('#voiceRecordBtn');
      if (btn) btn.textContent = 'Record voice note';
      await refreshPlayback();
    };
    recorder.start();
    document.querySelector('#voiceNoteBox')?.setAttribute('open', '');
    document.querySelector('#voiceRecordBtn').textContent = 'Stop and save';
    document.querySelector('#voiceStatus').textContent = 'Recording...';
  }

  function stopRecording() {
    if (recorder && recorder.state === 'recording') recorder.stop();
  }

  function ensureVoiceSection() {
    const detail = document.querySelector('#detailPanel');
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
      try {
        if (recorder && recorder.state === 'recording') stopRecording();
        else await startRecording();
      } catch (err) {
        document.querySelector('#voiceStatus').textContent = 'Microphone blocked or not available';
      }
    };
    refreshPlayback();
  }

  const observer = new MutationObserver(() => setTimeout(ensureVoiceSection, 80));
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('load', () => setTimeout(ensureVoiceSection, 300));
})();
