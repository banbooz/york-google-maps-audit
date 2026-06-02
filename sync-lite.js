window.YorkSync = function () {
  var db = null, auth = null, user = null, team = null, watcher = null, busy = false, members = [];
  var keys = ['york-notes-v4', 'york-skipped-v2', 'york-removed-v1', 'york-prices-v1', 'york-completed-v1', 'york-route-mode-v1', 'york-contacts-v1', 'york-projects-v1', 'york-shop-status-v1'];

  function init() {
    try {
      if (!window.firebase || !window.firebaseConfig) return false;
      if (!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);
      auth = firebase.auth();
      db = firebase.firestore();
      auth.onAuthStateChanged(function (u) {
        user = u;
        if (u) {
          team = localStorage.getItem('york-team-code-v1');
          if (team) watch(team);
        }
      });
      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  }

  function profile() {
    return user ? { uid: user.uid, name: user.displayName || user.email || 'Team member', email: user.email || '' } : null;
  }

  function state() {
    var s = {};
    keys.forEach(function (k) { s[k] = localStorage.getItem(k) || ''; });
    return s;
  }

  function load(s) {
    if (!s) return;
    busy = true;
    keys.forEach(function (k) {
      if (s[k] !== undefined) localStorage.setItem(k, s[k]);
    });
    if (window.applyCloudUpdate) window.applyCloudUpdate();
    setTimeout(function () { busy = false; }, 250);
  }

  function signed() { return !!user; }
  function status() {
    if (!db) return 'Firebase not ready. Refresh once.';
    if (!user) return 'Not signed in.';
    return 'Signed in - Team code: ' + (team || 'none');
  }
  function memberList() { return members || []; }

  async function signIn() {
    if (!init()) throw new Error('Firebase not ready');
    var p = new firebase.auth.GoogleAuthProvider();
    var result = await auth.signInWithPopup(p);
    user = result.user || auth.currentUser || user;
  }

  async function createTeam() {
    if (!user) await signIn();
    team = Math.random().toString(36).slice(2, 8).toUpperCase();
    localStorage.setItem('york-team-code-v1', team);
    await db.collection('teams').doc(team).set({ owner: user.uid, members: [profile()], state: state(), updated: Date.now() });
    watch(team);
    return team;
  }

  async function joinTeam(c) {
    if (!user) await signIn();
    team = String(c || '').trim().toUpperCase();
    var ref = db.collection('teams').doc(team);
    var snap = await ref.get();
    if (!snap.exists) throw new Error('Team code not found');
    localStorage.setItem('york-team-code-v1', team);
    var d = snap.data() || {};
    var list = (d.members || []).filter(function (m) { return m && m.uid !== user.uid; });
    list.push(profile());
    await ref.set({ members: list, updated: Date.now() }, { merge: true });
    watch(team);
    return team;
  }

  async function push() {
    if (busy || !db || !user || !team) return;
    await db.collection('teams').doc(team).set({ state: state(), updated: Date.now() }, { merge: true });
  }

  function watch(c) {
    if (!db || !c) return;
    if (watcher) watcher();
    team = c;
    watcher = db.collection('teams').doc(c).onSnapshot(function (snap) {
      var d = snap.data();
      if (!d) return;
      members = d.members || [];
      if (window.updateTeamMembers) window.updateTeamMembers(members);
      if (!d.state) return;
      var before = JSON.stringify(state());
      var after = JSON.stringify(d.state);
      if (before !== after) load(d.state);
    });
  }

  init();
  return { init: init, signIn: signIn, createTeam: createTeam, joinTeam: joinTeam, push: push, status: status, signed: signed, members: memberList };
}();
