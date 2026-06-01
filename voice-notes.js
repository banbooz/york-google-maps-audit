(() => {
  const DB_NAME = 'york-voice-notes-v1';
  const STORE = 'voiceNotes';
  let dbPromise;
  let recorder = null;
  let chunks = [];
  let activeShop = '';

  function openDb(){
    if(dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function getNote(shop){
    const db = await openDb();
    return new Promise(resolve => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(shop);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  async function saveNote(shop, blob){
    const db = await openDb();
    return new Promise(resolve => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ blob, created: Date.now(), type: blob.type || 'audio/webm' }, shop);
      tx.oncomplete = resolve;
    });
  }

  async function deleteNote(shop){
    const db = await openDb();
    return new Promise(resolve => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(shop);
      tx.oncomplete = resolve;
    });
  }

  function currentShopName(){
    return document.querySelector('#nextStopCard h1')?.textContent?.trim() || '';
  }

  function sectionHtml(){
    return `
      <div class="detail-row voice-note-box" id="voiceNoteBox">
        <strong>Voice note</strong>
        <p class="voice-help">Record a quick note after leaving the shop. It saves automatically when you stop.</p>
        <div class="voice-actions">
          <button id="voiceRecordBtn" type="button">Record voice note</button>
          <span id="voiceStatus">No voice note yet</span>
        </div>
        <div id="voicePlayback" class="voice-playback"></div>
      </div>`;
  }

  async function refreshPlayback(){
    const shop = currentShopName();
    const playback = document.querySelector('#voicePlayback');
    const status = document.querySelector('#voiceStatus');
    if(!shop || !playback || !status) return;
    const note = await getNote(shop);
    playback.innerHTML = '';
    if(!note){
      status.textContent = 'No voice note yet';
      return;
    }
    status.textContent = 'Saved voice note';
    const url = URL.createObjectURL(note.blob);
    playback.innerHTML = `<audio controls src="${url}"></audio><button id="deleteVoiceBtn" type="button" aria-label="Delete voice note">×</button>`;
    document.querySelector('#deleteVoiceBtn').onclick = async () => {
      await deleteNote(shop);
      URL.revokeObjectURL(url);
      refreshPlayback();
    };
  }

  async function startRecording(){
    const shop = currentShopName();
    if(!shop) return;
    activeShop = shop;
    chunks = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = e => { if(e.data.size) chunks.push(e.data); };
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      stream.getTracks().forEach(track => track.stop());
      await saveNote(activeShop, blob);
      recorder = null;
      const btn = document.querySelector('#voiceRecordBtn');
      if(btn) btn.textContent = 'Record voice note';
      await refreshPlayback();
    };
    recorder.start();
    document.querySelector('#voiceRecordBtn').textContent = 'Stop and save';
    document.querySelector('#voiceStatus').textContent = 'Recording...';
  }

  function stopRecording(){
    if(recorder && recorder.state === 'recording') recorder.stop();
  }

  function ensureVoiceSection(){
    const detail = document.querySelector('#detailPanel');
    if(!detail || !document.querySelector('#noteBox')) return;
    const shop = currentShopName();
    if(!shop) return;
    const existing = document.querySelector('#voiceNoteBox');
    if(existing && existing.dataset.shop === shop) return;
    if(existing) existing.remove();
    document.querySelector('#noteBox').insertAdjacentHTML('beforebegin', sectionHtml());
    document.querySelector('#voiceNoteBox').dataset.shop = shop;
    document.querySelector('#voiceRecordBtn').onclick = async () => {
      try {
        if(recorder && recorder.state === 'recording') stopRecording();
        else await startRecording();
      } catch (e) {
        document.querySelector('#voiceStatus').textContent = 'Microphone blocked or not available';
      }
    };
    refreshPlayback();
  }

  const observer = new MutationObserver(() => setTimeout(ensureVoiceSection, 80));
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('load', () => setTimeout(ensureVoiceSection, 300));
})();
