/* VAcleaner v4.3.13 — admin time UX.
   Keeps the canonical pickupTime/returnTime inputs for existing business logic,
   but converts the visible control to a VAcleaner-owned 30-minute picker so iOS
   cannot open its native minute-by-minute wheel. */
(() => {
  'use strict';

  const STEP_MINUTES = 30;
  const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
  let openPanel = null;

  const allTimes = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += STEP_MINUTES) {
      allTimes.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    }
  }

  function isGridTime(value) {
    if (!TIME_RE.test(String(value || ''))) return false;
    return Number(String(value).slice(3, 5)) % STEP_MINUTES === 0;
  }

  function closePicker(panel = openPanel) {
    if (!panel) return;
    panel.classList.remove('is-open');
    const wrapper = panel.closest('.admin-exact-time-picker');
    const trigger = wrapper?.querySelector('.admin-v4313-time-trigger');
    trigger?.setAttribute('aria-expanded', 'false');
    if (openPanel === panel) openPanel = null;
  }

  function hideLegacyWindowLabel(input) {
    const moment = input.closest('.rental-moment');
    if (!moment) return;
    const name = input.name === 'returnTime' ? 'Вікно повернення' : input.name === 'pickupTime' ? 'Вікно видачі' : '';
    if (!name) return;
    [...moment.querySelectorAll('span,label,div,p')].forEach(node => {
      if (node === input || node.contains(input)) return;
      if (node.children.length === 0 && node.textContent.trim() === name) {
        node.classList.add('admin-v4313-hide-window-label');
      }
    });
  }

  function updateSelection(wrapper, input) {
    const value = TIME_RE.test(input.value) ? input.value : '08:00';
    const triggerValue = wrapper.querySelector('.admin-v4313-time-value');
    if (triggerValue) triggerValue.textContent = value;
    wrapper.querySelectorAll('.admin-v4313-time-option').forEach(button => {
      const selected = button.dataset.time === value;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
  }

  function openPickerPanel(wrapper, input, panel, trigger) {
    if (openPanel && openPanel !== panel) closePicker(openPanel);
    const opening = !panel.classList.contains('is-open');
    if (!opening) {
      closePicker(panel);
      return;
    }
    panel.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    openPanel = panel;
    updateSelection(wrapper, input);
    requestAnimationFrame(() => {
      panel.querySelector('.admin-v4313-time-option.is-selected')?.scrollIntoView({block: 'center', behavior: 'auto'});
    });
  }

  function makeTimeButton(time, input, wrapper, panel, trigger, extraClass = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `admin-v4313-time-option${extraClass ? ` ${extraClass}` : ''}`;
    button.dataset.time = time;
    button.textContent = time;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      input.value = time;
      input.dispatchEvent(new Event('input', {bubbles: true}));
      input.dispatchEvent(new Event('change', {bubbles: true}));
      updateSelection(wrapper, input);
      closePicker(panel);
      trigger.focus({preventScroll: true});
    });
    return button;
  }

  function upgrade(input) {
    if (!(input instanceof HTMLInputElement) || input.dataset.v4313Time === '1') return;
    if (!['pickupTime', 'returnTime'].includes(input.name) && !input.closest('.admin-exact-time-picker')) return;
    const wrapper = input.closest('.admin-exact-time-picker');
    if (!wrapper) return;

    input.dataset.v4313Time = '1';
    input.classList.add('admin-v4313-native-time');
    input.dataset.originalType = input.type;
    try { input.type = 'hidden'; } catch (_) {}
    input.tabIndex = -1;
    input.setAttribute('aria-hidden', 'true');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'admin-v4313-time-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = '<span class="admin-v4313-time-value"></span>';

    const panel = document.createElement('div');
    panel.className = 'admin-v4313-time-panel';
    panel.setAttribute('role', 'listbox');
    panel.innerHTML = '<div class="admin-v4313-time-panel-head"><strong>Оберіть час</strong><small>крок 30 хв</small></div><div class="admin-v4313-time-grid"></div>';
    const grid = panel.querySelector('.admin-v4313-time-grid');

    const current = TIME_RE.test(input.value) ? input.value : '08:00';
    if (!TIME_RE.test(input.value)) input.value = current;
    if (!isGridTime(current)) {
      grid.appendChild(makeTimeButton(current, input, wrapper, panel, trigger, 'admin-v4313-current-off-grid'));
    }
    allTimes.forEach(time => grid.appendChild(makeTimeButton(time, input, wrapper, panel, trigger)));

    trigger.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      openPickerPanel(wrapper, input, panel, trigger);
    });

    input.addEventListener('input', () => updateSelection(wrapper, input));
    input.addEventListener('change', () => updateSelection(wrapper, input));
    input.form?.addEventListener('reset', () => setTimeout(() => updateSelection(wrapper, input), 0), {once: true});

    const hint = wrapper.querySelector('.admin-time-tariff-hint');
    wrapper.insertBefore(trigger, hint || null);
    wrapper.insertBefore(panel, hint || null);
    hideLegacyWindowLabel(input);
    updateSelection(wrapper, input);
  }

  function scan(root = document) {
    root.querySelectorAll?.('.admin-exact-time-picker input[type="time"], .admin-exact-time-picker input[name="pickupTime"], .admin-exact-time-picker input[name="returnTime"]').forEach(upgrade);
  }

  function boot() {
    scan();
    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches?.('.admin-exact-time-picker input[type="time"], .admin-exact-time-picker input[name="pickupTime"], .admin-exact-time-picker input[name="returnTime"]')) upgrade(node);
          scan(node);
        }
      }
    });
    observer.observe(document.body, {childList: true, subtree: true});

    document.addEventListener('click', event => {
      if (!openPanel) return;
      const wrapper = openPanel.closest('.admin-exact-time-picker');
      if (wrapper?.contains(event.target)) return;
      closePicker(openPanel);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && openPanel) closePicker(openPanel);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once: true});
  else boot();
})();
