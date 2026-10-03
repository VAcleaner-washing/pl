(() => {
  'use strict';
  // DOM enhancements must run after React has adopted the exported HTML.
  // Keep script order and attributes, including the build carried in currentScript.
  let started = false;
  function start() {
    if (started) return;
    started = true;
    document.querySelectorAll('script[type="application/x-vacleaner-after-hydration"]').forEach(source => {
      const script = document.createElement('script');
      for (const {name, value} of source.attributes) {
        if (name !== 'type') script.setAttribute(name, value);
      }
      script.async = false;
      source.replaceWith(script);
    });
  }
  window.addEventListener('vacleaner:hydrated', start, {once: true});
  if (document.documentElement.dataset.vacleanerHydrated === '1') start();
})();
