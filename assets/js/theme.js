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
})();
