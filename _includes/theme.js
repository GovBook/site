(function () {
  const storageKey = 'govbook-theme';

  function q(sel) { return document.querySelector(sel); }

  function applyTheme(theme) {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    if (theme === 'light') root.classList.add('light');
    if (theme === 'dark')  root.classList.add('dark');

    const btn = q('#theme-toggle');
    if (!btn) return;
    const icon  = btn.querySelector('.theme-icon');
    const label = btn.querySelector('.theme-label');

    // Update ARIA + UI labels/icons
    if (theme === 'light') {
      btn.setAttribute('aria-pressed', 'true');
      if (icon)  icon.textContent  = '☀️';
      if (label) label.textContent = 'Light';
    } else if (theme === 'dark') {
      btn.setAttribute('aria-pressed', 'true');
      if (icon)  icon.textContent  = '🌙';
      if (label) label.textContent = 'Dark';
    } else {
      btn.setAttribute('aria-pressed', 'false');
      if (icon)  icon.textContent  = '🖥';
      if (label) label.textContent = 'System';
    }
  }

  // Initial apply from storage (or system default if none)
  const remembered = localStorage.getItem(storageKey);
  applyTheme(remembered);

  // Bind click AFTER DOM is ready
  function bind() {
    const btn = q('#theme-toggle');
    if (!btn) {
      console.log('[govbook] theme toggle not found on this page');
      return;
    }
    btn.addEventListener('click', () => {
      const current = localStorage.getItem(storageKey);
      const next = current === 'dark' ? 'light'
                 : current === 'light' ? null
                 : 'dark';
      if (next) localStorage.setItem(storageKey, next);
      else localStorage.removeItem(storageKey);
      applyTheme(next);
      console.log('[govbook] theme set to:', next || 'system');
    });
    console.log('[govbook] theme toggle bound');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
  // Profile header compacting and active quicklinks
  function initProfileHeader() {
    const profileHeader = document.querySelector('.profile-header');
    const siteHeader = document.querySelector('.site-header');
    const profileTabs = document.querySelectorAll('.profile-tabs a');
    const miniTabs = document.querySelectorAll('.profile-mini a');
    if (!profileHeader || !siteHeader) return;

    const sections = Array.from(document.querySelectorAll('main .section[id]'));

    function updateCompact() {
      const headerRect = profileHeader.getBoundingClientRect();
      const threshold = headerRect.bottom - siteHeader.offsetHeight - 8;
      if (window.scrollY > threshold) document.body.classList.add('profile-compact');
      else document.body.classList.remove('profile-compact');
      // after toggling compact, recompute the sticky offset
      updateStickyOffset();
    }

    updateCompact();
    window.addEventListener('scroll', updateCompact, { passive: true });

    // Reposition the sticky aside card to align with header and tabs
    function updateStickyOffset() {
      const headerH = siteHeader ? siteHeader.offsetHeight : 64;
      let tabsH = 0;
      const tabsEl = document.querySelector('.profile-tabs');
      const miniEl = document.querySelector('.profile-mini');
      if (tabsEl && window.getComputedStyle(tabsEl).display !== 'none') tabsH = tabsEl.offsetHeight;
      // if compact, use mini header height instead of tabs
      const miniH = (miniEl && window.getComputedStyle(miniEl).display !== 'none') ? miniEl.offsetHeight : 0;
      const isCompact = document.body.classList.contains('profile-compact');
      const offset = headerH + (isCompact ? miniH : tabsH) + 12; // small buffer
      document.documentElement.style.setProperty('--profile-sticky-offset', `${offset}px`);
    }
    // initial compute and on resize
    updateStickyOffset();
    window.addEventListener('resize', updateStickyOffset);

    // IntersectionObserver as a fallback to highlight active TOC link,
    // but prefer a deterministic 'closest-to-header' approach in updateActiveLink
    if (sections.length > 0 && (profileTabs.length || miniTabs.length)) {
      const observer = new IntersectionObserver((entries) => {
        // find entry with highest intersection ratio and mark it active
        let max = null;
        entries.forEach(e => { if (max === null || e.intersectionRatio > max.intersectionRatio) max = e; });
        if (!max || !max.target.id) return;
        const id = max.target.id;
        const links = Array.from(document.querySelectorAll('.profile-tabs a, .profile-mini a'));
        const active = links.find(l => l.getAttribute('href') === `#${id}`);
        if (!active) return;
        links.forEach(l => l.classList.toggle('active', l === active));
      }, { rootMargin: `-${siteHeader.offsetHeight + 32}px 0px -60% 0px`, threshold: [0,0.25,0.5,0.75] });
      sections.forEach(s => observer.observe(s));
    }

    // Also compute active link on scroll / load using the top distances relative to header.
    function updateActiveLink() {
      const links = Array.from(document.querySelectorAll('.profile-tabs a, .profile-mini a'));
      if (!links.length) return;
      const headerOffset = (siteHeader ? siteHeader.offsetHeight : 64) + 12;
      let activeLink = null;
      let minDelta = Number.POSITIVE_INFINITY;
      sections.forEach(s => {
        const rect = s.getBoundingClientRect();
        const delta = Math.abs(rect.top - headerOffset);
        if (delta < minDelta) {
          minDelta = delta;
          const id = s.id;
          activeLink = links.find(l => l.getAttribute('href') === `#${id}`);
        }
      });
  if (activeLink) links.forEach(l => { l.classList.toggle('active', l === activeLink); if (l === activeLink) l.setAttribute('aria-current','true'); else l.removeAttribute('aria-current'); });
    }
    // updateActiveLink on scroll and load + small throttle
    let sT;
    function onScrollThrottled() { clearTimeout(sT); sT = setTimeout(updateActiveLink, 50); }
    window.addEventListener('scroll', onScrollThrottled, { passive: true });
    window.addEventListener('resize', onScrollThrottled);
    // Run once at init
    updateActiveLink();

    // Make mini photo/name scroll back to top when clicked
    function scrollToTop(e) {
      // allow keyboard activation
      if (e && e.type === 'keydown' && !(e.key === 'Enter' || e.key === ' ')) return;
      e && e.preventDefault && e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    const miniPhoto = document.querySelector('.profile-mini .mini-photo');
    const miniName = document.querySelector('.profile-mini .mini-name');
    if (miniPhoto) {
      miniPhoto.addEventListener('click', scrollToTop);
      miniPhoto.addEventListener('keydown', scrollToTop);
    }
    if (miniName) {
      miniName.addEventListener('click', scrollToTop);
      miniName.addEventListener('keydown', scrollToTop);
    }

    // Smooth scroll + focus for tabs
    function onTabClick(e) {
      const target = e.currentTarget.getAttribute('href');
      if (!target || !target.startsWith('#')) return;
      const el = document.querySelector(target);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // set focus for keyboard users
      el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
      window.setTimeout(() => el.removeAttribute('tabindex'), 1000);
  // immediately update active state and set aria on click for clicked link in both navs
  const allLinks = Array.from(document.querySelectorAll('.profile-tabs a, .profile-mini a'));
  allLinks.forEach(l => { l.classList.toggle('active', l === e.currentTarget); if (l === e.currentTarget) l.setAttribute('aria-current','true'); else l.removeAttribute('aria-current'); });
    }
    profileTabs.forEach(a => a.addEventListener('click', onTabClick));
    miniTabs.forEach(a => a.addEventListener('click', onTabClick));

    // If there's a hash on page load, ensure the correct link is marked active
    if (window.location.hash) {
      const links = Array.from(document.querySelectorAll('.profile-tabs a, .profile-mini a'));
      links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === window.location.hash));
    }

    // Install image fallback logic for header, profile, and gallery images
    function addImageFallback(img) {
      if (!img) return;
      const fallback = img.dataset.fallback;
      if (!fallback) return;
      function handleError() {
        if (img.dataset.fallbackSet) return; // prevent loops
        img.dataset.fallbackSet = 'true';
        img.src = fallback;
      }
      img.addEventListener('error', handleError);
      // If already loaded but broken (e.g., from server-side cache), check and swap now
      if (img.complete && img.naturalWidth === 0) {
        // Try a HEAD request to confirm it's not an image and then fallback
        try {
          fetch(img.src, { method: 'HEAD' }).then(res => {
            const ct = res.headers.get('content-type') || '';
            if (!res.ok || !ct.startsWith('image')) handleError();
          }).catch(() => handleError());
        } catch (e) { handleError(); }
      }
    }
  addImageFallback(document.querySelector('.profile-banner'));
  addImageFallback(document.querySelector('.profile-photo'));
  addImageFallback(document.querySelector('.mini-photo'));
    document.querySelectorAll('.media-gallery img').forEach(addImageFallback);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProfileHeader);
  } else {
    initProfileHeader();
  }
})();
