/* VAcleaner v4.3.15 — compact exact-time bottom sheet.
   Keeps canonical pickupTime/returnTime values and the 30-minute admin grid,
   but constrains the picker to a compact viewport sheet with centered selection. */
(() => {
  'use strict';

  const STEP_MINUTES = 30;
  const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const allTimes = [];
  let active = null;
  let overlay = null;
  let grid = null;
  let scroll = null;
  let title = null;
  let closeButton = null;

  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += STEP_MINUTES) {
      allTimes.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    }
  }

  function validTime(value) {
    return TIME_RE.test(String(value || ''));
  }

  function isGridTime(value) {
    return validTime(value) && Number(String(value).slice(3, 5)) % STEP_MINUTES === 0;
  }

  function contextTitle(input) {
    return input.name === 'returnTime' ? 'Час повернення' : 'Час видачі';
  }

  function hideLegacyTimeUI(input) {
    const wrapper = input.closest('.admin-exact-time-picker');
    const moment = input.closest('.rental-moment');
    wrapper?.querySelector('.admin-time-tariff-hint')?.setAttribute('aria-hidden', 'true');
    if (!moment) return;
    const label = input.name === 'returnTime' ? 'Вікно повернення' : 'Вікно видачі';
    [...moment.querySelectorAll('span,label,div,p')].forEach(node => {
      if (node === input || node.contains(input)) return;
      if (node.children.length === 0 && node.textContent.trim() === label) {
        node.classList.add('admin-v4315-hide-window-label');
      }
    });
  }

  function updateTrigger(input, trigger) {
    const value = validTime(input.value) ? input.value : '08:00';
    const valueNode = trigger.querySelector('.admin-v4315-time-value');
    if (valueNode) valueNode.textContent = value;
  }

  function makeOption(time, current, offGrid = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `admin-v4315-time-option${offGrid ? ' admin-v4315-current-off-grid' : ''}`;
    button.dataset.time = time;
    button.textContent = offGrid ? `Поточний час · ${time}` : time;
    const selected = time === current;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    button.addEventListener('click', event => {
      event.preventDefault();
      if (!active) return;
      active.input.value = time;
      active.input.dispatchEvent(new Event('input', {bubbles: true}));
      active.input.dispatchEvent(new Event('change', {bubbles: true}));
      updateTrigger(active.input, active.trigger);
      closeSheet(true);
    });
    return button;
  }

  function ensureSheet() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'admin-v4315-time-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="admin-v4315-time-backdrop" data-time-sheet-close="1"></div>
      <section class="admin-v4315-time-sheet" role="dialog" aria-modal="true" aria-labelledby="adminV4315TimeTitle">
        <header class="admin-v4315-time-sheet-head">
          <strong id="adminV4315TimeTitle"></strong>
          <button type="button" class="admin-v4315-time-close" aria-label="Закрити вибір часу">×</button>
        </header>
        <div class="admin-v4315-time-scroll">
          <div class="admin-v4315-time-grid" role="listbox"></div>
        </div>
      </section>`;
    document.body.appendChild(overlay);
    grid = overlay.querySelector('.admin-v4315-time-grid');
    scroll = overlay.querySelector('.admin-v4315-time-scroll');
    title = overlay.querySelector('#adminV4315TimeTitle');
    closeButton = overlay.querySelector('.admin-v4315-time-close');

    overlay.querySelector('[data-time-sheet-close="1"]').addEventListener('click', () => closeSheet(false));
    closeButton.addEventListener('click', () => closeSheet(false));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && active) closeSheet(false);
    });
  }

  function closeSheet(returnFocus) {
    if (!overlay || !active) return;
    const trigger = active.trigger;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('admin-v4315-time-sheet-open');
    document.body.classList.remove('admin-v4315-time-sheet-open');
    trigger.setAttribute('aria-expanded', 'false');
    active = null;
    if (returnFocus) requestAnimationFrame(() => trigger.focus({preventScroll: true}));
  }

  function centerSelected() {
    if (!grid || !scroll) return;
    const selected = grid.querySelector('.admin-v4315-time-option.is-selected');
    if (!selected) return;
    const selectedRect = selected.getBoundingClientRect();
    const scrollRect = scroll.getBoundingClientRect();
    const selectedCenter = selectedRect.top + (selectedRect.height / 2);
    const scrollCenter = scrollRect.top + (scrollRect.height / 2);
    const delta = selectedCenter - scrollCenter;
    const maxScroll = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
    const target = Math.min(maxScroll, scroll.scrollTop + delta);
    scroll.scrollTop = Math.max(0, target);
  }

  function openSheet(input, trigger) {
    ensureSheet();
    const current = validTime(input.value) ? input.value : '08:00';
    if (!validTime(input.value)) input.value = current;

    active = {input, trigger};
    title.textContent = contextTitle(input);
    grid.replaceChildren();
    if (!isGridTime(current)) grid.appendChild(makeOption(current, current, true));
    allTimes.forEach(time => grid.appendChild(makeOption(time, current)));

    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('admin-v4315-time-sheet-open');
    document.body.classList.add('admin-v4315-time-sheet-open');
    trigger.setAttribute('aria-expanded', 'true');

    requestAnimationFrame(() => {
      closeButton?.focus({preventScroll: true});
      centerSelected();
      requestAnimationFrame(centerSelected);
    });
  }

  function upgrade(input) {
    if (!(input instanceof HTMLInputElement) || input.dataset.v4315Time === '1') return;
    if (!['pickupTime', 'returnTime'].includes(input.name)) return;
    const wrapper = input.closest('.admin-exact-time-picker');
    if (!wrapper) return;

    input.dataset.v4315Time = '1';
    input.classList.add('admin-v4315-native-time');
    input.dataset.originalType = input.type;
    try { input.type = 'hidden'; } catch (_) {}
    input.tabIndex = -1;
    input.setAttribute('aria-hidden', 'true');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'admin-v4315-time-trigger';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = '<span class="admin-v4315-time-value"></span>';
    trigger.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      openSheet(input, trigger);
    });

    input.addEventListener('input', () => updateTrigger(input, trigger));
    input.addEventListener('change', () => updateTrigger(input, trigger));
    input.form?.addEventListener('reset', () => setTimeout(() => updateTrigger(input, trigger), 0));

    wrapper.appendChild(trigger);
    hideLegacyTimeUI(input);
    updateTrigger(input, trigger);
  }

  function scan(root = document) {
    root.querySelectorAll?.('.admin-exact-time-picker input[name="pickupTime"], .admin-exact-time-picker input[name="returnTime"]').forEach(upgrade);
  }

  function boot() {
    scan();
    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches?.('.admin-exact-time-picker input[name="pickupTime"], .admin-exact-time-picker input[name="returnTime"]')) upgrade(node);
          scan(node);
        }
      }
    });
    observer.observe(document.body, {childList: true, subtree: true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once: true});
  else boot();
})();
