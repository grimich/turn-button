// ==UserScript==
// @name         Prompt Spur
// @namespace    https://grimich.github.io/turn-button/
// @version      1.1.1
// @description  A boot-shaped configurable shortcut beside ChatGPT Send.
// @match        https://chatgpt.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @downloadURL  https://grimich.github.io/turn-button/prompt-spur.user.js
// @updateURL    https://grimich.github.io/turn-button/prompt-spur.user.js
// ==/UserScript==

(() => {
  'use strict';
  const BUTTON_ID = 'prompt-spur-userscript-button';
  let message = GM_getValue('message', 'turn');
  let syncTimer = 0;

  GM_registerMenuCommand('Prompt Spur: set button text', () => {
    const next = prompt('Text sent by Prompt Spur:', message);
    if (next?.trim()) { message = next.trim(); GM_setValue('message', message); updateButton(document.getElementById(BUTTON_ID)); }
  });

  function isVisible(el) { if (!el) return false; const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; }
  function editor() { const p = document.getElementById('prompt-textarea'); return isVisible(p) ? p : [...document.querySelectorAll('[role="textbox"]')].find(isVisible); }
  function sendButton(form) { return form.querySelector('[data-testid="send-button"], [data-testid*="send" i], button[type="submit"]') || [...form.querySelectorAll('button')].find(b => /send|отправить/i.test([b.getAttribute('aria-label'), b.getAttribute('title'), b.getAttribute('data-testid')].filter(Boolean).join(' '))) || null; }
  function isEmpty(el) { return !el.innerText.trim(); }
  function boot() { return '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="24.2" cy="21.4" r="5.3" fill="#9e6170" opacity=".52"/><circle cx="19.7" cy="22.5" r="4.2" fill="#9e6170" opacity=".42"/><path d="M7.4 4.2h7.4l-1.4 10.3 8.4 4.3c2.9 1.5 4.8 3.7 4.1 5.5-.9 2.3-5.2 2.6-9.4 1l-12-4.4 3-7.3z" fill="#a7ff28" stroke="#160c22" stroke-width="1.7" stroke-linejoin="round"/><path d="m4.8 19.6-1.8 2.1 3.1 1.1" fill="none" stroke="#a7ff28" stroke-width="1.6" stroke-linecap="round"/></svg>'; }
  function updateButton(b) { if (!b) return; const label = message.length > 22 ? `${message.slice(0, 21)}…` : message; b.title = `Send: ${message}`; b.setAttribute('aria-label', `Send: ${message}`); b.querySelector('span').textContent = label; }
  function createButton() { const b = document.createElement('button'); b.id = BUTTON_ID; b.type = 'button'; b.innerHTML = `${boot()}<span></span>`; b.style.cssText = 'height:36px;display:inline-flex;align-items:center;gap:6px;border:1px solid #6a5080;border-radius:999px;padding:0 10px 0 7px;background:#241431;color:#fff;font:600 13px/1 system-ui,sans-serif;cursor:pointer'; b.querySelector('svg').style.cssText = 'width:23px;height:23px;display:block'; updateButton(b); b.addEventListener('click', () => { const e = editor(), f = e?.closest('form'); if (!e || !f || !isEmpty(e)) return; e.focus(); document.execCommand('insertText', false, message); e.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: message })); requestAnimationFrame(() => setTimeout(() => { const s = sendButton(f); if (s && !s.disabled) s.click(); }, 80)); }); return b; }
  function sync() { syncTimer = 0; const e = editor(), f = e?.closest('form'); if (!e || !f) return; const b = document.getElementById(BUTTON_ID) || createButton(), s = sendButton(f), slot = s?.closest('.inline-flex') || s; if (slot && b.nextElementSibling !== slot) slot.before(b); b.disabled = !isEmpty(e); b.style.opacity = b.disabled ? '.45' : '1'; b.style.cursor = b.disabled ? 'not-allowed' : 'pointer'; }
  function schedule() { clearTimeout(syncTimer); syncTimer = setTimeout(sync, 250); }
  document.addEventListener('input', e => { if (e.target === editor()) schedule(); }, true);
  new MutationObserver(() => { const e = editor(), f = e?.closest('form'), b = document.getElementById(BUTTON_ID), s = f && sendButton(f), slot = s?.closest('.inline-flex') || s; if (!e || !f || !b || b.closest('form') !== f || (slot && b.nextElementSibling !== slot)) schedule(); }).observe(document.documentElement, { childList: true, subtree: true });
  schedule();
})();
