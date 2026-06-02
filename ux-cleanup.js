(() => {
  const VERSION = '27';
  function setVersion(){
    const sub = document.querySelector('.menu-head span');
    if (sub) sub.textContent = 'York route · v: ' + VERSION;
  }
  setVersion();
  window.addEventListener('load', setVersion);
  const old = document.querySelector('script[data-stable-ui]');
  if (!old) {
    const s = document.createElement('script');
    s.src = 'stable-ui.js?v=' + VERSION;
    s.dataset.stableUi = '1';
    document.body.appendChild(s);
  }
})();