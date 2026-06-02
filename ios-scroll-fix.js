(() => {
  const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!isiOS) return;

  let startY = 0;

  function isScrollable(el) {
    while (el && el !== document.body) {
      const style = getComputedStyle(el);
      const canScroll = /(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight;
      if (canScroll) return el;
      el = el.parentElement;
    }
    return null;
  }

  document.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) return;
    startY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (e.touches.length !== 1) return;
    const scroller = isScrollable(e.target);
    if (!scroller) {
      e.preventDefault();
      return;
    }
    const y = e.touches[0].clientY;
    const goingDown = y > startY;
    const goingUp = y < startY;
    const atTop = scroller.scrollTop <= 0;
    const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;

    if ((goingDown && atTop) || (goingUp && atBottom)) {
      e.preventDefault();
    }
  }, { passive: false });
})();
