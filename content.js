(() => {
  'use strict';

  const BUTTON_ID = 'prompt-spur-button';
  const ACTIONS_ID = 'chatgpt-local-actions';
  const DEFAULT_MESSAGE = 'turn';
  let message = DEFAULT_MESSAGE;
  let syncTimer = 0;

  chrome.storage.local.get({ message: DEFAULT_MESSAGE }, (stored) => {
    if (typeof stored.message === 'string' && stored.message.trim()) message = stored.message;
    scheduleSync();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.message) return;
    message = typeof changes.message.newValue === 'string' && changes.message.newValue.trim()
      ? changes.message.newValue : DEFAULT_MESSAGE;
    const button = document.getElementById(BUTTON_ID);
    if (button) updateButton(button);
  });

  function isVisible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  }

  function editor() {
    const prompt = document.getElementById('prompt-textarea');
    return isVisible(prompt) ? prompt : [...document.querySelectorAll('[role="textbox"]')].find(isVisible);
  }

  function sendButton(form) {
    return form.querySelector('[data-testid="send-button"], [data-testid*="send" i], button[type="submit"]') ||
      [...form.querySelectorAll('button')].find(button => /send|отправить/i.test([
        button.getAttribute('aria-label'), button.getAttribute('title'), button.getAttribute('data-testid')
      ].filter(Boolean).join(' '))) || null;
  }

  function actionRow(form) {
    return form.querySelector('[data-composer-transition-slot="trailing"] > .ms-auto.flex.items-center') ||
      form.querySelector('[data-composer-transition-slot="trailing"]');
  }

  function actionContainer(form) {
    let actions = document.getElementById(ACTIONS_ID);
    if (actions?.closest('form') === form) return actions;

    const send = sendButton(form);
    const slot = send?.closest('.inline-flex') || send;
    actions = document.createElement('span');
    actions.id = ACTIONS_ID;
    actions.style.cssText = 'display:inline-flex;align-items:center;gap:6px;flex:none';
    if (slot) slot.before(actions);
    else {
      const row = actionRow(form);
      if (!row) return null;
      row.prepend(actions);
    }
    return actions;
  }

  function isEmpty(target) { return !target.innerText.trim(); }

  function insertText(target, text) {
    target.focus();
    document.execCommand('insertText', false, text);
    target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  }

  function sendMessage() {
    const target = editor();
    const form = target?.closest('form');
    if (!target || !form || !isEmpty(target)) return;
    insertText(target, message);
    requestAnimationFrame(() => setTimeout(() => {
      const send = sendButton(form);
      if (send && !send.disabled) send.click();
    }, 80));
  }

  function bootMarkup() {
    return '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><circle cx="24.2" cy="21.4" r="5.3" fill="#9e6170" opacity=".52"/><circle cx="19.7" cy="22.5" r="4.2" fill="#9e6170" opacity=".42"/><path d="M7.4 4.2h7.4l-1.4 10.3 8.4 4.3c2.9 1.5 4.8 3.7 4.1 5.5-.9 2.3-5.2 2.6-9.4 1l-12-4.4 3-7.3z" fill="#a7ff28" stroke="#160c22" stroke-width="1.7" stroke-linejoin="round"/><path d="m4.8 19.6-1.8 2.1 3.1 1.1" fill="none" stroke="#a7ff28" stroke-width="1.6" stroke-linecap="round"/><path d="M6.6 10.2h7.2M5.4 13.6h7.8" stroke="#65427d" stroke-width="1.4" stroke-linecap="round"/></svg>';
  }

  function updateButton(button) {
    const displayMessage = message === DEFAULT_MESSAGE ? 'TURN' : message;
    const label = displayMessage.length > 22 ? `${displayMessage.slice(0, 21)}…` : displayMessage;
    button.title = `Send: ${message}`;
    button.setAttribute('aria-label', `Send: ${message}`);
    button.querySelector('.prompt-spur-label').textContent = label;
  }

  function createButton() {
    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.innerHTML = `${bootMarkup()}<span class="prompt-spur-label"></span>`;
    button.style.cssText = [
      'height:36px', 'display:inline-flex', 'align-items:center', 'gap:6px',
      'border:1px solid #6a5080', 'border-radius:999px', 'padding:0 10px 0 7px',
      'background:#241431', 'color:#fff', 'font:600 13px/1 system-ui,sans-serif',
      'cursor:pointer'
    ].join(';');
    const svg = button.querySelector('svg');
    svg.style.cssText = 'width:23px;height:23px;display:block';
    updateButton(button);
    button.addEventListener('click', sendMessage);
    return button;
  }

  function sync() {
    syncTimer = 0;
    const target = editor();
    const form = target?.closest('form');
    if (!target || !form) return;
    const button = document.getElementById(BUTTON_ID) || createButton();
    const actions = actionContainer(form);
    if (!actions) return;
    button.style.order = '10';
    if (button.parentElement !== actions) actions.append(button);
    button.disabled = !isEmpty(target);
    button.style.opacity = button.disabled ? '.45' : '1';
    button.style.cursor = button.disabled ? 'not-allowed' : 'pointer';
  }

  function scheduleSync() { clearTimeout(syncTimer); syncTimer = setTimeout(sync, 250); }
  function composerChanged() {
    const target = editor(); const form = target?.closest('form'); const button = document.getElementById(BUTTON_ID);
    if (!target || !form || !button || button.closest('form') !== form) return true;
    return button.parentElement !== document.getElementById(ACTIONS_ID);
  }

  document.addEventListener('input', event => { if (event.target === editor()) scheduleSync(); }, true);
  new MutationObserver(() => { if (composerChanged()) scheduleSync(); }).observe(document.documentElement, { childList: true, subtree: true });
  scheduleSync();
})();
