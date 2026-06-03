(() => {
  const nameFixes = {
    parlormade: { googleName: 'Parlormade Scone House' },
    'hebden-tea': { name: 'Hebden Tea Company', googleName: 'Hebden Tea Company' },
    'w-hamond': { name: 'W Hamond of York', googleName: 'W Hamond of York', phone: '01904 632059' },
    'yuzu-street-food': { name: 'YUZU Street Food York', googleName: 'YUZU Street Food York' },
    'the-blue-bell': { name: 'The Blue Bell, York', googleName: 'The Blue Bell, York' },
    'royal-oak-york': { name: 'The Royal Oak, York', googleName: 'The Royal Oak, York' },
    'botanist-york': { name: 'The Botanist York Bar & Restaurant', googleName: 'The Botanist York Bar & Restaurant' },
    'oscar-bar': { googleName: "Oscar's Wine Bar & Bistro" },
    'fortyfive-vinyl': { googleName: 'FortyFive Vinyl Cafe' }
  };

  function applyNameFixes() {
    (window.businesses || []).forEach(b => Object.assign(b, nameFixes[b.id] || {}));
  }

  function shopById(id) {
    return (window.businesses || []).find(b => b.id === id);
  }

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

  function fixCurrentListing() {
    try {
      const b = typeof stop === 'function' ? stop() : null;
      const link = document.querySelector('.detail-actions a[href*="google.com/maps/search"]');
      if (b && link) link.href = listingUrl(b);
    } catch {}
  }

  function fixGoogleLinks() {
    document.querySelectorAll('a[href*="google.com/maps/search"]').forEach(link => {
      const text = link.textContent || '';
      const b = (window.businesses || []).find(shop => text.includes(shop.name));
      if (b) link.href = listingUrl(b);
    });
    fixCurrentListing();
  }

  function fixProjectDetails() {
    document.querySelectorAll('.project-contact-input[data-field="phone"]').forEach(input => {
      const b = shopById(input.dataset.id);
      if (b?.phone && !input.value) input.value = b.phone;
    });
    document.querySelectorAll('.project-listing-btn').forEach(link => {
      const card = link.closest('.project-card');
      const b = shopById(card?.dataset.id);
      if (b) link.href = listingUrl(b);
    });
    fixGoogleLinks();
  }

  try {
    applyNameFixes();
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
        fixCurrentListing();
        fixProjectDetails();
        return result;
      };
    }
  } catch {}

  applyNameFixes();
  fillVisiblePhone();
  fixCurrentListing();
  fixProjectDetails();
  if (typeof render === 'function') setTimeout(() => render(false), 0);
  window.addEventListener('load', () => { applyNameFixes(); fillVisiblePhone(); fixCurrentListing(); fixProjectDetails(); });
  new MutationObserver(fixProjectDetails).observe(document.body, { childList: true, subtree: true });
})();
