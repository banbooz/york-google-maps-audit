(() => {
  function listingName(b) {
    return b?.googleName || b?.name || '';
  }

  function listingUrl(b) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(listingName(b));
  }

  function fillVisiblePhone() {
    try {
      const b = typeof stop === 'function' ? stop() : null;
      const input = document.querySelector('#phoneInput');
      if (b?.phone && input && !input.value) input.value = b.phone;
    } catch {}
  }

  try {
    listing = listingUrl;
    cleanQuery = listingName;
    dir = b => 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(listingName(b));
    map = b => 'https://maps.google.com/maps?f=q&source=s_q&hl=en&q=' + encodeURIComponent(listingName(b)) + '&z=18&output=embed';
    contactFor = b => ({ phone: b?.phone || '', ...(contacts?.[b.id] || {}) });
    if (typeof render === 'function') {
      const originalRender = render;
      render = function(...args) {
        const result = originalRender.apply(this, args);
        fillVisiblePhone();
        return result;
      };
    }
  } catch {}

  fillVisiblePhone();
  window.addEventListener('load', fillVisiblePhone);
})();
