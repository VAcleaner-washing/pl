/* Loaded before every application script in the generated R4 artifact. */
(() => {
  'use strict';
  const config = window.VA_STAGE_CONFIG;
  const expected = 'jdthhqxzfpvosfdxwfem';
  if (!config || config.projectRef !== expected ||
      config.origin !== `https://${config.projectRef}.supabase.co` || !config.publicKey.startsWith('sb_publishable_')) {
    throw new Error('STAGING_TARGET_MISMATCH');
  }
  document.documentElement.dataset.adminLab = 'staging';
  const prefix = `va_stage_${config.projectRef}:`;
  const scoped = native => Object.freeze({
    getItem: key => native.getItem(prefix + key),
    setItem: (key, value) => native.setItem(prefix + key, value),
    removeItem: key => native.removeItem(prefix + key),
    key: index => keys(native)[index]?.slice(prefix.length) ?? null,
    clear: () => keys(native).forEach(key => native.removeItem(key)),
    get length() { return keys(native).length; },
  });
  function keys(native) {
    return Array.from({length: native.length}, (_, i) => native.key(i)).filter(key => key?.startsWith(prefix));
  }
  window.VA_STAGE_STORAGE = Object.freeze({local: scoped(window.localStorage), session: scoped(window.sessionStorage)});
  const nativeFetch = window.fetch.bind(window);
  const functions = new Set(config.functions);
  const failure = () => new Response(JSON.stringify({error: 'R4: ця інтеграція вимкнена; нічого не надіслано', delivered: false}),
    {status: 503, headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store'}});
  const readiness = nativeFetch(`${config.origin}/auth/v1/settings`, {
    headers: {apikey: config.publicKey}, cache: 'no-store', redirect: 'error',
  }).then(async response => {
    if (!response.ok || (await response.json()).disable_signup !== true) throw new Error('signup_policy_not_verified');
    return true;
  });
  // Retain the rejected readiness promise for guarded requests without an unhandled rejection.
  readiness.catch(() => {});
  window.VA_STAGE = Object.freeze({projectRef: config.projectRef, readiness});
  window.fetch = async (input, options = {}) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url, location.href);
    const method = String(options.method || input?.method || 'GET').toUpperCase();
    if (url.origin === location.origin) {
      if (!url.pathname.startsWith('/r4/') || !['GET', 'HEAD'].includes(method)) return failure();
    } else if (url.origin === config.origin) {
      const endpoint = url.pathname.match(/^\/functions\/v1\/([^/]+)$/)?.[1];
      const token = url.pathname === '/auth/v1/token' && method === 'POST' &&
        ['password', 'refresh_token'].includes(url.searchParams.get('grant_type'));
      const logout = url.pathname === '/auth/v1/logout' && method === 'POST' && url.searchParams.get('scope') === 'local';
      const user = url.pathname === '/auth/v1/user' && method === 'GET';
      if (!(endpoint && functions.has(endpoint) && (method === 'POST' || endpoint === 'vacleaner-settings' && method === 'GET')) &&
          !token && !logout && !user) return failure();
      try { await readiness; }
      catch { throw new Error('R4: тестовий вхід закрито — налаштування реєстрації ще не підтверджені.'); }
    } else return failure();
    return nativeFetch(input, {...options, redirect: 'error'});
  };
  const message = 'R4: зовнішні повідомлення, дзвінки та сповіщення вимкнені. Нічого не надіслано.';
  const nativeOpen = window.open.bind(window);
  window.open = (value, ...args) => {
    const url = new URL(String(value || ''), location.href);
    if (url.origin === location.origin && url.pathname.startsWith('/r4/')) return nativeOpen(value, ...args);
    alert(message);
    return null;
  };
  document.addEventListener('click', event => {
    if (event.target.closest('#notificationToggle,#notificationTest,#pushDeviceSave,#sendInstagram,#sendTelegram,[data-referral-send],[data-client-instagram]')) {
      event.preventDefault(); event.stopImmediatePropagation(); alert(message); return;
    }
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('data-stage-stable') || link.hasAttribute('data-stage-demo')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith('/r4/')) {
      event.preventDefault(); event.stopImmediatePropagation(); alert(message);
    }
  }, true);
})();
