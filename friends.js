(() => {
  const FRIENDS_KEY = 'york-friends-v1';

  function readFriends() {
    try { return JSON.parse(localStorage.getItem(FRIENDS_KEY) || '[]'); }
    catch { return []; }
  }

  function writeFriends(list) {
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(list));
  }

  function renderFriendsBox() {
    const box = document.querySelector('#friendsBox');
    if (!box) return;
    const friends = readFriends();
    box.innerHTML = friends.length
      ? friends.map(f => `<div class="note-row"><strong>${f.code}</strong><p>Saved friend code</p></div>`).join('')
      : '<p class="empty-text">No friends added yet.</p>';
  }

  function patchSyncMenu() {
    const menuContent = document.querySelector('#menuContent');
    if (!menuContent || !/Partner sync/i.test(menuContent.textContent || '')) return;

    const joinTitle = [...menuContent.querySelectorAll('strong')].find(el => el.textContent.trim() === 'Join a friend');
    if (joinTitle) joinTitle.textContent = 'Join a team';

    if (document.querySelector('#friendsBox')) return;
    const joinSection = [...menuContent.querySelectorAll('.detail-row')].find(el => /Join a team|Join a friend/i.test(el.textContent || ''));
    if (!joinSection) return;

    joinSection.insertAdjacentHTML('afterend', `
      <div class="detail-row friend-panel">
        <strong>Add friends</strong>
        <p>Save a friend's code here so you do not lose it.</p>
        <div class="friend-add-row">
          <input id="friendCodeInput" class="money-input" placeholder="FRIEND CODE">
          <button id="addFriendBtn">Add</button>
        </div>
        <div id="friendsBox"></div>
      </div>`);

    document.querySelector('#addFriendBtn').onclick = () => {
      const input = document.querySelector('#friendCodeInput');
      const code = String(input.value || '').trim().toUpperCase();
      if (!code) return;
      const friends = readFriends().filter(f => f.code !== code);
      friends.push({ code, created: Date.now() });
      writeFriends(friends);
      input.value = '';
      renderFriendsBox();
    };
    renderFriendsBox();
  }

  document.addEventListener('click', () => setTimeout(patchSyncMenu, 80), true);
  const obs = new MutationObserver(() => setTimeout(patchSyncMenu, 80));
  obs.observe(document.body, { childList: true, subtree: true });
})();
