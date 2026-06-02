(() => {
  const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!isiOS) return;

  function insideAllowedArea(target) {
    return target.closest && target.closest('.bottom-sheet, .side-menu, .map-stage, button, a, input, textarea, audio');
  }

  document.addEventListener('touchmove', e => {
    if (e.touches.length !== 1) return;
    if (insideAllowedArea(e.target)) return;
    e.preventDefault();
  }, { passive: false });
})();
